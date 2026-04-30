-- Continue Supabase security advisor cleanup (lint 0028 / 0029).
--  • anon often retains EXECUTE via GRANT … TO PUBLIC — revoke PUBLIC explicitly everywhere below.
--  • Trigger-only helpers that need no privileged reads → SECURITY INVOKER (no SECURITY DEFINER RPC surface).
--  • admin_program_service_summary: callable only by service_role; browsers use GET /api/admin/program-service-summary.

-- -----------------------------------------------------------------------------
-- 1) Triggers: SECURITY INVOKER + fixed search_path (no elevated privilege needed)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_consent_record()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.swimmer_id IS NULL THEN
    RAISE EXCEPTION 'swimmer_id cannot be NULL';
  END IF;

  IF NEW.consent_text IS NULL OR LENGTH(TRIM(NEW.consent_text)) = 0 THEN
    RAISE EXCEPTION 'consent_text cannot be empty';
  END IF;

  IF NEW.media_consent IS NULL AND NEW.code_of_conduct_consent IS NULL AND NEW.data_accuracy_confirmed IS NULL THEN
    RAISE EXCEPTION 'At least one consent field must be set';
  END IF;

  RAISE NOTICE 'Consent record created: swimmer_id=%, media=%, code=%, data=%',
    NEW.swimmer_id, NEW.media_consent, NEW.code_of_conduct_consent, NEW.data_accuracy_confirmed;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.profiles_role_change_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF COALESCE((SELECT auth.jwt() ->> 'role'), '') IN ('service_role') THEN
      RETURN NEW;
    END IF;
    IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only club administrators can change user roles'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2) Whole-program aggregates: server-only RPC (JWT service_role bypasses RLS safely here)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_program_service_summary()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
BEGIN
  IF COALESCE((SELECT auth.jwt() ->> 'role'), '') <> 'service_role' THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'session_count',
    (SELECT count(*)::bigint FROM public.training_sessions WHERE coach_id IS NOT NULL),
    'calendar_day_count',
    (
      SELECT count(DISTINCT session_date)::bigint
      FROM public.training_sessions
      WHERE coach_id IS NOT NULL AND session_date IS NOT NULL
    ),
    'check_in_count',
    (
      SELECT count(*)::bigint
      FROM public.attendance a
      INNER JOIN public.training_sessions ts ON ts.id = a.session_id
      WHERE ts.coach_id IS NOT NULL
    ),
    'unique_swimmer_count',
    (
      SELECT count(DISTINCT a.swimmer_id)::bigint
      FROM public.attendance a
      INNER JOIN public.training_sessions ts ON ts.id = a.session_id
      WHERE ts.coach_id IS NOT NULL AND a.swimmer_id IS NOT NULL
    ),
    'coach_count',
    (
      SELECT count(DISTINCT sub.coach_id)::bigint
      FROM (
        SELECT coach_id FROM public.training_sessions WHERE coach_id IS NOT NULL
        UNION ALL
        SELECT a.coach_id
        FROM public.attendance a
        INNER JOIN public.training_sessions ts ON ts.id = a.session_id
        WHERE ts.coach_id IS NOT NULL
          AND a.checked_in_by = 'coach'
          AND a.coach_id IS NOT NULL
      ) sub
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_program_service_summary() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_program_service_summary() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_program_service_summary() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.admin_program_service_summary() TO service_role;

COMMENT ON FUNCTION public.admin_program_service_summary() IS
  'Whole-program aggregates for coached sessions; service_role only (Next.js GET /api/admin/program-service-summary).';

-- -----------------------------------------------------------------------------
-- 3) Orphan linking: revoke wrapper RPC — app uses service_role +
--    link_orphaned_registrations_by_email from authenticated server routes only.
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.link_orphaned_registrations_by_email(uuid, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.link_my_orphaned_registrations() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.link_my_orphaned_registrations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.link_my_orphaned_registrations() FROM authenticated;

-- -----------------------------------------------------------------------------
-- 4) Strip PUBLIC grants on remaining SECURITY DEFINER RPCs (closes anon loophole via PUBLIC)
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.auth_user_can_access_parent_data(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auth_user_can_access_parent_data(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.auth_user_can_access_parent_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_can_access_parent_data(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_family_invite() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_family_invite() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_family_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_family_invite() TO service_role;

REVOKE EXECUTE ON FUNCTION public.calculate_invoice_total() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_invoice_total() FROM anon;

REVOKE EXECUTE ON FUNCTION public.generate_session_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_session_code() FROM anon;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_coach() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_coach() FROM anon;

REVOKE EXECUTE ON FUNCTION public.is_coach() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_coach() FROM anon;

REVOKE EXECUTE ON FUNCTION public.parent_has_coach_note_visible(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.parent_has_coach_note_visible(uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.profiles_role_change_guard() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.profiles_role_change_guard() FROM anon;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;

REVOKE EXECUTE ON FUNCTION public.validate_consent_record() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_consent_record() FROM anon;

GRANT EXECUTE ON FUNCTION public.calculate_invoice_total() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_session_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_coach() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_coach() TO authenticated;
GRANT EXECUTE ON FUNCTION public.parent_has_coach_note_visible(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profiles_role_change_guard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_consent_record() TO authenticated;
