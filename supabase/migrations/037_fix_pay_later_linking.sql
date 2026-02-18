-- Migration: Fix "Pay Later" linking to include emergency contact and relationship data
-- Previously, only invoices/swimmers/consents were linked, but parent profile fields were not updated

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
  v_parent_data JSONB;
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

  -- Extract parent data from the most recent payment callback_data
  SELECT p.callback_data->'parentData' INTO v_parent_data
  FROM payments p
  WHERE p.invoice_id = ANY(v_invoice_ids)
    AND p.callback_data ? 'parentData'
  ORDER BY p.created_at DESC
  LIMIT 1;

  -- Update user's profile with emergency contact and relationship data
  IF v_parent_data IS NOT NULL THEN
    UPDATE profiles
    SET 
      relationship = COALESCE(v_parent_data->>'relationship', relationship),
      emergency_contact_name = COALESCE(v_parent_data->>'emergency_contact_name', emergency_contact_name),
      emergency_contact_relationship = COALESCE(v_parent_data->>'emergency_contact_relationship', emergency_contact_relationship),
      emergency_contact_phone = COALESCE(v_parent_data->>'emergency_contact_phone', emergency_contact_phone),
      updated_at = NOW()
    WHERE id = user_id;
    
    RAISE NOTICE 'Updated profile with emergency contact data from callback_data';
  END IF;

  -- Find and link swimmers that belong to these invoices
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

  -- Delete orphaned duplicates BEFORE updating to prevent constraint violations
  IF v_swimmer_ids IS NOT NULL THEN
    DELETE FROM swimmers s1
    WHERE s1.parent_id IS NULL
      AND s1.id = ANY(v_swimmer_ids)
      AND EXISTS (
        SELECT 1 FROM swimmers s2
        WHERE s2.parent_id = user_id
          AND s2.first_name = s1.first_name
          AND s2.last_name = s1.last_name
          AND s2.date_of_birth = s1.date_of_birth
          AND s2.id != s1.id
      );
    
    RAISE NOTICE 'Deleted orphaned duplicate swimmers before linking';
  END IF;

  -- Update swimmers
  IF v_swimmer_ids IS NOT NULL THEN
    UPDATE swimmers
    SET parent_id = user_id
    WHERE id = ANY(v_swimmer_ids)
      AND parent_id IS NULL; -- Only update if still orphaned
    
    GET DIAGNOSTICS v_linked_swimmers = ROW_COUNT;
  END IF;

  -- Link registration consents for these swimmers
  IF v_swimmer_ids IS NOT NULL THEN
    UPDATE registration_consents
    SET parent_id = user_id
    WHERE parent_id IS NULL
      AND swimmer_id = ANY(v_swimmer_ids);
    
    GET DIAGNOSTICS v_linked_consents = ROW_COUNT;
  END IF;

  -- Return counts
  RETURN QUERY SELECT v_linked_invoices, v_linked_swimmers, v_linked_consents;
END;
$$ LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp;

-- Update the handle_new_user trigger to use the updated function
-- (No changes needed to the trigger itself, just ensuring it uses the new function)

-- Add comment for documentation
COMMENT ON FUNCTION link_orphaned_registrations_by_email IS 
  'Links invoices, swimmers, and consents with parent_id=NULL to a user account by matching email. Also updates profile with emergency contact and relationship data from payment callback_data.';

-- Verify the function was updated
DO $$
BEGIN
  RAISE NOTICE '✅ Updated link_orphaned_registrations_by_email function';
  RAISE NOTICE '   - Now updates profile with emergency contact data';
  RAISE NOTICE '   - Works for both Pay Now and Pay Later scenarios';
  RAISE NOTICE '   - Extracts data from payments.callback_data';
END $$;
