-- =============================================================================
-- Purge ALL training sessions (safe scope: sessions + session-linked rows only)
-- =============================================================================
-- What gets removed:
--   - public.training_sessions (every row)
--   - public.attendance (FK → training_sessions, ON DELETE CASCADE)
--   - public.training_session_squads (FK → training_sessions, ON DELETE CASCADE)
--   - public.coach_session_pay_events (FK → training_sessions, ON DELETE CASCADE)
--
-- What is NOT touched:
--   swimmers, squads, facilities, profiles, invoices, payments, registrations, etc.
--
-- How to run (Supabase SQL Editor or psql):
--   1. Run the PREVIEW block only first and confirm counts.
--   2. Run the TRANSACTION block; use ROLLBACK instead of COMMIT if anything looks wrong.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1 — PREVIEW (read-only). Run this first.
-- -----------------------------------------------------------------------------
SELECT 'training_sessions' AS table_name, COUNT(*)::bigint AS row_count
FROM public.training_sessions
UNION ALL
SELECT 'attendance', COUNT(*)::bigint FROM public.attendance
UNION ALL
SELECT 'training_session_squads', COUNT(*)::bigint FROM public.training_session_squads
UNION ALL
SELECT 'coach_session_pay_events', COUNT(*)::bigint FROM public.coach_session_pay_events
ORDER BY table_name;

-- -----------------------------------------------------------------------------
-- STEP 2 — PURGE (wrapped in a transaction you can roll back)
-- -----------------------------------------------------------------------------
BEGIN;

DELETE FROM public.training_sessions;
-- Cascades remove dependent rows in attendance, training_session_squads,
-- coach_session_pay_events automatically.

-- Post-check (should all be 0)
SELECT 'training_sessions' AS table_name, COUNT(*)::bigint AS row_count
FROM public.training_sessions
UNION ALL
SELECT 'attendance', COUNT(*)::bigint FROM public.attendance
UNION ALL
SELECT 'training_session_squads', COUNT(*)::bigint FROM public.training_session_squads
UNION ALL
SELECT 'coach_session_pay_events', COUNT(*)::bigint FROM public.coach_session_pay_events
ORDER BY table_name;

-- All row_count values above should be 0. If anything is non-zero, run ROLLBACK; instead.
COMMIT;

-- Alternative if your SQL client does not keep a transaction open across statements:
-- Run only (after preview):  DELETE FROM public.training_sessions;
-- That cannot be undone; CASCADE still cleans child tables.
