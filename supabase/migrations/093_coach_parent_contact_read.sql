-- Coaches may read parent contact fields for parents of swimmers in their coaching scope.

CREATE OR REPLACE FUNCTION public.auth_coach_can_view_parent_contact(p_parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT
    p_parent_id IS NOT NULL
    AND public.is_coach()
    AND EXISTS (
      SELECT 1
      FROM public.swimmers sw
      WHERE sw.parent_id = p_parent_id
        AND sw.status = 'approved'
        AND (
          sw.coach_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.coach_assignments ca
            WHERE ca.coach_id = (SELECT auth.uid())
              AND ca.squad_id = sw.squad_id
              AND ca.swimmer_id IS NULL
          )
          OR EXISTS (
            SELECT 1
            FROM public.coach_assignments ca
            WHERE ca.coach_id = (SELECT auth.uid())
              AND ca.swimmer_id = sw.id
          )
        )
    );
$$;

COMMENT ON FUNCTION public.auth_coach_can_view_parent_contact(uuid) IS
  'True when the current coach may view contact info for this primary parent account.';

REVOKE ALL ON FUNCTION public.auth_coach_can_view_parent_contact(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_coach_can_view_parent_contact(uuid) TO authenticated;

CREATE POLICY "Coaches read parent profiles for roster"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.auth_coach_can_view_parent_contact(id));

CREATE POLICY "Coaches read family members for roster parents"
  ON public.family_account_members
  FOR SELECT
  TO authenticated
  USING (public.auth_coach_can_view_parent_contact(primary_parent_id));
