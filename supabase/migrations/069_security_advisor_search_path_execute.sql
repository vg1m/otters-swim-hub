-- Supabase Database Linter (security advisor):
-- 0011_function_search_path_mutable — ensure search_path is bound to affected functions (not session SET).
-- 0028 anon_security_definer_function_executable — do not expose SECURITY DEFINER RPCs on PostgREST to anon.

-- -----------------------------------------------------------------------------
-- 1) handle_new_user: SET search_path must be part of CREATE FUNCTION (migration 056
--    mistakenly left SET as a standalone session statement after LANGUAGE).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
    FROM public.link_orphaned_registrations_by_email(NEW.id, NEW.email);

    IF v_linked_invoices > 0 OR v_linked_swimmers > 0 THEN
      RAISE NOTICE 'Linked orphaned data for user %: % invoices, % swimmers, % consents',
        NEW.email, v_linked_invoices, v_linked_swimmers, v_linked_consents;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to link orphaned registrations for user %: %', NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2) Trigger-only validation: immutable search_path
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.coach_session_delivery_reviews_coach_matches_session()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.training_sessions ts
    WHERE ts.id = NEW.session_id
      AND ts.coach_id IS NOT NULL
      AND ts.coach_id = NEW.coach_id
  ) THEN
    RAISE EXCEPTION 'coach_session_delivery_reviews: coach_id must match training_sessions.coach_id for this session_id';
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Family helper: lint recommends including pg_temp in search_path
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_can_access_parent_data(target_parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT
    target_parent_id IS NOT NULL
    AND (
      target_parent_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.family_account_members fam
        WHERE fam.primary_parent_id = target_parent_id
          AND fam.member_user_id = (SELECT auth.uid())
          AND fam.status = 'active'
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.claim_family_invite()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid := auth.uid();
  em text;
  n int := 0;
BEGIN
  IF uid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT lower(trim(email)) INTO em FROM auth.users WHERE id = uid;
  IF em IS NULL OR em = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.family_account_members fam
  SET
    member_user_id = uid,
    status = 'active',
    accepted_at = coalesce(fam.accepted_at, now())
  WHERE lower(trim(fam.invited_email)) = em
    AND fam.status = 'pending'
    AND fam.member_user_id IS NULL;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3) EXECUTE: anon must not invoke SECURITY DEFINER RPCs over PostgREST.
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.link_orphaned_registrations_by_email(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.link_orphaned_registrations_by_email(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.link_orphaned_registrations_by_email(uuid, text) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.generate_receipt_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_receipt_number() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_receipt_number() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.generate_receipt_number() TO service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_orphaned_duplicates() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_orphaned_duplicates() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_orphaned_duplicates() FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.profiles_role_change_guard() FROM anon;
REVOKE EXECUTE ON FUNCTION public.profiles_role_change_guard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profiles_role_change_guard() TO authenticated;

-- -----------------------------------------------------------------------------
-- JWT-authenticated callers (explicit GRANT keeps PostgREST + RLS sane)
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.admin_program_service_summary() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_program_service_summary() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.auth_user_can_access_parent_data(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.auth_user_can_access_parent_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_can_access_parent_data(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_family_invite() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_family_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_family_invite() TO service_role;

REVOKE EXECUTE ON FUNCTION public.link_my_orphaned_registrations() FROM anon;
GRANT EXECUTE ON FUNCTION public.link_my_orphaned_registrations() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_coach() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_coach() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_coach() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_coach() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_coach() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_coach() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.parent_has_coach_note_visible(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.parent_has_coach_note_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.parent_has_coach_note_visible(uuid) TO authenticated;

-- Trigger helpers invoked by INSERT/UPDATE (must retain authenticated EXECUTE on trigger body)
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_invoice_total() FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_invoice_total() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_invoice_total() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_consent_record() FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_consent_record() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_consent_record() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_session_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_session_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_session_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.coach_session_delivery_reviews_coach_matches_session() FROM anon;
REVOKE EXECUTE ON FUNCTION public.coach_session_delivery_reviews_coach_matches_session() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.coach_session_delivery_reviews_coach_matches_session() TO authenticated;
