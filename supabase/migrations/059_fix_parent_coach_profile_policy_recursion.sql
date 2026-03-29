-- Fix infinite recursion from 058: evaluating profiles RLS queried swimmers under RLS;
-- swimmers policies reference profiles again → recursion.
-- Use SECURITY DEFINER to check coach_notes + swimmers without re-entering profiles RLS.

DROP POLICY IF EXISTS "Parents can view coaches linked via notes on own swimmers" ON public.profiles;

DROP FUNCTION IF EXISTS public.parent_has_coach_note_visible(uuid);

CREATE OR REPLACE FUNCTION public.parent_has_coach_note_visible(p_coach_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coach_notes cn
    INNER JOIN public.swimmers s ON s.id = cn.swimmer_id
    WHERE cn.coach_id = p_coach_id
      AND s.parent_id = (SELECT auth.uid())
      AND cn.is_private = false
  );
$$;

COMMENT ON FUNCTION public.parent_has_coach_note_visible(uuid) IS
  'True when the current user is a parent with a non-private coach_note from this coach on their swimmer. SECURITY DEFINER avoids profiles↔swimmers RLS recursion.';

CREATE POLICY "Parents can view coaches linked via notes on own swimmers"
  ON public.profiles
  FOR SELECT
  USING (
    role = 'coach'
    AND public.parent_has_coach_note_visible(profiles.id)
  );

GRANT EXECUTE ON FUNCTION public.parent_has_coach_note_visible(uuid) TO authenticated;
