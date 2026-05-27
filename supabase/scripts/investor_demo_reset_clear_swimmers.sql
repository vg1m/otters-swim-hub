-- =============================================================================
-- Clear ALL swimmers + billing/registration data (TRUNCATE — bypasses RLS)
-- =============================================================================
-- Use when swimmers count is still > 0 after run_once. Does not delete squads.
-- Run whole file → Results should show 0 → COMMIT; in next query
-- =============================================================================

BEGIN;

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

SELECT COUNT(*) AS swimmers_remaining FROM public.swimmers;
SELECT COUNT(*) AS sessions_remaining FROM public.training_sessions;
SELECT COUNT(*) AS invoices_remaining FROM public.invoices;

-- Expected: all 0. Then run: COMMIT;
