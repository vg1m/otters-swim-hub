-- =============================================================================
-- INVESTOR DEMO RESET — FINALIZE (data wipe + 7 pathway squads only)
-- =============================================================================
-- Run when you still have swimmers/sessions OR 21 squads (elite, pups_akhs, etc.).
-- Single transaction: TRUNCATE transactional tables, delete non-pathway squads.
--
-- 1. Run this entire file
-- 2. Check Results (three tables below)
-- 3. New query: COMMIT;
-- =============================================================================

BEGIN;

-- A) Wipe swimmers, sessions, invoices, notifications, etc.
TRUNCATE TABLE
  public.meet_registrations,
  public.swimmer_milestone_ratings,
  public.swimmer_attitude_ratings,
  public.swimmer_performances,
  public.coach_notes,
  public.coach_assignments,
  public.registration_consents,
  public.notifications,
  public.staff_notifications,
  public.family_account_members,
  public.attendance,
  public.training_session_squads,
  public.coach_session_pay_events,
  public.coach_session_delivery_reviews,
  public.training_sessions,
  public.swimmers,
  public.receipts,
  public.payments,
  public.invoice_line_items,
  public.invoices
RESTART IDENTITY CASCADE;

-- B) Clear pool schedules (keeps facilities rows)
TRUNCATE TABLE
  public.facility_schedule_squads,
  public.facility_schedules
RESTART IDENTITY CASCADE;

-- C) Keep only pathway rubric squads
DELETE FROM public.rubric_domains
WHERE squad_slug NOT IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold');

DELETE FROM public.squads
WHERE slug NOT IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold');

-- D) Remove demo accounts (skip if already gone)
DELETE FROM auth.users
WHERE lower(email) IN ('ngonyo.gatahi@gmail.com', 'coachotters@gmail.com');

DELETE FROM public.profiles
WHERE lower(email) IN ('ngonyo.gatahi@gmail.com', 'coachotters@gmail.com');

-- --- Results (visible in Supabase grid) ---
SELECT 'counts' AS section, 'swimmers' AS metric, COUNT(*)::bigint AS actual
FROM public.swimmers
UNION ALL
SELECT 'counts', 'training_sessions', COUNT(*)::bigint FROM public.training_sessions
UNION ALL
SELECT 'counts', 'invoices', COUNT(*)::bigint FROM public.invoices
UNION ALL
SELECT 'counts', 'squads', COUNT(*)::bigint FROM public.squads
UNION ALL
SELECT 'counts', 'custom_squads', COUNT(*)::bigint
FROM public.squads
WHERE slug NOT IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold')
UNION ALL
SELECT 'counts', 'facility_schedules', COUNT(*)::bigint FROM public.facility_schedules
UNION ALL
SELECT 'counts', 'facility_schedule_squads', COUNT(*)::bigint FROM public.facility_schedule_squads;

SELECT slug, name, sort_order
FROM public.squads
ORDER BY sort_order, name;

-- Expected counts: swimmers=0, sessions=0, invoices=0, squads=7, custom_squads=0,
--   facility_schedules=0, facility_schedule_squads=0 (facilities rows remain)
-- Expected squads: pups, dev1, dev2, dev3, bronze, silver, gold only
-- Then run: COMMIT;
