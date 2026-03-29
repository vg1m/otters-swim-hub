-- Per-session coach pay: rate on profiles + idempotent pay events + RLS

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS per_session_rate_kes NUMERIC(12, 2);

COMMENT ON COLUMN public.profiles.per_session_rate_kes IS
  'KES paid per training session coached; NULL disables automated coach pay notifications.';

CREATE TABLE IF NOT EXISTS public.coach_session_pay_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_kes NUMERIC(12, 2) NOT NULL,
  rate_snapshot_kes NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT coach_session_pay_events_session_id_unique UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_session_pay_events_coach_id
  ON public.coach_session_pay_events (coach_id);

CREATE INDEX IF NOT EXISTS idx_coach_session_pay_events_created_at
  ON public.coach_session_pay_events (created_at DESC);

COMMENT ON TABLE public.coach_session_pay_events IS
  'One row per training session when coach pay notification was generated (idempotent per session).';

ALTER TABLE public.coach_session_pay_events ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins can manage coach session pay events"
  ON public.coach_session_pay_events
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Coaches: read own pay lines
CREATE POLICY "Coaches can view own session pay events"
  ON public.coach_session_pay_events
  FOR SELECT
  USING (coach_id = (SELECT auth.uid()));

-- Service role bypasses RLS by default; cron uses service role.

-- Allow admins to update any profile (needed for coach management + rates)
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
  ON public.profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
