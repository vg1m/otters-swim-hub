-- -----------------------------------------------------------------------------
-- Migration 074: Rubric writes scoped to assigned coaches (squads roster)
-- -----------------------------------------------------------------------------
-- Helpers: swimmer rubric edits allowed for admins, swimmers.coach_id,
-- squad-head coach_assignments, or per-swimmer coach_assignments.
-- Squad template edits (custom rubric_domains / rubric_milestones): admins or
-- squad-head only.
-- -----------------------------------------------------------------------------
-- -----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER, row_security off for stable reads under RLS)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.auth_can_manage_swimmer_rubric(p_swimmer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT
    p_swimmer_id IS NOT NULL
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.swimmers sw
        WHERE sw.id = p_swimmer_id
          AND sw.coach_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM public.swimmers sw
        INNER JOIN public.coach_assignments ca
          ON ca.squad_id = sw.squad_id
         AND ca.swimmer_id IS NULL
        WHERE sw.id = p_swimmer_id
          AND ca.coach_id = (SELECT auth.uid())
      )
      OR EXISTS (
        SELECT 1
        FROM public.coach_assignments ca
        WHERE ca.swimmer_id = p_swimmer_id
          AND ca.coach_id = (SELECT auth.uid())
      )
    );
$$;

COMMENT ON FUNCTION public.auth_can_manage_swimmer_rubric(uuid) IS
  'True when admin or coach may insert/update swimmer rubric ratings for this swimmer.';

CREATE OR REPLACE FUNCTION public.auth_can_manage_rubric_squad_slug(p_squad_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT
    p_squad_slug IS NOT NULL
    AND TRIM(p_squad_slug) <> ''
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1
        FROM public.squads sq
        INNER JOIN public.coach_assignments ca
          ON ca.squad_id = sq.id
         AND ca.swimmer_id IS NULL
        WHERE sq.slug = p_squad_slug
          AND ca.coach_id = (SELECT auth.uid())
      )
    );
$$;

COMMENT ON FUNCTION public.auth_can_manage_rubric_squad_slug(text) IS
  'True when admin or squad-head coach may add custom rubric domains/milestones for this slug.';

REVOKE ALL ON FUNCTION public.auth_can_manage_swimmer_rubric(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auth_can_manage_swimmer_rubric(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.auth_can_manage_swimmer_rubric(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_can_manage_swimmer_rubric(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.auth_can_manage_rubric_squad_slug(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auth_can_manage_rubric_squad_slug(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.auth_can_manage_rubric_squad_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_can_manage_rubric_squad_slug(text) TO service_role;

-- -----------------------------------------------------------------------------
-- swimmer_milestone_ratings: tighter coach INSERT/UPDATE
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Coaches can insert milestone ratings" ON public.swimmer_milestone_ratings;
DROP POLICY IF EXISTS "Coaches can update milestone ratings" ON public.swimmer_milestone_ratings;

CREATE POLICY "Assigned coaches insert milestone ratings"
  ON public.swimmer_milestone_ratings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'coach'
    )
    AND public.auth_can_manage_swimmer_rubric(swimmer_id)
  );

CREATE POLICY "Assigned coaches update milestone ratings"
  ON public.swimmer_milestone_ratings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'coach'
    )
    AND public.auth_can_manage_swimmer_rubric(swimmer_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'coach'
    )
    AND public.auth_can_manage_swimmer_rubric(swimmer_id)
  );

-- -----------------------------------------------------------------------------
-- swimmer_attitude_ratings: tighter coach INSERT/UPDATE
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Coaches can insert attitude ratings" ON public.swimmer_attitude_ratings;
DROP POLICY IF EXISTS "Coaches can update attitude ratings" ON public.swimmer_attitude_ratings;

CREATE POLICY "Assigned coaches insert attitude ratings"
  ON public.swimmer_attitude_ratings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'coach'
    )
    AND public.auth_can_manage_swimmer_rubric(swimmer_id)
  );

CREATE POLICY "Assigned coaches update attitude ratings"
  ON public.swimmer_attitude_ratings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'coach'
    )
    AND public.auth_can_manage_swimmer_rubric(swimmer_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'coach'
    )
    AND public.auth_can_manage_swimmer_rubric(swimmer_id)
  );

-- -----------------------------------------------------------------------------
-- rubric_domains: squad-head (or admin) for custom INSERT
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Coaches can insert rubric_domains" ON public.rubric_domains;

CREATE POLICY "Squad-head coaches insert custom rubric_domains"
  ON public.rubric_domains FOR INSERT
  WITH CHECK (
    is_custom = true
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'coach'
    )
    AND public.auth_can_manage_rubric_squad_slug(squad_slug)
  );

-- -----------------------------------------------------------------------------
-- rubric_milestones: squad-head for custom INSERT
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Coaches can insert custom milestones" ON public.rubric_milestones;

CREATE POLICY "Squad-head coaches insert custom milestones"
  ON public.rubric_milestones FOR INSERT
  WITH CHECK (
    is_custom = true
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'coach'
    )
    AND public.auth_can_manage_rubric_squad_slug(
      (SELECT d.squad_slug FROM public.rubric_domains d WHERE d.id = rubric_milestones.domain_id)
    )
  );

-- -----------------------------------------------------------------------------
-- Remove named coaches from seeded squad descriptions (neutral copy only)
-- -----------------------------------------------------------------------------

UPDATE public.squads SET description = 'Typical ages 7 to 8; coach assigned in hub' WHERE slug = 'dev1';
UPDATE public.squads SET description = 'Typical ages 8 to 9; coach assigned in hub' WHERE slug = 'dev2';
UPDATE public.squads SET description = 'Typical ages 10 to 11; coach assigned in hub' WHERE slug = 'dev3';
UPDATE public.squads SET description = 'Typical ages 11 to 13; coach assigned in hub' WHERE slug = 'bronze';
UPDATE public.squads SET description = 'Typical ages 12 to 14; coach assigned in hub' WHERE slug = 'silver';
UPDATE public.squads SET description = 'By selection only; coach assigned in hub' WHERE slug = 'gold';
