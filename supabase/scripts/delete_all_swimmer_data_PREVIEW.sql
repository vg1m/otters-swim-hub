-- =============================================================================
-- DELETE ALL SWIMMER DATA — PREVIEW ONLY (no changes)
-- =============================================================================
-- Run before delete_all_swimmer_data.sql. Review counts, then run the delete script.
-- =============================================================================

SELECT 'swimmers' AS metric, COUNT(*)::bigint AS row_count FROM public.swimmers
UNION ALL SELECT 'registration_consents', COUNT(*) FROM public.registration_consents
UNION ALL SELECT 'meet_registrations', COUNT(*) FROM public.meet_registrations
UNION ALL SELECT 'swimmer_milestone_ratings', COUNT(*) FROM public.swimmer_milestone_ratings
UNION ALL SELECT 'swimmer_attitude_ratings', COUNT(*) FROM public.swimmer_attitude_ratings
UNION ALL SELECT 'swimmer_performances', COUNT(*) FROM public.swimmer_performances
UNION ALL SELECT 'coach_notes', COUNT(*) FROM public.coach_notes
UNION ALL SELECT 'coach_assignments (per-swimmer)', COUNT(*) FROM public.coach_assignments WHERE swimmer_id IS NOT NULL
UNION ALL SELECT 'attendance', COUNT(*) FROM public.attendance
UNION ALL SELECT 'invoices', COUNT(*) FROM public.invoices
UNION ALL SELECT 'payments', COUNT(*) FROM public.payments
UNION ALL SELECT 'receipts', COUNT(*) FROM public.receipts
UNION ALL SELECT 'notifications (parent)', COUNT(*) FROM public.notifications WHERE swimmer_id IS NOT NULL
UNION ALL SELECT 'staff_notifications (swimmer)', COUNT(*) FROM public.staff_notifications WHERE swimmer_id IS NOT NULL
UNION ALL SELECT 'training_sessions', COUNT(*) FROM public.training_sessions
UNION ALL SELECT 'training_session_exceptions', COUNT(*) FROM public.training_session_exceptions
ORDER BY metric;

-- Sample swimmers (up to 20)
SELECT id, first_name, last_name, status, squad_id, parent_id, coach_id, created_at
FROM public.swimmers
ORDER BY created_at DESC
LIMIT 20;

-- KEPT (not removed by default delete script):
SELECT 'profiles (parents/coaches/admins)' AS kept, COUNT(*)::bigint FROM public.profiles
UNION ALL SELECT 'squads', COUNT(*) FROM public.squads
UNION ALL SELECT 'facilities', COUNT(*) FROM public.facilities
UNION ALL SELECT 'coach_assignments (squad head)', COUNT(*) FROM public.coach_assignments WHERE swimmer_id IS NULL;
