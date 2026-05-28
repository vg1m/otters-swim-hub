-- =============================================================================
-- RESET COMMS (announcements + feedback + coach broadcasts) — PREVIEW ONLY
-- =============================================================================
-- Run before reset_comms_announcements_feedback_run_once.sql.
-- No deletes. Review counts and samples, then run the reset script.
-- =============================================================================

SELECT '=== ROW COUNTS (will be wiped) ===' AS section;

SELECT 'club_announcements' AS table_name, COUNT(*)::bigint AS row_count
FROM public.club_announcements
UNION ALL
SELECT 'parent_feedback', COUNT(*)::bigint FROM public.parent_feedback
UNION ALL
SELECT 'coach_broadcasts', COUNT(*)::bigint FROM public.coach_broadcasts
UNION ALL
SELECT 'notifications (club_announcement)', COUNT(*)::bigint
FROM public.notifications WHERE type = 'club_announcement'
UNION ALL
SELECT 'notifications (coach_broadcast)', COUNT(*)::bigint
FROM public.notifications WHERE type = 'coach_broadcast'
UNION ALL
SELECT 'staff_notifications (club_announcement)', COUNT(*)::bigint
FROM public.staff_notifications WHERE type = 'club_announcement'
UNION ALL
SELECT 'staff_notifications (parent_feedback_submitted)', COUNT(*)::bigint
FROM public.staff_notifications WHERE type = 'parent_feedback_submitted'
UNION ALL
SELECT 'staff_notifications (coach_broadcast)', COUNT(*)::bigint
FROM public.staff_notifications WHERE type = 'coach_broadcast'
ORDER BY table_name;

SELECT '=== RECENT CLUB ANNOUNCEMENTS (up to 10) ===' AS section;

SELECT id, title, published_at, author_id
FROM public.club_announcements
ORDER BY published_at DESC
LIMIT 10;

SELECT '=== RECENT PARENT FEEDBACK (up to 10) ===' AS section;

SELECT id, subject, status, parent_id, submitted_by, created_at, responded_at
FROM public.parent_feedback
ORDER BY created_at DESC
LIMIT 10;

SELECT '=== RECENT COACH BROADCASTS (up to 10) ===' AS section;

SELECT id, audience, title, coach_id, published_at
FROM public.coach_broadcasts
ORDER BY published_at DESC
LIMIT 10;

SELECT '=== KEPT (not removed by this reset) ===' AS section;

SELECT 'profiles' AS table_name, COUNT(*)::bigint AS row_count FROM public.profiles
UNION ALL SELECT 'swimmers', COUNT(*) FROM public.swimmers
UNION ALL SELECT 'invoices', COUNT(*) FROM public.invoices
UNION ALL SELECT 'notifications (other types)', COUNT(*)
FROM public.notifications
WHERE type IS NULL OR type NOT IN ('club_announcement', 'coach_broadcast')
UNION ALL SELECT 'staff_notifications (other types)', COUNT(*)
FROM public.staff_notifications
WHERE type IS NULL OR type NOT IN ('club_announcement', 'parent_feedback_submitted', 'coach_broadcast')
ORDER BY table_name;
