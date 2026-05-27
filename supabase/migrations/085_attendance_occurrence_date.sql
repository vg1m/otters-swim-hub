-- Scope attendance to a specific calendar date for recurring session series.

ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS occurrence_date DATE;

COMMENT ON COLUMN public.attendance.occurrence_date IS
  'Calendar date for this check-in. NULL for one-off sessions; required for recurring series occurrences.';

-- Drop old unique constraint (session_id, swimmer_id only)
ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_session_id_swimmer_id_key;

-- One check-in per swimmer per session per occurrence date (NULL dates treated as one bucket)
CREATE UNIQUE INDEX IF NOT EXISTS attendance_session_swimmer_occurrence_unique
  ON public.attendance (session_id, swimmer_id, COALESCE(occurrence_date, '1970-01-01'::date));

CREATE INDEX IF NOT EXISTS idx_attendance_occurrence_date
  ON public.attendance (session_id, occurrence_date)
  WHERE occurrence_date IS NOT NULL;

-- Best-effort backfill: recurring sessions get anchor date; one-offs stay NULL
UPDATE public.attendance a
SET occurrence_date = ts.session_date
FROM public.training_sessions ts
WHERE a.session_id = ts.id
  AND ts.is_recurring = true
  AND a.occurrence_date IS NULL;
