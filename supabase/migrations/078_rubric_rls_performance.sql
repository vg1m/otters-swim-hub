-- Supabase Performance Advisor (rubric tables):
--   auth_rls_initplan: wrap auth.* in (SELECT ...) for InitPlan stability.
--   multiple_permissive_policies: one permissive policy per role/action (OR merged).

-- -----------------------------------------------------------------------------
-- rubric_domains
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone authenticated can read rubric_domains" ON public.rubric_domains;
DROP POLICY IF EXISTS "Admins can manage rubric_domains" ON public.rubric_domains;
DROP POLICY IF EXISTS "Squad-head coaches insert custom rubric_domains" ON public.rubric_domains;
DROP POLICY IF EXISTS "Coaches can insert rubric_domains" ON public.rubric_domains;
DROP POLICY IF EXISTS "rubric_domains_select" ON public.rubric_domains;
DROP POLICY IF EXISTS "rubric_domains_insert" ON public.rubric_domains;
DROP POLICY IF EXISTS "rubric_domains_update" ON public.rubric_domains;
DROP POLICY IF EXISTS "rubric_domains_delete" ON public.rubric_domains;

CREATE POLICY "rubric_domains_select"
  ON public.rubric_domains
  FOR SELECT
  USING (
    (SELECT auth.role()) = 'authenticated'
    OR public.is_admin()
  );

CREATE POLICY "rubric_domains_insert"
  ON public.rubric_domains
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (
      is_custom = true
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'coach'
      )
      AND public.auth_can_manage_rubric_squad_slug(squad_slug)
    )
  );

CREATE POLICY "rubric_domains_update"
  ON public.rubric_domains
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "rubric_domains_delete"
  ON public.rubric_domains
  FOR DELETE
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- rubric_milestones
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone authenticated can read rubric_milestones" ON public.rubric_milestones;
DROP POLICY IF EXISTS "Admins can manage rubric_milestones" ON public.rubric_milestones;
DROP POLICY IF EXISTS "Squad-head coaches insert custom milestones" ON public.rubric_milestones;
DROP POLICY IF EXISTS "Coaches can insert custom milestones" ON public.rubric_milestones;
DROP POLICY IF EXISTS "rubric_milestones_select" ON public.rubric_milestones;
DROP POLICY IF EXISTS "rubric_milestones_insert" ON public.rubric_milestones;
DROP POLICY IF EXISTS "rubric_milestones_update" ON public.rubric_milestones;
DROP POLICY IF EXISTS "rubric_milestones_delete" ON public.rubric_milestones;

CREATE POLICY "rubric_milestones_select"
  ON public.rubric_milestones
  FOR SELECT
  USING (
    (SELECT auth.role()) = 'authenticated'
    OR public.is_admin()
  );

CREATE POLICY "rubric_milestones_insert"
  ON public.rubric_milestones
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (
      is_custom = true
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'coach'
      )
      AND public.auth_can_manage_rubric_squad_slug(
        (SELECT d.squad_slug FROM public.rubric_domains d WHERE d.id = rubric_milestones.domain_id)
      )
    )
  );

CREATE POLICY "rubric_milestones_update"
  ON public.rubric_milestones
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "rubric_milestones_delete"
  ON public.rubric_milestones
  FOR DELETE
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- swimmer_milestone_ratings
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can view own swimmer milestone ratings" ON public.swimmer_milestone_ratings;
DROP POLICY IF EXISTS "Coaches can view all milestone ratings" ON public.swimmer_milestone_ratings;
DROP POLICY IF EXISTS "Admins can manage milestone ratings" ON public.swimmer_milestone_ratings;
DROP POLICY IF EXISTS "Assigned coaches insert milestone ratings" ON public.swimmer_milestone_ratings;
DROP POLICY IF EXISTS "Assigned coaches update milestone ratings" ON public.swimmer_milestone_ratings;
DROP POLICY IF EXISTS "Coaches can insert milestone ratings" ON public.swimmer_milestone_ratings;
DROP POLICY IF EXISTS "Coaches can update milestone ratings" ON public.swimmer_milestone_ratings;
DROP POLICY IF EXISTS "swimmer_milestone_ratings_select" ON public.swimmer_milestone_ratings;
DROP POLICY IF EXISTS "swimmer_milestone_ratings_insert" ON public.swimmer_milestone_ratings;
DROP POLICY IF EXISTS "swimmer_milestone_ratings_update" ON public.swimmer_milestone_ratings;
DROP POLICY IF EXISTS "swimmer_milestone_ratings_delete" ON public.swimmer_milestone_ratings;

