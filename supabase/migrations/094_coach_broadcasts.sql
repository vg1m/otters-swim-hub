-- Coach broadcasts to parents in assigned squads or to staff coaches.

CREATE TABLE public.coach_broadcasts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  audience     TEXT NOT NULL CHECK (audience IN ('parents_in_my_squads', 'coaches')),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  link_url     TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coach_broadcasts_coach ON public.coach_broadcasts (coach_id, published_at DESC);

COMMENT ON TABLE public.coach_broadcasts IS
  'Coach-published messages to squad parents or to coaches/admins.';

ALTER TABLE public.coach_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches manage own broadcasts"
  ON public.coach_broadcasts
  FOR ALL
  TO authenticated
  USING (coach_id = (SELECT auth.uid()) AND public.is_coach())
  WITH CHECK (coach_id = (SELECT auth.uid()) AND public.is_coach());

CREATE POLICY "Admins read all coach broadcasts"
  ON public.coach_broadcasts
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Staff read coach-to-coach broadcasts"
  ON public.coach_broadcasts
  FOR SELECT
  TO authenticated
  USING (
    audience = 'coaches'
    AND (public.is_admin() OR public.is_coach())
  );
