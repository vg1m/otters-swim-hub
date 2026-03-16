-- ============================================================
-- Migration 051: Swimmer Performance Tracking
-- ============================================================
-- Creates swimmer_performances and coach_notes tables with
-- appropriate RLS policies for all three roles.
-- ============================================================

-- ============================================================
-- TABLE: swimmer_performances
-- ============================================================
CREATE TABLE IF NOT EXISTS public.swimmer_performances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swimmer_id UUID NOT NULL REFERENCES public.swimmers(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Event details
  event TEXT NOT NULL,
  stroke TEXT CHECK (stroke IN ('freestyle', 'backstroke', 'breaststroke', 'butterfly', 'medley', 'other')),
  distance_m INTEGER CHECK (distance_m > 0),

  -- Time (stored as raw seconds for sorting/PB comparison)
  time_seconds NUMERIC(10, 2) NOT NULL CHECK (time_seconds > 0),
  time_formatted TEXT NOT NULL, -- display value e.g. "1:23.45"

  -- Competition context
  competition_name TEXT,
  competition_date DATE,

  -- Personal best flag
  is_personal_best BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER update_swimmer_performances_updated_at
  BEFORE UPDATE ON public.swimmer_performances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_swimmer_performances_swimmer_id ON public.swimmer_performances(swimmer_id);
CREATE INDEX IF NOT EXISTS idx_swimmer_performances_competition_date ON public.swimmer_performances(competition_date DESC);
CREATE INDEX IF NOT EXISTS idx_swimmer_performances_is_pb ON public.swimmer_performances(is_personal_best) WHERE is_personal_best = true;

-- Enable RLS
ALTER TABLE public.swimmer_performances ENABLE ROW LEVEL SECURITY;

-- Parents can view performances for their own swimmers
CREATE POLICY "Parents can view own swimmer performances"
  ON public.swimmer_performances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.swimmers
      WHERE swimmers.id = swimmer_performances.swimmer_id
      AND swimmers.parent_id = (SELECT auth.uid())
    )
  );

-- Coaches and admins can view all performances
CREATE POLICY "Coaches and admins can view all performances"
  ON public.swimmer_performances FOR SELECT
  USING (public.is_admin_or_coach());

-- Coaches and admins can insert performances
CREATE POLICY "Coaches and admins can insert performances"
  ON public.swimmer_performances FOR INSERT
  WITH CHECK (public.is_admin_or_coach());

-- Coaches and admins can update performances
CREATE POLICY "Coaches and admins can update performances"
  ON public.swimmer_performances FOR UPDATE
  USING (public.is_admin_or_coach());

-- Coaches and admins can delete performances
CREATE POLICY "Coaches and admins can delete performances"
  ON public.swimmer_performances FOR DELETE
  USING (public.is_admin_or_coach());


-- ============================================================
-- TABLE: coach_notes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.coach_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swimmer_id UUID NOT NULL REFERENCES public.swimmers(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Optional link to a specific performance entry
  performance_id UUID REFERENCES public.swimmer_performances(id) ON DELETE SET NULL,

  -- Note metadata
  note_type TEXT NOT NULL DEFAULT 'general'
    CHECK (note_type IN ('general', 'technique', 'fitness', 'achievement', 'concern')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Privacy: if true, note is NOT visible to parent
  is_private BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER update_coach_notes_updated_at
  BEFORE UPDATE ON public.coach_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coach_notes_swimmer_id ON public.coach_notes(swimmer_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_coach_id ON public.coach_notes(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_notes_performance_id ON public.coach_notes(performance_id);

-- Enable RLS
ALTER TABLE public.coach_notes ENABLE ROW LEVEL SECURITY;

-- Parents can only view non-private notes for their own swimmers
CREATE POLICY "Parents can view non-private notes for own swimmers"
  ON public.coach_notes FOR SELECT
  USING (
    is_private = false
    AND EXISTS (
      SELECT 1 FROM public.swimmers
      WHERE swimmers.id = coach_notes.swimmer_id
      AND swimmers.parent_id = (SELECT auth.uid())
    )
  );

-- Coaches can view all notes for their assigned swimmers
CREATE POLICY "Coaches can view notes for assigned swimmers"
  ON public.coach_notes FOR SELECT
  USING (public.is_admin_or_coach());

-- Coaches can insert notes
CREATE POLICY "Coaches can insert notes"
  ON public.coach_notes FOR INSERT
  WITH CHECK (public.is_admin_or_coach());

-- Coaches can only update their own notes; admins can update any
CREATE POLICY "Coaches can update own notes, admins can update all"
  ON public.coach_notes FOR UPDATE
  USING (
    coach_id = (SELECT auth.uid())
    OR public.is_admin()
  );

-- Coaches can only delete their own notes; admins can delete any
CREATE POLICY "Coaches can delete own notes, admins can delete all"
  ON public.coach_notes FOR DELETE
  USING (
    coach_id = (SELECT auth.uid())
    OR public.is_admin()
  );


-- ============================================================
-- VERIFICATION
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  MIGRATION 051: PERFORMANCE TRACKING  ';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - swimmer_performances (race times + PBs)';
  RAISE NOTICE '  - coach_notes (development notes)';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS policies applied for:';
  RAISE NOTICE '  - Parents: view own swimmer data (non-private notes only)';
  RAISE NOTICE '  - Coaches: full CRUD on performances and notes';
  RAISE NOTICE '  - Admins: full CRUD on all records';
  RAISE NOTICE '';
END $$;
