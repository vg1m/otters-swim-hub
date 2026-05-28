-- =============================================================================
-- RESET COMMS — VERIFY (run after COMMIT on reset script)
-- =============================================================================

WITH checks AS (
  SELECT 'club_announcements' AS check_name,
    (SELECT COUNT(*)::bigint FROM public.club_announcements) AS actual,
    0::bigint AS expected
  UNION ALL
  SELECT 'parent_feedback',
    (SELECT COUNT(*)::bigint FROM public.parent_feedback),
    0
  UNION ALL
  SELECT 'coach_broadcasts',
    (SELECT COUNT(*)::bigint FROM public.coach_broadcasts),
    0
  UNION ALL
  SELECT 'notifications_club_announcement',
    (SELECT COUNT(*)::bigint FROM public.notifications WHERE type = 'club_announcement'),
    0
  UNION ALL
  SELECT 'notifications_coach_broadcast',
    (SELECT COUNT(*)::bigint FROM public.notifications WHERE type = 'coach_broadcast'),
    0
  UNION ALL
  SELECT 'staff_club_announcement',
    (SELECT COUNT(*)::bigint FROM public.staff_notifications WHERE type = 'club_announcement'),
    0
  UNION ALL
  SELECT 'staff_parent_feedback_submitted',
    (SELECT COUNT(*)::bigint FROM public.staff_notifications WHERE type = 'parent_feedback_submitted'),
    0
  UNION ALL
  SELECT 'staff_coach_broadcast',
    (SELECT COUNT(*)::bigint FROM public.staff_notifications WHERE type = 'coach_broadcast'),
    0
)
SELECT
  check_name,
  actual,
  expected,
  CASE WHEN actual = expected THEN 'PASS' ELSE 'FAIL' END AS result
FROM checks
ORDER BY check_name;
