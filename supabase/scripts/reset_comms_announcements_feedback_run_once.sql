-- =============================================================================
-- RESET COMMS (announcements + feedback + coach broadcasts) — RUN ONCE
-- =============================================================================
-- Clears Phase 1–2 communications data only. Does NOT touch swimmers, invoices,
-- sessions, or parent/coach/admin accounts.
--
-- Wipes:
--   • club_announcements
--   • parent_feedback
--   • coach_broadcasts
--   • Related in-app notification rows (club_announcement, coach_broadcast,
--     parent_feedback_submitted)
--
-- STEPS:
--   1. Run reset_comms_announcements_feedback_PREVIEW.sql (optional)
--   2. Run this entire file in Supabase SQL Editor
--   3. Check post-check Results grid (expect 0 on all metrics)
--   4. New query: COMMIT;   (or ROLLBACK; to undo)
--   5. Run reset_comms_announcements_feedback_VERIFY.sql
-- =============================================================================

BEGIN;

DO $$ BEGIN RAISE NOTICE '=== Clearing comms-related notifications ==='; END $$;

DELETE FROM public.notifications
WHERE type IN ('club_announcement', 'coach_broadcast');

DELETE FROM public.staff_notifications
WHERE type IN ('club_announcement', 'parent_feedback_submitted', 'coach_broadcast');

DO $$ BEGIN RAISE NOTICE '=== TRUNCATE comms tables ==='; END $$;

TRUNCATE TABLE
  public.parent_feedback,
  public.club_announcements,
  public.coach_broadcasts
RESTART IDENTITY CASCADE;

DO $$
DECLARE
  v_ann bigint;
  v_fb bigint;
  v_bc bigint;
  v_n_club bigint;
  v_n_coach bigint;
  v_s_club bigint;
  v_s_fb bigint;
  v_s_bc bigint;
BEGIN
  SELECT COUNT(*) INTO v_ann FROM public.club_announcements;
  SELECT COUNT(*) INTO v_fb FROM public.parent_feedback;
  SELECT COUNT(*) INTO v_bc FROM public.coach_broadcasts;
  SELECT COUNT(*) INTO v_n_club FROM public.notifications WHERE type = 'club_announcement';
  SELECT COUNT(*) INTO v_n_coach FROM public.notifications WHERE type = 'coach_broadcast';
  SELECT COUNT(*) INTO v_s_club FROM public.staff_notifications WHERE type = 'club_announcement';
  SELECT COUNT(*) INTO v_s_fb FROM public.staff_notifications WHERE type = 'parent_feedback_submitted';
  SELECT COUNT(*) INTO v_s_bc FROM public.staff_notifications WHERE type = 'coach_broadcast';

  RAISE NOTICE '';
  RAISE NOTICE 'POST-CHECK (expect all 0): announcements=% feedback=% broadcasts=%',
    v_ann, v_fb, v_bc;
  RAISE NOTICE '  parent notif club=% coach=% | staff club=% feedback=% coach=%',
    v_n_club, v_n_coach, v_s_club, v_s_fb, v_s_bc;

  IF v_ann > 0 OR v_fb > 0 OR v_bc > 0 OR v_n_club > 0 OR v_n_coach > 0
     OR v_s_club > 0 OR v_s_fb > 0 OR v_s_bc > 0 THEN
    RAISE WARNING 'Unexpected counts — use ROLLBACK; and report output.';
  ELSE
    RAISE NOTICE 'If OK, run COMMIT; in a new query.';
  END IF;
END $$;

SELECT 'post_check' AS section, 'club_announcements' AS metric, COUNT(*)::bigint AS actual, 0::bigint AS expected
FROM public.club_announcements
UNION ALL
SELECT 'post_check', 'parent_feedback', COUNT(*)::bigint, 0 FROM public.parent_feedback
UNION ALL
SELECT 'post_check', 'coach_broadcasts', COUNT(*)::bigint, 0 FROM public.coach_broadcasts
UNION ALL
SELECT 'post_check', 'notifications_club_announcement', COUNT(*)::bigint, 0
FROM public.notifications WHERE type = 'club_announcement'
UNION ALL
SELECT 'post_check', 'notifications_coach_broadcast', COUNT(*)::bigint, 0
FROM public.notifications WHERE type = 'coach_broadcast'
UNION ALL
SELECT 'post_check', 'staff_club_announcement', COUNT(*)::bigint, 0
FROM public.staff_notifications WHERE type = 'club_announcement'
UNION ALL
SELECT 'post_check', 'staff_parent_feedback_submitted', COUNT(*)::bigint, 0
FROM public.staff_notifications WHERE type = 'parent_feedback_submitted'
UNION ALL
SELECT 'post_check', 'staff_coach_broadcast', COUNT(*)::bigint, 0
FROM public.staff_notifications WHERE type = 'coach_broadcast';
