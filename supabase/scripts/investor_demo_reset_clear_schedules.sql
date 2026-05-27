-- =============================================================================
-- Clear pool schedules (facility_schedules + squad links)
-- =============================================================================
-- Keeps facilities (pool/venue records). Removes recurring weekly schedule slots.
-- Run → check Results → COMMIT;
-- =============================================================================

BEGIN;

TRUNCATE TABLE
  public.facility_schedule_squads,
  public.facility_schedules
RESTART IDENTITY CASCADE;

SELECT COUNT(*) AS facility_schedules_remaining FROM public.facility_schedules;
SELECT COUNT(*) AS facility_schedule_squads_remaining FROM public.facility_schedule_squads;
SELECT COUNT(*) AS facilities_kept FROM public.facilities;

-- Expected: schedules=0, schedule_squads=0, facilities unchanged (e.g. 4)
-- Then run: COMMIT;
