-- Only admins may create training sessions (coaches use attendance, not session setup).

DROP POLICY IF EXISTS "training_sessions_insert_staff" ON public.training_sessions;

CREATE POLICY "training_sessions_insert_admin"
  ON public.training_sessions
  FOR INSERT
  WITH CHECK (public.is_admin());

COMMENT ON POLICY "training_sessions_insert_admin" ON public.training_sessions IS
  'Session creation is restricted to admin accounts.';
