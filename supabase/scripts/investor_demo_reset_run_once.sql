-- =============================================================================
-- INVESTOR DEMO RESET — RUN ONCE (A + B + C in one transaction)
-- =============================================================================
-- Use this if phased scripts left swimmers/squads behind (often RLS blocks DELETE
-- in SQL Editor; TRUNCATE is not subject to RLS).
--
-- 1. Run this entire file in Supabase SQL Editor
-- 2. Read post-check notices
-- 3. New query: COMMIT;   (or ROLLBACK; to undo)
-- =============================================================================

BEGIN;

DO $$ BEGIN RAISE NOTICE '=== Phase A: TRUNCATE transactional tables ==='; END $$;

-- Order: children first; CASCADE handles remaining FKs. TRUNCATE bypasses RLS.
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

DO $$ BEGIN RAISE NOTICE '=== Phase B: pool schedules ==='; END $$;

TRUNCATE TABLE
  public.facility_schedule_squads,
  public.facility_schedules
RESTART IDENTITY CASCADE;

DO $$ BEGIN RAISE NOTICE '=== Phase C: custom squads + rubric slugs ==='; END $$;

DELETE FROM public.rubric_domains
WHERE squad_slug NOT IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold');

DELETE FROM public.squads
WHERE slug NOT IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold');

DO $$ BEGIN RAISE NOTICE '=== Phase D: remove ngonyo + coachotters ==='; END $$;

DELETE FROM auth.users
WHERE lower(email) IN ('ngonyo.gatahi@gmail.com', 'coachotters@gmail.com');

DELETE FROM public.profiles
WHERE lower(email) IN ('ngonyo.gatahi@gmail.com', 'coachotters@gmail.com');

DO $$
DECLARE
  rec record;
  v_swimmers bigint;
  v_sessions bigint;
  v_invoices bigint;
  v_squads bigint;
BEGIN
  SELECT COUNT(*) INTO v_swimmers FROM public.swimmers;
  SELECT COUNT(*) INTO v_sessions FROM public.training_sessions;
  SELECT COUNT(*) INTO v_invoices FROM public.invoices;
  SELECT COUNT(*) INTO v_squads FROM public.squads;

  RAISE NOTICE '';
  RAISE NOTICE 'POST-CHECK: swimmers=% sessions=% invoices=% squads=% (expect 0,0,0,7)',
    v_swimmers, v_sessions, v_invoices, v_squads;

  IF v_swimmers > 0 OR v_sessions > 0 OR v_invoices > 0 OR v_squads <> 7 THEN
    RAISE WARNING 'Unexpected counts — use ROLLBACK; and report output.';
  END IF;

  RAISE NOTICE 'Squads remaining:';
  FOR rec IN SELECT slug, name FROM public.squads ORDER BY sort_order, name LOOP
    RAISE NOTICE '  - % (%)', rec.slug, rec.name;
  END LOOP;
  RAISE NOTICE '';
  RAISE NOTICE 'If OK, run COMMIT; in a new query.';
END $$;

-- Visible in Results tab (Supabase often hides RAISE NOTICE messages)
SELECT 'post_check' AS section, 'swimmers' AS metric, COUNT(*)::bigint AS value, 0::bigint AS expected
FROM public.swimmers
UNION ALL
SELECT 'post_check', 'training_sessions', COUNT(*)::bigint, 0 FROM public.training_sessions
UNION ALL
SELECT 'post_check', 'invoices', COUNT(*)::bigint, 0 FROM public.invoices
UNION ALL
SELECT 'post_check', 'squads', COUNT(*)::bigint, 7 FROM public.squads
UNION ALL
SELECT 'post_check', 'ngonyo_auth', COUNT(*)::bigint, 0
FROM auth.users WHERE lower(email) = 'ngonyo.gatahi@gmail.com'
UNION ALL
SELECT 'post_check', 'coachotters_auth', COUNT(*)::bigint, 0
FROM auth.users WHERE lower(email) = 'coachotters@gmail.com'
UNION ALL
SELECT 'post_check', 'facility_schedules', COUNT(*)::bigint, 0 FROM public.facility_schedules
UNION ALL
SELECT 'post_check', 'facility_schedule_squads', COUNT(*)::bigint, 0 FROM public.facility_schedule_squads;

SELECT slug, name, sort_order
FROM public.squads
ORDER BY sort_order, name;
