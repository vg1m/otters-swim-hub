-- Dynamic squads, squad_id FKs, facility/session multi-squad junctions
-- Replaces hard-coded CHECK (competitive, learn_to_swim, fitness).

-- ---------------------------------------------------------------------------
-- 1. Squads catalog
-- ---------------------------------------------------------------------------
CREATE TABLE public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  quarterly_fee NUMERIC(10, 2), -- NULL = no quarterly option
  early_bird_eligible BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_squads_active_sort ON public.squads (is_active, sort_order);

COMMENT ON TABLE public.squads IS 'Admin-managed squads; fees drive invoicing after assignment.';

-- Seed (matches prior currency.js tiers where applicable)
INSERT INTO public.squads (slug, name, sort_order, monthly_fee, quarterly_fee, early_bird_eligible) VALUES
  ('pups', 'Pups', 1, 7000, NULL, false),
  ('development', 'Development (1–3)', 2, 12000, 30000, true),
  ('elite', 'Elite', 3, 12000, 30000, true),
  ('masters', 'Masters', 4, 14000, 36000, true);

-- ---------------------------------------------------------------------------
-- 2. Swimmers: add squad_id, backfill, drop legacy squad column
-- ---------------------------------------------------------------------------
ALTER TABLE public.swimmers
  ADD COLUMN squad_id UUID REFERENCES public.squads(id) ON DELETE SET NULL;

UPDATE public.swimmers s
SET squad_id = sub.id
FROM public.squads sub
WHERE sub.slug = CASE s.squad
  WHEN 'learn_to_swim' THEN 'pups'
  WHEN 'competitive' THEN 'elite'
  WHEN 'fitness' THEN 'masters'
  ELSE NULL
END;

-- Drop any RLS policies that reference the legacy squad column before dropping it
DROP POLICY IF EXISTS "Coaches can view assigned swimmers" ON public.swimmers;

ALTER TABLE public.swimmers DROP CONSTRAINT IF EXISTS swimmers_squad_check;
ALTER TABLE public.swimmers DROP COLUMN squad;

CREATE INDEX idx_swimmers_squad_id ON public.swimmers(squad_id) WHERE squad_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Profiles: coach_squad_id replaces coach_squad text
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN coach_squad_id UUID REFERENCES public.squads(id) ON DELETE SET NULL;

UPDATE public.profiles p
SET coach_squad_id = sub.id
FROM public.squads sub
WHERE p.coach_squad IS NOT NULL
  AND sub.slug = CASE p.coach_squad
    WHEN 'learn_to_swim' THEN 'pups'
    WHEN 'competitive' THEN 'elite'
    WHEN 'fitness' THEN 'masters'
    ELSE NULL
  END;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_coach_squad_check;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS coach_squad;

-- ---------------------------------------------------------------------------
-- 4. coach_assignments: squad_id replaces squad text
-- ---------------------------------------------------------------------------
ALTER TABLE public.coach_assignments
  ADD COLUMN squad_id UUID REFERENCES public.squads(id) ON DELETE CASCADE;

UPDATE public.coach_assignments ca
SET squad_id = sub.id
FROM public.squads sub
WHERE ca.squad IS NOT NULL
  AND sub.slug = CASE ca.squad
    WHEN 'learn_to_swim' THEN 'pups'
    WHEN 'competitive' THEN 'elite'
    WHEN 'fitness' THEN 'masters'
    ELSE NULL
  END;

DROP INDEX IF EXISTS idx_coach_assignments_squad;
ALTER TABLE public.coach_assignments DROP CONSTRAINT IF EXISTS unique_coach_squad;
ALTER TABLE public.coach_assignments DROP CONSTRAINT IF EXISTS coach_assignments_squad_check;
ALTER TABLE public.coach_assignments DROP CONSTRAINT IF EXISTS coach_squad_or_swimmer;

ALTER TABLE public.coach_assignments DROP COLUMN squad;

ALTER TABLE public.coach_assignments
  ADD CONSTRAINT coach_assignments_squad_or_swimmer CHECK (
    (squad_id IS NOT NULL AND swimmer_id IS NULL)
    OR (squad_id IS NULL AND swimmer_id IS NOT NULL)
  );

