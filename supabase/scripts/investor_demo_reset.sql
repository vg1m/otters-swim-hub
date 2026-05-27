-- =============================================================================
-- INVESTOR DEMO RESET — DESTRUCTIVE (transactional)
-- =============================================================================
-- Scope (client-approved):
--   KEEP: pathway squads (pups, dev1–dev3, bronze, silver, gold) + their rubric
--         seed data; facilities; facility_schedules; meets catalog; other auth users
--   DELETE: all swimmers, sessions, invoices/payments, custom squads, custom
--         rubric slugs; ngonyo.gatahi@gmail.com; coachotters@gmail.com
--
-- HOW TO RUN:
--   1. Backup / confirm PITR on Supabase
--   2. Run investor_demo_reset_PREVIEW.sql and review output
--   3. Run THIS script (starts BEGIN, does NOT auto-commit)
--   4. Review post-check notices at the end
--   5. If correct: run COMMIT;  If wrong: run ROLLBACK;
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Phase A — Transactional data
-- -----------------------------------------------------------------------------
DO $$ BEGIN RAISE NOTICE 'Phase A: transactional data...'; END $$;

DELETE FROM public.meet_registrations;

DELETE FROM public.training_sessions;
-- Cascades: attendance, training_session_squads, coach_session_pay_events,
-- coach_session_delivery_reviews (when present)

DELETE FROM public.swimmer_milestone_ratings;
DELETE FROM public.swimmer_attitude_ratings;
DELETE FROM public.swimmer_performances;
DELETE FROM public.coach_notes;

DELETE FROM public.coach_assignments;

DELETE FROM public.registration_consents;

DELETE FROM public.notifications;
DELETE FROM public.staff_notifications;

DELETE FROM public.family_account_members;

DELETE FROM public.swimmers;

DELETE FROM public.invoices;
-- Cascades: invoice_line_items, payments, receipts (when linked)

-- Orphans (belt-and-suspenders if any FK paths left rows)
DELETE FROM public.receipts WHERE NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = receipts.invoice_id);
DELETE FROM public.payments WHERE NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = payments.invoice_id);
DELETE FROM public.invoice_line_items WHERE NOT EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_line_items.invoice_id);

DO $$ BEGIN RAISE NOTICE 'Phase A complete.'; END $$;

-- -----------------------------------------------------------------------------
-- Phase B — Custom squads + orphan rubric data
-- -----------------------------------------------------------------------------
DO $$ BEGIN RAISE NOTICE 'Phase B: custom squads and rubric slugs...'; END $$;

DELETE FROM public.rubric_domains
WHERE squad_slug NOT IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold');

DELETE FROM public.squads
WHERE slug NOT IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold');

DO $$ BEGIN RAISE NOTICE 'Phase B complete.'; END $$;

-- -----------------------------------------------------------------------------
-- Phase C — Remove two accounts (sessions must already be gone)
-- -----------------------------------------------------------------------------
DO $$ BEGIN RAISE NOTICE 'Phase C: remove ngonyo + coachotters auth users...'; END $$;

DELETE FROM auth.users
WHERE lower(email) IN ('ngonyo.gatahi@gmail.com', 'coachotters@gmail.com');

-- Stray profiles if auth delete was partial (Dashboard manual delete fallback)
DELETE FROM public.profiles
WHERE lower(email) IN ('ngonyo.gatahi@gmail.com', 'coachotters@gmail.com');

DO $$ BEGIN RAISE NOTICE 'Phase C complete.'; END $$;

-- -----------------------------------------------------------------------------
-- Phase D — Post-checks (must pass before COMMIT)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  rec record;
  v_swimmers bigint;
  v_sessions bigint;
  v_invoices bigint;
  v_squads bigint;
  v_ngonyo_auth bigint;
  v_coach_auth bigint;
  v_bad_rubric bigint;
  v_custom_squads bigint;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'INVESTOR DEMO RESET — POST-CHECKS (inside transaction)';
  RAISE NOTICE '============================================================';

  SELECT COUNT(*) INTO v_swimmers FROM public.swimmers;
  SELECT COUNT(*) INTO v_sessions FROM public.training_sessions;
  SELECT COUNT(*) INTO v_invoices FROM public.invoices;
  SELECT COUNT(*) INTO v_squads FROM public.squads;
  SELECT COUNT(*) INTO v_ngonyo_auth FROM auth.users WHERE lower(email) = 'ngonyo.gatahi@gmail.com';
  SELECT COUNT(*) INTO v_coach_auth FROM auth.users WHERE lower(email) = 'coachotters@gmail.com';
  SELECT COUNT(*) INTO v_bad_rubric FROM public.rubric_domains
    WHERE squad_slug NOT IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold');
  SELECT COUNT(*) INTO v_custom_squads FROM public.squads
    WHERE slug NOT IN ('pups', 'dev1', 'dev2', 'dev3', 'bronze', 'silver', 'gold');

  RAISE NOTICE 'swimmers: % (expected 0)', v_swimmers;
  RAISE NOTICE 'training_sessions: % (expected 0)', v_sessions;
  RAISE NOTICE 'invoices: % (expected 0)', v_invoices;
  RAISE NOTICE 'squads: % (expected 7)', v_squads;
  RAISE NOTICE 'ngonyo in auth.users: % (expected 0)', v_ngonyo_auth;
  RAISE NOTICE 'coachotters in auth.users: % (expected 0)', v_coach_auth;
  RAISE NOTICE 'non-pathway rubric_domains: % (expected 0)', v_bad_rubric;
  RAISE NOTICE 'non-pathway squads: % (expected 0)', v_custom_squads;
  RAISE NOTICE '';
  RAISE NOTICE 'Pathway squads remaining:';
  FOR rec IN
    SELECT slug, name FROM public.squads ORDER BY sort_order, name
  LOOP
    RAISE NOTICE '  - % (%)', rec.slug, rec.name;
  END LOOP;
  RAISE NOTICE '';
  RAISE NOTICE 'If all expectations match, run: COMMIT;';
  RAISE NOTICE 'Otherwise run: ROLLBACK;';
  RAISE NOTICE '============================================================';
END $$;

-- Do NOT commit automatically. Run COMMIT; or ROLLBACK; in a follow-up statement.
