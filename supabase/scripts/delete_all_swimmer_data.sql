-- =============================================================================
-- DELETE ALL SWIMMER DATA (and related billing / attendance / sessions)
-- =============================================================================
-- WARNING: Irreversible after COMMIT. Use on staging/demo unless you mean it.
--
-- REMOVES:
--   • All swimmers, registrations, consents, performances, notes, rubric ratings
--   • All invoices, payments, receipts, line items
--   • All attendance, training sessions, session squads, pay/delivery records
--   • Parent notifications tied to swimmers; staff notifications rows (full table)
--   • Per-swimmer coach_assignments (squad-level head coach rows are KEPT)
--
-- KEEPS:
--   • profiles (parents, coaches, admins), squads, facilities, pool schedules
--   • Squad head coach_assignments (swimmer_id IS NULL)
--   • auth.users (parent/coach accounts unchanged)
--
-- WHY TRUNCATE: Works in Supabase SQL Editor even when RLS blocks DELETE.
--
-- STEPS:
--   1. Run delete_all_swimmer_data_PREVIEW.sql and review
--   2. Run this file (entire script)
--   3. Confirm post-check counts are 0
--   4. New query: COMMIT;   (or ROLLBACK; to undo)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Option A (default): Full swimmer + billing + sessions wipe
-- ---------------------------------------------------------------------------
TRUNCATE TABLE
  public.meet_registrations,
  public.swimmer_milestone_ratings,
  public.swimmer_attitude_ratings,
  public.swimmer_performances,
  public.coach_notes,
  public.registration_consents,
  public.notifications,
  public.staff_notifications,
  public.family_account_members,
  public.attendance,
  public.training_session_exception_squads,
  public.training_session_exceptions,
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

-- Per-swimmer coach links only (squad head assignments remain)
DELETE FROM public.coach_assignments
WHERE swimmer_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Option B (optional): Swimmers + billing ONLY — keep training sessions
-- Comment out Option A above, uncomment below instead.
-- ---------------------------------------------------------------------------
-- DELETE FROM public.coach_assignments WHERE swimmer_id IS NOT NULL;
-- DELETE FROM public.swimmers;
-- (CASCADE removes consents, performances, notes, rubric ratings, meet regs,
--  invoices → payments/receipts/line items, and attendance for those swimmers.)

-- ---------------------------------------------------------------------------
-- Post-checks (visible in Results grid)
-- ---------------------------------------------------------------------------
SELECT 'post_check' AS section, 'swimmers' AS metric, COUNT(*)::bigint AS actual, 0::bigint AS expected
FROM public.swimmers
UNION ALL
SELECT 'post_check', 'invoices', COUNT(*), 0 FROM public.invoices
UNION ALL
SELECT 'post_check', 'training_sessions', COUNT(*), 0 FROM public.training_sessions
UNION ALL
SELECT 'post_check', 'attendance', COUNT(*), 0 FROM public.attendance
UNION ALL
SELECT 'post_check', 'registration_consents', COUNT(*), 0 FROM public.registration_consents
UNION ALL
SELECT 'post_check', 'coach_assignments_swimmer', COUNT(*), 0
FROM public.coach_assignments WHERE swimmer_id IS NOT NULL;

-- Then run in a separate query:
-- COMMIT;
