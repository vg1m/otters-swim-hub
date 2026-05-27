-- =============================================================================
-- INVESTOR DEMO RESET — Phase A only (transactional wipe)
-- =============================================================================
-- Run when swimmers/sessions/invoices still exist but you need a clean slate
-- before investor_demo_reset_phase_b_squads.sql.
--
-- Flow: BEGIN (this file) → review counts → COMMIT → phase_b_squads → COMMIT
-- Or use investor_demo_reset.sql for A+B+C in one transaction.
-- =============================================================================

BEGIN;

DO $$ BEGIN RAISE NOTICE 'Phase A: truncating transactional data (bypasses RLS)...'; END $$;

-- DELETE can remove 0 rows under RLS in SQL Editor; TRUNCATE is not subject to RLS.
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

DO $$
DECLARE
  v_swimmers bigint;
  v_sessions bigint;
  v_invoices bigint;
BEGIN
  SELECT COUNT(*) INTO v_swimmers FROM public.swimmers;
  SELECT COUNT(*) INTO v_sessions FROM public.training_sessions;
  SELECT COUNT(*) INTO v_invoices FROM public.invoices;
  RAISE NOTICE 'Post Phase A: swimmers=%, sessions=%, invoices=% (all expected 0)', v_swimmers, v_sessions, v_invoices;
  IF v_swimmers > 0 OR v_sessions > 0 OR v_invoices > 0 THEN
    RAISE WARNING 'Counts not zero — review before COMMIT.';
  END IF;
END $$;

-- Next: COMMIT; then run investor_demo_reset_phase_b_squads.sql
