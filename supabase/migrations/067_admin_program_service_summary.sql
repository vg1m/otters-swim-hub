-- Whole-program aggregates for admin Service & pay review summary card (not date-scoped).

CREATE OR REPLACE FUNCTION public.admin_program_service_summary()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
BEGIN
  IF NOT public.is_admin() THEN
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

REVOKE ALL ON FUNCTION public.admin_program_service_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_program_service_summary() TO authenticated;

COMMENT ON FUNCTION public.admin_program_service_summary() IS
  'Returns JSON aggregates for coached sessions across the whole program. Admin-only; non-admins get NULL.';

