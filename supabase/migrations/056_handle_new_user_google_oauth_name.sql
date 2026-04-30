-- Google OAuth supplies "name" in user_metadata; email signup uses "full_name".
-- Prefer full_name, then name, then a sensible default.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_phone TEXT;
  v_linked_invoices INTEGER := 0;
  v_linked_swimmers INTEGER := 0;
  v_linked_consents INTEGER := 0;
BEGIN
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    'User'
  );
  v_phone := COALESCE(NEW.raw_user_meta_data->>'phone_number', '');

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
    full_name = COALESCE(NULLIF(TRIM(EXCLUDED.full_name), ''), profiles.full_name),
    email = EXCLUDED.email,
    phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
    updated_at = NOW();

  BEGIN
    SELECT linked_invoices, linked_swimmers, linked_consents
    INTO v_linked_invoices, v_linked_swimmers, v_linked_consents
    FROM link_orphaned_registrations_by_email(NEW.id, NEW.email);

    IF v_linked_invoices > 0 OR v_linked_swimmers > 0 THEN
      RAISE NOTICE 'Linked orphaned data for user %: % invoices, % swimmers, % consents',
        NEW.email, v_linked_invoices, v_linked_swimmers, v_linked_consents;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to link orphaned registrations for user %: %', NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp;
