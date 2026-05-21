-- Admin-controlled flag: whether a squad shows monthly progress rubrics on Performance.

ALTER TABLE public.squads
  ADD COLUMN IF NOT EXISTS rubrics_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.squads.rubrics_enabled IS
  'When true, swimmers in this squad may see the Rubric tab if a template exists for the squad slug.';

UPDATE public.squads
SET rubrics_enabled = true
WHERE slug IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold');
