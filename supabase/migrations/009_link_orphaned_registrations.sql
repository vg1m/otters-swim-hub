-- Link Orphaned Registration Data to User Accounts
-- This fixes the issue where users who register+pay before signing up
-- don't see their data after creating an account

-- 1. Create function to link orphaned records by email
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
BEGIN
  -- Find and link invoices where parent_id is NULL and email matches in payments callback_data
  -- First, get the invoice IDs that match
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

  -- Find and link swimmers that belong to these invoices or have matching parent data
  -- Method 1: Link swimmers from payments callback_data
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

  -- Update swimmers
  IF v_swimmer_ids IS NOT NULL THEN
    UPDATE swimmers
    SET parent_id = user_id
    WHERE id = ANY(v_swimmer_ids);
    
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the handle_new_user function to automatically link orphaned records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
  v_linked_invoices INTEGER;
  v_linked_swimmers INTEGER;
  v_linked_consents INTEGER;
BEGIN
  -- Get metadata with defaults
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_phone := NEW.raw_user_meta_data->>'phone_number';
  
  -- Insert profile
  INSERT INTO public.profiles (id, full_name, email, phone_number, role)
  VALUES (
    NEW.id,
    v_full_name,
    NEW.email,
    v_phone,
    'parent'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    email = EXCLUDED.email,
    phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
    updated_at = NOW();

  -- Automatically link any orphaned registrations for this email
  -- This handles the case where users register+pay before creating an account
  SELECT * INTO v_linked_invoices, v_linked_swimmers, v_linked_consents
  FROM link_orphaned_registrations_by_email(NEW.id, NEW.email);

  -- Log the linking results (for debugging)
  IF v_linked_invoices > 0 OR v_linked_swimmers > 0 THEN
    RAISE NOTICE 'Linked orphaned data for user %: % invoices, % swimmers, % consents', 
      NEW.email, v_linked_invoices, v_linked_swimmers, v_linked_consents;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the trigger exists (recreate if needed)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Add helper function to manually link records (for existing users)
CREATE OR REPLACE FUNCTION link_my_orphaned_registrations()
RETURNS TABLE(
  linked_invoices INTEGER,
  linked_swimmers INTEGER,
  linked_consents INTEGER
) AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user email
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;

  -- Link records
  RETURN QUERY 
  SELECT * FROM link_orphaned_registrations_by_email(v_user_id, v_user_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION link_orphaned_registrations_by_email(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION link_my_orphaned_registrations() TO authenticated;

-- 6. Add comments for documentation
COMMENT ON FUNCTION link_orphaned_registrations_by_email IS 
  'Links invoices, swimmers, and consents with parent_id=NULL to a user account by matching email';

COMMENT ON FUNCTION link_my_orphaned_registrations IS 
  'Allows authenticated users to manually link any orphaned registrations to their account';

-- 7. Create API endpoint helper view for admins
CREATE OR REPLACE VIEW orphaned_registrations_summary AS
SELECT 
  COUNT(DISTINCT i.id) as orphaned_invoices,
  COUNT(DISTINCT s.id) as orphaned_swimmers,
  COUNT(DISTINCT rc.id) as orphaned_consents,
  ARRAY_AGG(DISTINCT p.callback_data->>'parentEmail') FILTER (WHERE p.callback_data->>'parentEmail' IS NOT NULL) as parent_emails
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
LEFT JOIN swimmers s ON s.parent_id IS NULL
LEFT JOIN registration_consents rc ON rc.parent_id IS NULL
WHERE i.parent_id IS NULL;

-- Grant view access to admins
GRANT SELECT ON orphaned_registrations_summary TO authenticated;

-- 8. Verify the setup
SELECT 
  'Function created' as status,
  'link_orphaned_registrations_by_email' as function_name;

SELECT 
  'Trigger updated' as status,
  'on_auth_user_created' as trigger_name;
