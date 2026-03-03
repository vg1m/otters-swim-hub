-- ============================================================
-- Migration: Enhanced Recurrence Patterns with JSONB
-- ============================================================
-- Changes recurrence_pattern from TEXT to JSONB to support
-- advanced recurrence options like Google Calendar/Outlook
-- ============================================================

-- Step 1: Drop existing CHECK constraint
ALTER TABLE training_sessions
DROP CONSTRAINT IF EXISTS training_sessions_recurrence_pattern_check;

-- Step 2: Create temporary column for migration
ALTER TABLE training_sessions
ADD COLUMN recurrence_pattern_new JSONB;

-- Step 3: Migrate existing TEXT patterns to JSON format
UPDATE training_sessions
SET recurrence_pattern_new = 
  CASE 
    WHEN recurrence_pattern = 'daily' THEN '{"type": "daily"}'::jsonb
    WHEN recurrence_pattern = 'weekly' THEN '{"type": "weekly"}'::jsonb
    WHEN recurrence_pattern = 'biweekly' THEN '{"type": "biweekly"}'::jsonb
    WHEN recurrence_pattern = 'monthly' THEN '{"type": "monthly"}'::jsonb
    WHEN recurrence_pattern IS NULL THEN NULL
    ELSE '{"type": "weekly"}'::jsonb  -- Default fallback
  END
WHERE is_recurring = true;

-- Step 4: Drop old column and rename new one
ALTER TABLE training_sessions
DROP COLUMN recurrence_pattern;

ALTER TABLE training_sessions
RENAME COLUMN recurrence_pattern_new TO recurrence_pattern;

-- Step 5: Add comment for documentation
COMMENT ON COLUMN training_sessions.recurrence_pattern IS 
'JSONB structure for recurrence patterns. Supported types:
- Simple: {"type": "daily|weekly|biweekly|monthly"}
- Weekly on day: {"type": "weekly_on_day", "weekday": 0-6}
- Monthly on week/day: {"type": "monthly_on_week_day", "weekday": 0-6, "ordinal": 1-5}
- Monthly first/last: {"type": "monthly_on_first_last", "day_type": "first|last"}
- Annually: {"type": "annually", "date": "MM-DD"}
- Custom: {"type": "custom", "interval": 1-99, "unit": "day|week|month|year", "weekdays": [0-6]}';

-- Step 6: Update index to work with JSONB
DROP INDEX IF EXISTS idx_training_sessions_recurring;

CREATE INDEX idx_training_sessions_recurring 
ON training_sessions(is_recurring, (recurrence_pattern->>'type')) 
WHERE is_recurring = true;

-- Verification
DO $$
DECLARE
  v_sessions_count INTEGER;
  v_recurring_count INTEGER;
  v_pattern_types TEXT;
BEGIN
  SELECT COUNT(*) INTO v_sessions_count FROM training_sessions;
  SELECT COUNT(*) INTO v_recurring_count FROM training_sessions WHERE is_recurring = true;
  
  SELECT string_agg(DISTINCT recurrence_pattern->>'type', ', ') INTO v_pattern_types
  FROM training_sessions
  WHERE recurrence_pattern IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ENHANCED RECURRENCE MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistics:';
  RAISE NOTICE '   - Total sessions: %', v_sessions_count;
  RAISE NOTICE '   - Recurring sessions: %', v_recurring_count;
  RAISE NOTICE '   - Pattern types in use: %', COALESCE(v_pattern_types, 'none');
  RAISE NOTICE '';
  RAISE NOTICE '✅ Changes Applied:';
  RAISE NOTICE '   - recurrence_pattern: TEXT → JSONB';
  RAISE NOTICE '   - Existing patterns converted to JSON';
  RAISE NOTICE '   - Index updated for JSONB queries';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 New Pattern Types Supported:';
  RAISE NOTICE '   - Simple: daily, weekly, biweekly, monthly';
  RAISE NOTICE '   - Weekly on specific day';
  RAISE NOTICE '   - Monthly on Nth weekday';
  RAISE NOTICE '   - Monthly on first/last day';
  RAISE NOTICE '   - Annually on specific date';
  RAISE NOTICE '   - Custom with interval and weekday selection';
  RAISE NOTICE '';
END $$;
