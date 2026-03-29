-- Allow parents to read coach profile rows only when needed for coach_notes UI embeds:
-- coach must have at least one non-private note on a swimmer belonging to the parent.
-- Does not grant access to coaches who only have private notes (parent cannot see those notes).

DROP POLICY IF EXISTS "Parents can view coaches linked via notes on own swimmers" ON public.profiles;

CREATE POLICY "Parents can view coaches linked via notes on own swimmers"
  ON public.profiles
  FOR SELECT
  USING (
    role = 'coach'
    AND EXISTS (
      SELECT 1
      FROM public.coach_notes cn
      INNER JOIN public.swimmers s ON s.id = cn.swimmer_id
      WHERE cn.coach_id = profiles.id
        AND s.parent_id = (SELECT auth.uid())
        AND cn.is_private = false
    )
  );

COMMENT ON POLICY "Parents can view coaches linked via notes on own swimmers" ON public.profiles IS
  'Parents can SELECT coach profiles for coaches who have non-private notes on their swimmers (PostgREST embed on coach_notes).';
