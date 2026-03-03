-- Migration: Add recurring session support to training_sessions table
-- Allows marking sessions as recurring with patterns (daily, weekly, biweekly, monthly)

-- Add recurring fields to training_sessions
ALTER TABLE training_sessions
ADD COLUMN is_recurring BOOLEAN DEFAULT false,
ADD COLUMN recurrence_pattern TEXT CHECK (recurrence_pattern IN ('daily', 'weekly', 'biweekly', 'monthly')),
ADD COLUMN recurrence_end_date DATE;

-- Create index for querying recurring sessions efficiently
CREATE INDEX idx_training_sessions_recurring ON training_sessions(is_recurring, recurrence_pattern) 
WHERE is_recurring = true;

-- Add comments for documentation
COMMENT ON COLUMN training_sessions.is_recurring IS 'Whether this session repeats on a schedule';
COMMENT ON COLUMN training_sessions.recurrence_pattern IS 'How often the session repeats: daily, weekly, biweekly, or monthly';
COMMENT ON COLUMN training_sessions.recurrence_end_date IS 'When to stop generating recurring sessions (NULL = indefinite)';

-- Verification
DO $$
DECLARE
  v_total_sessions INTEGER;
  v_recurring_sessions INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_sessions FROM training_sessions;
  SELECT COUNT(*) INTO v_recurring_sessions FROM training_sessions WHERE is_recurring = true;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RECURRING SESSIONS MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistics:';
  RAISE NOTICE '   - Total training sessions: %', v_total_sessions;
  RAISE NOTICE '   - Recurring sessions: %', v_recurring_sessions;
  RAISE NOTICE '';
  RAISE NOTICE '✅ New columns added:';
  RAISE NOTICE '   - is_recurring (BOOLEAN, default false)';
  RAISE NOTICE '   - recurrence_pattern (daily, weekly, biweekly, monthly)';
  RAISE NOTICE '   - recurrence_end_date (DATE, nullable)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '   - Update admin UI to add recurring toggle';
  RAISE NOTICE '   - Display recurring badge on parent dashboard';
  RAISE NOTICE '';
END $$;

-- Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'training_sessions'
  AND column_name IN ('is_recurring', 'recurrence_pattern', 'recurrence_end_date')
ORDER BY ordinal_position;
