-- Migration: Coach assignment system (hybrid: squad + individual swimmers)
-- Allows coaches to be assigned to entire squads OR individual swimmers

-- Coach-Swimmer assignment table
CREATE TABLE coach_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  squad TEXT CHECK (squad IN ('competitive', 'learn_to_swim', 'fitness')),
  swimmer_id UUID REFERENCES swimmers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure assignment is either squad OR swimmer, not both
  CONSTRAINT coach_squad_or_swimmer CHECK (
    (squad IS NOT NULL AND swimmer_id IS NULL) OR 
    (squad IS NULL AND swimmer_id IS NOT NULL)
  ),
  -- Prevent duplicate assignments
  CONSTRAINT unique_coach_squad UNIQUE NULLS NOT DISTINCT (coach_id, squad),
  CONSTRAINT unique_coach_swimmer UNIQUE NULLS NOT DISTINCT (coach_id, swimmer_id)
);

-- Indexes for performance
CREATE INDEX idx_coach_assignments_coach ON coach_assignments(coach_id);
CREATE INDEX idx_coach_assignments_squad ON coach_assignments(squad) WHERE squad IS NOT NULL;
CREATE INDEX idx_coach_assignments_swimmer ON coach_assignments(swimmer_id) WHERE swimmer_id IS NOT NULL;

-- RLS Policies
ALTER TABLE coach_assignments ENABLE ROW LEVEL SECURITY;

-- Coaches can view their own assignments
CREATE POLICY "Coaches can view own assignments" ON coach_assignments
  FOR SELECT USING (coach_id = (SELECT auth.uid()));

-- Admins can manage all assignments
CREATE POLICY "Admins can manage assignments" ON coach_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Update swimmers RLS to allow coaches to view assigned swimmers
DROP POLICY IF EXISTS "Coaches can view assigned swimmers" ON swimmers;
CREATE POLICY "Coaches can view assigned swimmers" ON swimmers
  FOR SELECT USING (
    -- Direct assignment via coach_id
    coach_id = (SELECT auth.uid()) 
    OR
    -- Squad assignment via coach_assignments
    id IN (
      SELECT swimmer_id FROM coach_assignments 
      WHERE coach_id = (SELECT auth.uid()) AND swimmer_id IS NOT NULL
    )
    OR
    -- Squad-level assignment
    squad IN (
      SELECT ca.squad FROM coach_assignments ca
      WHERE ca.coach_id = (SELECT auth.uid()) AND ca.squad IS NOT NULL
    )
  );

-- Add comments for documentation
COMMENT ON TABLE coach_assignments IS 'Hybrid coach assignment: coaches can be assigned to entire squads OR individual swimmers';
COMMENT ON COLUMN coach_assignments.squad IS 'Squad assignment (competitive, learn_to_swim, fitness) - mutually exclusive with swimmer_id';
COMMENT ON COLUMN coach_assignments.swimmer_id IS 'Individual swimmer assignment - mutually exclusive with squad';
COMMENT ON COLUMN coach_assignments.notes IS 'Optional notes about this assignment (e.g., temporary, coverage, specialization)';

-- Verification
DO $$
DECLARE
  v_total_assignments INTEGER;
  v_squad_assignments INTEGER;
  v_swimmer_assignments INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_assignments FROM coach_assignments;
  SELECT COUNT(*) INTO v_squad_assignments FROM coach_assignments WHERE squad IS NOT NULL;
  SELECT COUNT(*) INTO v_swimmer_assignments FROM coach_assignments WHERE swimmer_id IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ COACH ASSIGNMENTS SYSTEM COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 New Table: coach_assignments';
  RAISE NOTICE '   - Hybrid model: squad OR individual swimmer';
  RAISE NOTICE '   - Prevents duplicate assignments';
  RAISE NOTICE '   - RLS enabled for coach and admin access';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Current Statistics:';
  RAISE NOTICE '   - Total assignments: %', v_total_assignments;
  RAISE NOTICE '   - Squad assignments: %', v_squad_assignments;
  RAISE NOTICE '   - Individual swimmer assignments: %', v_swimmer_assignments;
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS Policies:';
  RAISE NOTICE '   - Coaches can view own assignments';
  RAISE NOTICE '   - Coaches can view assigned swimmers (direct + squad)';
  RAISE NOTICE '   - Admins can manage all assignments';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next: Build coach dashboard and admin assignment UI';
  RAISE NOTICE '';
END $$;

-- Show table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'coach_assignments'
ORDER BY ordinal_position;
