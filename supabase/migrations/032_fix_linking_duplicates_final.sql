-- Fix duplicate swimmer errors during orphaned registration linking
-- This is the FINAL fix - handles all edge cases

-- 1. First, clean up existing duplicates for the problematic user
DO $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  -- Delete orphaned duplicates where a linked version exists
  WITH duplicates_to_delete AS (
    SELECT s1.id
    FROM swimmers s1
    JOIN swimmers s2 ON 
      s1.first_name = s2.first_name 
      AND s1.last_name = s2.last_name
      AND s1.date_of_birth = s2.date_of_birth
    WHERE s1.parent_id IS NULL  -- s1 is orphaned
      AND s2.parent_id IS NOT NULL  -- s2 is linked
      AND s1.id != s2.id  -- Different records
  )
  DELETE FROM swimmers
  WHERE id IN (SELECT id FROM duplicates_to_delete);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % orphaned duplicate swimmers', v_deleted_count;
END $$;

-- 2. Update the linking function to be smarter about duplicates
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
  WHERE s.parent_id IS NULL
    AND (
      s.id IN (SELECT swimmer_id FROM swimmer_ids_from_payments)
      OR s.id IN (
        SELECT swimmer_id 
        FROM invoices 
        WHERE id = ANY(v_invoice_ids) 
          AND swimmer_id IS NOT NULL
      )
    );

  -- CRITICAL: Delete orphaned duplicates BEFORE linking to avoid unique constraint violations
  IF v_swimmer_ids IS NOT NULL THEN
    WITH duplicates_to_delete AS (
      SELECT s1.id
      FROM swimmers s1
      JOIN swimmers s2 ON 
        s1.first_name = s2.first_name 
        AND s1.last_name = s2.last_name
        AND s1.date_of_birth = s2.date_of_birth
      WHERE s1.parent_id IS NULL  -- s1 is orphaned
        AND s2.parent_id = user_id  -- s2 is already linked to THIS user
        AND s1.id != s2.id
        AND s1.id = ANY(v_swimmer_ids)  -- Only delete ones we're trying to link
    )
    DELETE FROM swimmers
    WHERE id IN (SELECT id FROM duplicates_to_delete);
    
    GET DIAGNOSTICS v_deleted_duplicates = ROW_COUNT;
    
    IF v_deleted_duplicates > 0 THEN
      RAISE NOTICE 'Deleted % orphaned duplicate swimmers before linking', v_deleted_duplicates;
      
      -- Remove deleted IDs from the array
      SELECT ARRAY_AGG(id) INTO v_swimmer_ids
      FROM unnest(v_swimmer_ids) as id
      WHERE id NOT IN (SELECT id FROM duplicates_to_delete);
    END IF;
  END IF;

  -- Now link the remaining swimmers (no duplicates exist)
  IF v_swimmer_ids IS NOT NULL AND array_length(v_swimmer_ids, 1) > 0 THEN
    UPDATE swimmers
    SET parent_id = user_id
    WHERE id = ANY(v_swimmer_ids);
    
    GET DIAGNOSTICS v_linked_swimmers = ROW_COUNT;
    
    -- Set swimmer_id on linked invoices
    IF v_invoice_ids IS NOT NULL THEN
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
  END IF;

  -- Link consents
  IF v_swimmer_ids IS NOT NULL AND array_length(v_swimmer_ids, 1) > 0 THEN
    UPDATE registration_consents
    SET parent_id = user_id
    WHERE parent_id IS NULL
      AND swimmer_id = ANY(v_swimmer_ids);
    
    GET DIAGNOSTICS v_linked_consents = ROW_COUNT;
  END IF;

  RETURN QUERY SELECT v_linked_invoices, v_linked_swimmers, v_linked_consents;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION link_orphaned_registrations_by_email(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION link_orphaned_registrations_by_email(UUID, TEXT) TO service_role;

-- 3. Verify the fix
SELECT 
  'Test: Check for duplicates' as check_type,
  COUNT(*) as duplicate_count
FROM (
  SELECT first_name, last_name, date_of_birth, parent_id
  FROM swimmers
  WHERE parent_id IS NOT NULL
  GROUP BY first_name, last_name, date_of_birth, parent_id
  HAVING COUNT(*) > 1
) duplicates;

-- 4. Show current state
SELECT 
  'Current swimmer state' as status,
  COUNT(*) FILTER (WHERE parent_id IS NOT NULL) as linked_swimmers,
  COUNT(*) FILTER (WHERE parent_id IS NULL) as orphaned_swimmers,
  COUNT(*) as total_swimmers
FROM swimmers;

COMMENT ON FUNCTION link_orphaned_registrations_by_email(UUID, TEXT) IS 
  'Links orphaned registrations to user accounts by email. 
   UPDATED: Now deletes orphaned duplicates BEFORE linking to avoid unique constraint violations.
   This prevents "duplicate key value violates unique constraint" errors.';
