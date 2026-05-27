-- Align profiles.coach_squad_id with squad-level coach_assignments (head coach per squad).

-- Coaches with primary squad on profile but no squad-level assignment row
INSERT INTO public.coach_assignments (coach_id, squad_id, swimmer_id)
SELECT p.id, p.coach_squad_id, NULL
FROM public.profiles p
WHERE p.role = 'coach'
  AND p.coach_squad_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.coach_assignments ca
    WHERE ca.coach_id = p.id
      AND ca.squad_id = p.coach_squad_id
      AND ca.swimmer_id IS NULL
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.coach_assignments ca
    WHERE ca.squad_id = p.coach_squad_id
      AND ca.swimmer_id IS NULL
  );

-- Coaches with squad-level assignment but null coach_squad_id on profile
UPDATE public.profiles p
SET coach_squad_id = ca.squad_id
FROM public.coach_assignments ca
WHERE p.id = ca.coach_id
  AND p.role = 'coach'
  AND p.coach_squad_id IS NULL
  AND ca.squad_id IS NOT NULL
  AND ca.swimmer_id IS NULL;

CREATE OR REPLACE FUNCTION public.get_squad_primary_coach(p_squad_id uuid)
RETURNS TABLE (coach_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT ca.coach_id, p.full_name
  FROM public.coach_assignments ca
  INNER JOIN public.profiles p ON p.id = ca.coach_id
  WHERE ca.squad_id = p_squad_id
    AND ca.swimmer_id IS NULL
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_squad_primary_coach(uuid) IS
  'Head coach for a squad (squad-level coach_assignments row).';

REVOKE EXECUTE ON FUNCTION public.get_squad_primary_coach(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_squad_primary_coach(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_squad_primary_coach(uuid) TO authenticated;
