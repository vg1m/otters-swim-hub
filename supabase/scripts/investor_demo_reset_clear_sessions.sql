-- =============================================================================
-- Clear ALL training sessions (11 left after reset — use TRUNCATE, not DELETE)
-- =============================================================================
-- Does not touch swimmers, squads, or invoices.
-- Run whole file → check Results → COMMIT; in next query
-- =============================================================================

BEGIN;

TRUNCATE TABLE
  public.attendance,
  public.training_session_squads,
  public.coach_session_pay_events,
  public.coach_session_delivery_reviews,
  public.training_sessions
RESTART IDENTITY CASCADE;

SELECT COUNT(*) AS training_sessions_remaining FROM public.training_sessions;

-- Expected: 0. Then run: COMMIT;