CREATE UNIQUE INDEX unique_coach_squad_id
  ON public.coach_assignments (coach_id, squad_id)
  NULLS NOT DISTINCT;

CREATE INDEX idx_coach_assignments_squad_id ON public.coach_assignments(squad_id) WHERE squad_id IS NOT NULL;

COMMENT ON COLUMN public.coach_assignments.squad_id IS 'Squad-level assignment; mutually exclusive with swimmer_id';

-- ---------------------------------------------------------------------------
-- 5. facility_schedule_squads (multi-squad per schedule row)
-- ---------------------------------------------------------------------------
CREATE TABLE public.facility_schedule_squads (
  schedule_id UUID NOT NULL REFERENCES public.facility_schedules(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  PRIMARY KEY (schedule_id, squad_id)
);

CREATE INDEX idx_facility_schedule_squads_squad ON public.facility_schedule_squads(squad_id);

INSERT INTO public.facility_schedule_squads (schedule_id, squad_id)
SELECT fs.id, sub.id
FROM public.facility_schedules fs
JOIN public.squads sub ON sub.slug = CASE fs.squad
  WHEN 'learn_to_swim' THEN 'pups'
  WHEN 'competitive' THEN 'elite'
  WHEN 'fitness' THEN 'masters'
  ELSE NULL
END
WHERE fs.squad IS NOT NULL;

ALTER TABLE public.facility_schedules DROP CONSTRAINT IF EXISTS facility_schedules_squad_check;
ALTER TABLE public.facility_schedules DROP COLUMN squad;

-- ---------------------------------------------------------------------------
-- 6. training_session_squads (multi-squad per session)
-- ---------------------------------------------------------------------------
CREATE TABLE public.training_session_squads (
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, squad_id)
);

CREATE INDEX idx_training_session_squads_squad ON public.training_session_squads(squad_id);

INSERT INTO public.training_session_squads (session_id, squad_id)
SELECT ts.id, sub.id
FROM public.training_sessions ts
JOIN public.squads sub ON sub.slug = CASE ts.squad
  WHEN 'learn_to_swim' THEN 'pups'
  WHEN 'competitive' THEN 'elite'
  WHEN 'fitness' THEN 'masters'
  ELSE NULL
END;

ALTER TABLE public.training_sessions DROP CONSTRAINT IF EXISTS training_sessions_squad_check;
ALTER TABLE public.training_sessions DROP COLUMN squad;

-- ---------------------------------------------------------------------------
-- 7. RLS: squads + junction tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;

-- Squad names/fees are non-sensitive; parents need labels even if a squad is later deactivated.
CREATE POLICY "Anyone can view squads"
  ON public.squads FOR SELECT
  USING (true);

CREATE POLICY "Admins manage squads"
  ON public.squads FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.facility_schedule_squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view facility schedule squads"
  ON public.facility_schedule_squads FOR SELECT
  USING (true);

CREATE POLICY "Admins manage facility schedule squads"
  ON public.facility_schedule_squads FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.training_session_squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view training session squads"
  ON public.training_session_squads FOR SELECT
  USING (true);

CREATE POLICY "Admins manage training session squads"
  ON public.training_session_squads FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 8. Fix swimmers RLS: coach squad assignment uses squad_id
-- ---------------------------------------------------------------------------
CREATE POLICY "Coaches can view assigned swimmers" ON public.swimmers
  FOR SELECT USING (
    coach_id = (SELECT auth.uid())
    OR id IN (
      SELECT swimmer_id FROM public.coach_assignments
      WHERE coach_id = (SELECT auth.uid()) AND swimmer_id IS NOT NULL
    )
    OR squad_id IN (
      SELECT ca.squad_id FROM public.coach_assignments ca
      WHERE ca.coach_id = (SELECT auth.uid()) AND ca.squad_id IS NOT NULL
    )
    OR public.is_coach()
  );

-- ---------------------------------------------------------------------------
-- 9. updated_at trigger for squads (reuse existing function)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_squads_updated_at ON public.squads;
CREATE TRIGGER update_squads_updated_at
  BEFORE UPDATE ON public.squads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
