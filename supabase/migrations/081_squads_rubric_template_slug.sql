-- Admin-selected rubric template when enabling progress rubrics on a squad.

ALTER TABLE public.squads
  ADD COLUMN IF NOT EXISTS rubric_template_slug TEXT;

COMMENT ON COLUMN public.squads.rubric_template_slug IS
  'Pathway squad slug (pups, dev1, …) used as clone_rubric_template source when rubrics_enabled is true.';

-- Backfill existing enabled squads
UPDATE public.squads
SET rubric_template_slug = slug
WHERE rubrics_enabled = true
  AND slug IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold')
  AND rubric_template_slug IS NULL;

UPDATE public.squads
SET rubric_template_slug = 'dev2'
WHERE rubrics_enabled = true
  AND rubric_template_slug IS NULL;

CREATE OR REPLACE FUNCTION public.squads_ensure_rubric_on_enable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_source text;
BEGIN
  IF NEW.rubrics_enabled = true
     AND NOT EXISTS (
       SELECT 1 FROM public.rubric_domains d WHERE d.squad_slug = NEW.slug LIMIT 1
     ) THEN
    v_source := COALESCE(NULLIF(trim(NEW.rubric_template_slug), ''), 'dev2');
    PERFORM public.clone_rubric_template(NEW.slug, v_source);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.squads_ensure_rubric_on_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.squads_ensure_rubric_on_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.squads_ensure_rubric_on_enable() FROM authenticated;
