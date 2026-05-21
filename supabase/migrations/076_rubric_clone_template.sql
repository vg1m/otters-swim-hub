-- Clone pathway rubric checklist into custom squad slugs when rubrics are enabled.
-- Default source: dev2 (Development 2). Idempotent: skips if target already has domains.

CREATE OR REPLACE FUNCTION public.clone_rubric_template(
  p_target_slug text,
  p_source_slug text DEFAULT 'dev2'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  src_domain public.rubric_domains%ROWTYPE;
  new_domain_id uuid;
BEGIN
  IF p_target_slug IS NULL OR trim(p_target_slug) = '' THEN
    RETURN;
  END IF;
  IF p_source_slug IS NULL OR trim(p_source_slug) = '' THEN
    RETURN;
  END IF;
  IF p_target_slug = p_source_slug THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.rubric_domains WHERE squad_slug = p_target_slug LIMIT 1
  ) THEN
    RETURN;
  END IF;

  FOR src_domain IN
    SELECT *
    FROM public.rubric_domains
    WHERE squad_slug = p_source_slug
    ORDER BY sort_order, id
  LOOP
    INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order, is_custom)
    VALUES (p_target_slug, src_domain.section, src_domain.domain_name, src_domain.sort_order, false)
    RETURNING id INTO new_domain_id;

    INSERT INTO public.rubric_milestones (domain_id, text, sort_order, is_custom)
    SELECT new_domain_id, m.text, m.sort_order, false
    FROM public.rubric_milestones m
    WHERE m.domain_id = src_domain.id
      AND m.is_custom = false;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.clone_rubric_template(text, text) IS
  'Copies non-custom rubric_domains/milestones from source slug to target slug if target has none.';

REVOKE ALL ON FUNCTION public.clone_rubric_template(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_rubric_template(text, text) TO service_role;

-- When admin enables rubrics on a squad, seed checklist from dev2.
CREATE OR REPLACE FUNCTION public.squads_ensure_rubric_on_enable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.rubrics_enabled = true
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.rubrics_enabled, false) = false) THEN
    PERFORM public.clone_rubric_template(NEW.slug, 'dev2');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS squads_ensure_rubric_on_enable ON public.squads;
CREATE TRIGGER squads_ensure_rubric_on_enable
  AFTER INSERT OR UPDATE OF rubrics_enabled ON public.squads
  FOR EACH ROW
  EXECUTE FUNCTION public.squads_ensure_rubric_on_enable();

-- Backfill: any squad with rubrics_enabled but no domains yet (e.g. development_3).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT sq.slug
    FROM public.squads sq
    WHERE sq.rubrics_enabled = true
      AND NOT EXISTS (
        SELECT 1 FROM public.rubric_domains d WHERE d.squad_slug = sq.slug
      )
  LOOP
    PERFORM public.clone_rubric_template(r.slug, 'dev2');
  END LOOP;
END;
$$;
