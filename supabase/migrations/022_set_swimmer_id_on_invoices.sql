-- Fix invoices to have swimmer_id set for better querying

-- PART 1: Set swimmer_id on existing invoices that don't have it
-- Link to the first swimmer associated with this invoice
WITH invoice_first_swimmer AS (
  SELECT DISTINCT ON (ili.invoice_id)
    ili.invoice_id,
    s.id as swimmer_id
  FROM invoice_line_items ili
  JOIN swimmers s ON 
    ili.description ILIKE '%' || s.first_name || ' ' || s.last_name || '%'
    AND EXISTS (
      SELECT 1 FROM invoices i 
      WHERE i.id = ili.invoice_id 
      AND (i.parent_id = s.parent_id OR (i.parent_id IS NULL AND s.parent_id IS NULL))
    )
  WHERE ili.invoice_id IN (
    SELECT id FROM invoices WHERE swimmer_id IS NULL
  )
  ORDER BY ili.invoice_id, ili.created_at
)
UPDATE invoices
SET swimmer_id = invoice_first_swimmer.swimmer_id
FROM invoice_first_swimmer
WHERE invoices.id = invoice_first_swimmer.invoice_id;

-- Log result
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE 'Set swimmer_id on % existing invoices', updated_count;
  ELSE
    RAISE NOTICE 'No invoices needed swimmer_id update';
  END IF;
END $$;

-- PART 2: Update linking function to also set swimmer_id
CREATE OR REPLACE FUNCTION link_orphaned_registrations_by_email(
  user_id UUID,
  user_email TEXT
)
RETURNS TABLE(
  linked_invoices INTEGER,
  linked_swimmers INTEGER,
  linked_consents INTEGER
) AS $$
DECLARE
  v_linked_invoices INTEGER := 0;
  v_linked_swimmers INTEGER := 0;
  v_linked_consents INTEGER := 0;
  v_invoice_ids UUID[];
  v_swimmer_ids UUID[];
  v_deleted_duplicates INTEGER := 0;
BEGIN
  -- Find and link invoices
  SELECT ARRAY_AGG(DISTINCT i.id) INTO v_invoice_ids
  FROM invoices i
  LEFT JOIN payments p ON p.invoice_id = i.id
  WHERE i.parent_id IS NULL
    AND (
      p.callback_data->>'parentEmail' = user_email
      OR p.callback_data->'parentData'->>'email' = user_email
    );

  -- Update invoices with parent_id
  IF v_invoice_ids IS NOT NULL THEN
    UPDATE invoices
    SET parent_id = user_id
    WHERE id = ANY(v_invoice_ids);
    
    GET DIAGNOSTICS v_linked_invoices = ROW_COUNT;
  END IF;

  -- Find swimmers to link
  WITH swimmer_ids_from_payments AS (
    SELECT DISTINCT jsonb_array_elements_text(p.callback_data->'swimmers')::UUID as swimmer_id
    FROM payments p
    WHERE p.invoice_id = ANY(v_invoice_ids)
      AND p.callback_data ? 'swimmers'
  )
  SELECT ARRAY_AGG(DISTINCT s.id) INTO v_swimmer_ids
  FROM swimmers s
  WHERE s.id IN (SELECT swimmer_id FROM swimmer_ids_from_payments)
     OR s.parent_id IS NULL;

  -- Update swimmers with parent_id
  IF v_swimmer_ids IS NOT NULL THEN
    UPDATE swimmers
    SET parent_id = user_id
    WHERE id = ANY(v_swimmer_ids)
      AND parent_id IS NULL;
    
    GET DIAGNOSTICS v_linked_swimmers = ROW_COUNT;
  END IF;

  -- **NEW: Set swimmer_id on linked invoices**
  IF v_invoice_ids IS NOT NULL AND v_swimmer_ids IS NOT NULL THEN
    UPDATE invoices i
    SET swimmer_id = (
      SELECT s.id 
      FROM swimmers s
      WHERE s.parent_id = user_id
      ORDER BY s.created_at
      LIMIT 1
    )
    WHERE i.id = ANY(v_invoice_ids)
      AND i.swimmer_id IS NULL;
  END IF;

  -- Delete orphaned duplicates after linking
  WITH duplicates_to_delete AS (
    SELECT s1.id
    FROM swimmers s1
    JOIN swimmers s2 ON 
      s1.first_name = s2.first_name 
      AND s1.last_name = s2.last_name
      AND s1.date_of_birth = s2.date_of_birth
    WHERE s1.parent_id IS NULL  
      AND s2.parent_id = user_id  
      AND s1.id != s2.id
  )
  DELETE FROM swimmers
  WHERE id IN (SELECT id FROM duplicates_to_delete);
  
  GET DIAGNOSTICS v_deleted_duplicates = ROW_COUNT;
  
  IF v_deleted_duplicates > 0 THEN
    RAISE NOTICE 'Deleted % orphaned duplicate swimmers for user %', v_deleted_duplicates, user_email;
  END IF;

  -- Link consents
  WITH consent_ids_to_link AS (
    SELECT id FROM registration_consents
    WHERE parent_id IS NULL
      AND swimmer_id = ANY(v_swimmer_ids)
  )
  UPDATE registration_consents
  SET parent_id = user_id
  WHERE id IN (SELECT id FROM consent_ids_to_link);
  
  GET DIAGNOSTICS v_linked_consents = ROW_COUNT;

  RETURN QUERY SELECT v_linked_invoices, v_linked_swimmers, v_linked_consents;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION link_orphaned_registrations_by_email(UUID, TEXT) IS 
  'Links orphaned data by email, sets swimmer_id on invoices, and deletes orphaned duplicates';

-- PART 3: Verify the fix
SELECT 
  'Invoice Status After Fix' as check_type,
  COUNT(*) as total,
  COUNT(swimmer_id) as with_swimmer_id,
  COUNT(*) - COUNT(swimmer_id) as without_swimmer_id
FROM invoices;

-- Show any invoices still missing swimmer_id
SELECT 
  'Invoices Without swimmer_id' as check_type,
  id,
  parent_id,
  status,
  total_amount,
  created_at
FROM invoices
WHERE swimmer_id IS NULL
ORDER BY created_at DESC
LIMIT 10;