CREATE POLICY "swimmer_milestone_ratings_select"
  ON public.swimmer_milestone_ratings
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'coach'
    )
    OR EXISTS (
      SELECT 1 FROM public.swimmers s
      WHERE s.id = swimmer_milestone_ratings.swimmer_id
        AND public.auth_user_can_access_parent_data(s.parent_id)
    )
  );

CREATE POLICY "swimmer_milestone_ratings_insert"
  ON public.swimmer_milestone_ratings
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'coach'
      )
      AND public.auth_can_manage_swimmer_rubric(swimmer_id)
    )
  );

CREATE POLICY "swimmer_milestone_ratings_update"
  ON public.swimmer_milestone_ratings
  FOR UPDATE
  USING (
    public.is_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'coach'
      )
      AND public.auth_can_manage_swimmer_rubric(swimmer_id)
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'coach'
      )
      AND public.auth_can_manage_swimmer_rubric(swimmer_id)
    )
  );

CREATE POLICY "swimmer_milestone_ratings_delete"
  ON public.swimmer_milestone_ratings
  FOR DELETE
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- swimmer_attitude_ratings
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can view own swimmer attitude ratings" ON public.swimmer_attitude_ratings;
DROP POLICY IF EXISTS "Coaches can view all attitude ratings" ON public.swimmer_attitude_ratings;
DROP POLICY IF EXISTS "Admins can manage attitude ratings" ON public.swimmer_attitude_ratings;
DROP POLICY IF EXISTS "Assigned coaches insert attitude ratings" ON public.swimmer_attitude_ratings;
DROP POLICY IF EXISTS "Assigned coaches update attitude ratings" ON public.swimmer_attitude_ratings;
DROP POLICY IF EXISTS "Coaches can insert attitude ratings" ON public.swimmer_attitude_ratings;
DROP POLICY IF EXISTS "Coaches can update attitude ratings" ON public.swimmer_attitude_ratings;
DROP POLICY IF EXISTS "swimmer_attitude_ratings_select" ON public.swimmer_attitude_ratings;
DROP POLICY IF EXISTS "swimmer_attitude_ratings_insert" ON public.swimmer_attitude_ratings;
DROP POLICY IF EXISTS "swimmer_attitude_ratings_update" ON public.swimmer_attitude_ratings;
DROP POLICY IF EXISTS "swimmer_attitude_ratings_delete" ON public.swimmer_attitude_ratings;

CREATE POLICY "swimmer_attitude_ratings_select"
  ON public.swimmer_attitude_ratings
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'coach'
    )
    OR EXISTS (
      SELECT 1 FROM public.swimmers s
      WHERE s.id = swimmer_attitude_ratings.swimmer_id
        AND public.auth_user_can_access_parent_data(s.parent_id)
    )
  );

CREATE POLICY "swimmer_attitude_ratings_insert"
  ON public.swimmer_attitude_ratings
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'coach'
      )
      AND public.auth_can_manage_swimmer_rubric(swimmer_id)
    )
  );

CREATE POLICY "swimmer_attitude_ratings_update"
  ON public.swimmer_attitude_ratings
  FOR UPDATE
  USING (
    public.is_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'coach'
      )
      AND public.auth_can_manage_swimmer_rubric(swimmer_id)
    )
  )
  WITH CHECK (
    public.is_admin()
    OR (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'coach'
      )
      AND public.auth_can_manage_swimmer_rubric(swimmer_id)
    )
  );

CREATE POLICY "swimmer_attitude_ratings_delete"
  ON public.swimmer_attitude_ratings
  FOR DELETE
  USING (public.is_admin());
