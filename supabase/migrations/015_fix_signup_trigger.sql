-- Fix signup trigger to prevent errors from blocking user creation
-- Wrap orphaned data linking in exception handler

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
  v_linked_invoices INTEGER := 0;
  v_linked_swimmers INTEGER := 0;
  v_linked_consents INTEGER := 0;
BEGIN
  -- Extract user metadata
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone_number', '');

  -- Create profile (this should always succeed)
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

  -- Try to link orphaned registrations, but don't fail if this errors
  BEGIN
    SELECT linked_invoices, linked_swimmers, linked_consents 
    INTO v_linked_invoices, v_linked_swimmers, v_linked_consents
    FROM link_orphaned_registrations_by_email(NEW.id, NEW.email);

    -- Log the linking results (for debugging)
    IF v_linked_invoices > 0 OR v_linked_swimmers > 0 THEN
      RAISE NOTICE 'Linked orphaned data for user %: % invoices, % swimmers, % consents', 
        NEW.email, v_linked_invoices, v_linked_swimmers, v_linked_consents;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Failed to link orphaned registrations for user %: %', NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
