-- Parents may read per-occurrence overrides/cancellations for sessions in their swimmers' squads.

CREATE OR REPLACE FUNCTION public.auth_user_can_view_training_session(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.training_session_squads tss
    INNER JOIN public.swimmers s ON s.squad_id = tss.squad_id
    WHERE tss.session_id = p_session_id
      AND public.auth_user_can_access_parent_data(s.parent_id)
  );
$$;

COMMENT ON FUNCTION public.auth_user_can_view_training_session(uuid) IS
  'True when the session is assigned to a squad of a swimmer the caller may access as parent/delegate.';

REVOKE EXECUTE ON FUNCTION public.auth_user_can_view_training_session(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auth_user_can_view_training_session(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.auth_user_can_view_training_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_can_view_training_session(uuid) TO service_role;

CREATE POLICY "Parents read session exceptions for their squads"
  ON public.training_session_exceptions
  FOR SELECT
  TO authenticated
  USING (public.auth_user_can_view_training_session(session_id));

CREATE POLICY "Parents read exception squads for their squads"
  ON public.training_session_exception_squads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.training_session_exceptions e
      WHERE e.id = exception_id
        AND public.auth_user_can_view_training_session(e.session_id)
    )
  );
