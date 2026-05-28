-- =============================================================================
-- RESET COMMS — STATUS (read-only, run anytime)
-- =============================================================================
-- Quick counts for announcements, feedback, broadcasts, and related notifications.
-- =============================================================================

SELECT 'counts' AS section, 'club_announcements' AS metric, COUNT(*)::bigint AS actual, 0::bigint AS expected
FROM public.club_announcements
UNION ALL
SELECT 'counts', 'parent_feedback', COUNT(*)::bigint, 0 FROM public.parent_feedback
UNION ALL
SELECT 'counts', 'coach_broadcasts', COUNT(*)::bigint, 0 FROM public.coach_broadcasts
UNION ALL
SELECT 'counts', 'notifications_club_announcement', COUNT(*)::bigint, 0
FROM public.notifications WHERE type = 'club_announcement'
UNION ALL
SELECT 'counts', 'notifications_coach_broadcast', COUNT(*)::bigint, 0
FROM public.notifications WHERE type = 'coach_broadcast'
UNION ALL
SELECT 'counts', 'staff_club_announcement', COUNT(*)::bigint, 0
FROM public.staff_notifications WHERE type = 'club_announcement'
UNION ALL
SELECT 'counts', 'staff_parent_feedback_submitted', COUNT(*)::bigint, 0
FROM public.staff_notifications WHERE type = 'parent_feedback_submitted'
UNION ALL
SELECT 'counts', 'staff_coach_broadcast', COUNT(*)::bigint, 0
FROM public.staff_notifications WHERE type = 'coach_broadcast'
ORDER BY metric;
