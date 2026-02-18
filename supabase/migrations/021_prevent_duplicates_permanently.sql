-- Permanent fix to prevent duplicate swimmers

-- PART 1: Update the linking function to auto-delete orphaned duplicates
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
  -- Find and link invoices where parent_id is NULL and email matches in payments callback_data
  SELECT ARRAY_AGG(DISTINCT i.id) INTO v_invoice_ids
  FROM invoices i
  LEFT JOIN payments p ON p.invoice_id = i.id
  WHERE i.parent_id IS NULL
    AND (
      p.callback_data->>'parentEmail' = user_email
      OR p.callback_data->'parentData'->>'email' = user_email
    );

  -- Update invoices
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

  -- Update swimmers
  IF v_swimmer_ids IS NOT NULL THEN
    UPDATE swimmers
    SET parent_id = user_id
    WHERE id = ANY(v_swimmer_ids)
      AND parent_id IS NULL;
    
    GET DIAGNOSTICS v_linked_swimmers = ROW_COUNT;
  END IF;

  -- **NEW: Delete orphaned duplicates after linking**
  -- If a swimmer now has parent_id set, delete any remaining orphaned duplicates
  WITH duplicates_to_delete AS (
    SELECT s1.id
    FROM swimmers s1
    JOIN swimmers s2 ON 
      s1.first_name = s2.first_name 
      AND s1.last_name = s2.last_name
      AND s1.date_of_birth = s2.date_of_birth
    WHERE s1.parent_id IS NULL  -- s1 is still orphaned
      AND s2.parent_id = user_id  -- s2 is linked to this user
      AND s1.id != s2.id  -- Don't delete the same record
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
  'Links orphaned registration data to user account by email AND deletes orphaned duplicates after linking';

-- PART 2: Create a cleanup function to remove existing orphaned duplicates
CREATE OR REPLACE FUNCTION cleanup_orphaned_duplicates()
RETURNS TABLE(deleted_count INTEGER) AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Delete ALL orphaned swimmers that have a linked duplicate
  DELETE FROM swimmers 
  WHERE id IN (
    SELECT s1.id 
    FROM swimmers s1
    JOIN swimmers s2 ON 
      s1.first_name = s2.first_name 
      AND s1.last_name = s2.last_name
      AND s1.date_of_birth = s2.date_of_birth
    WHERE s1.parent_id IS NULL  -- s1 is orphaned
      AND s2.parent_id IS NOT NULL  -- s2 is linked
      AND s1.id != s2.id  -- Different records
  );
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_orphaned_duplicates() IS 
  'Removes orphaned swimmers that have a linked duplicate with a parent_id';

-- PART 3: Run the cleanup now
SELECT * FROM cleanup_orphaned_duplicates();

-- PART 4: Grant execute permissions
GRANT EXECUTE ON FUNCTION link_orphaned_registrations_by_email(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_orphaned_duplicates() TO authenticated;

-- PART 5: Verify the fix
SELECT 
  'After Cleanup' as status,
  COUNT(*) FILTER (WHERE parent_id IS NULL) as orphaned_swimmers,
  COUNT(*) FILTER (WHERE parent_id IS NOT NULL) as linked_swimmers,
  COUNT(*) as total_swimmers
FROM swimmers;

-- Show any remaining duplicates
SELECT 
  'Remaining Duplicates' as status,
  first_name,
  last_name,
  COUNT(*) as count,
  STRING_AGG(
    CASE 
      WHEN parent_id IS NULL THEN 'orphaned'
      ELSE 'linked'
    END || ' (' || status || ')',
    ', '
  ) as details
FROM swimmers
GROUP BY first_name, last_name, date_of_birth
HAVING COUNT(*) > 1;
