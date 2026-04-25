-- Multiple squads per coach: the old unique_coach_swimmer (coach_id, swimmer_id) with
-- NULLS NOT DISTINCT blocked a second squad row (both have swimmer_id NULL).
-- Reassignment: at most one squad-level coach assignment per squad.

-- 1) Replace over-broad swimmer uniqueness with partial index (actual swimmers only)
ALTER TABLE public.coach_assignments
  DROP CONSTRAINT IF EXISTS unique_coach_swimmer;

CREATE UNIQUE INDEX IF NOT EXISTS unique_coach_swimmer_when_set
  ON public.coach_assignments (coach_id, swimmer_id)
  WHERE swimmer_id IS NOT NULL;

-- 2) Before enforcing one squad-level row per squad: remove duplicates (keep latest activity)
DELETE FROM public.coach_assignments ca
WHERE ca.id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY squad_id
        ORDER BY assigned_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
      ) AS rn
    FROM public.coach_assignments
    WHERE squad_id IS NOT NULL
      AND swimmer_id IS NULL
  ) sub
  WHERE sub.rn > 1
);

-- 3) One head coach per squad (squad-level rows only)
CREATE UNIQUE INDEX IF NOT EXISTS unique_coach_assignments_squad_level_squad_id
  ON public.coach_assignments (squad_id)
  WHERE squad_id IS NOT NULL
    AND swimmer_id IS NULL;

COMMENT ON INDEX public.unique_coach_assignments_squad_level_squad_id IS
  'At most one squad-level assignment row per squad; reassignment replaces this row.';
