-- Migration: Add facility management system
-- Enables management of swimming facilities, schedules, and capacity rules

-- Facilities table
CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  lanes INTEGER NOT NULL CHECK (lanes > 0),
  pool_length INTEGER NOT NULL CHECK (pool_length > 0), -- in meters
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Facility schedules (days/times when facility is available)
CREATE TABLE facility_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  squad TEXT CHECK (squad IN ('competitive', 'learn_to_swim', 'fitness')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lane capacity configuration by sub-squad
CREATE TABLE lane_capacity_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sub_squad TEXT NOT NULL, -- 'elite', 'dev1', 'dev2', 'dev3', 'learn_to_swim'
  swimmers_per_lane INTEGER NOT NULL CHECK (swimmers_per_lane > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sub_squad)
);

-- Link training sessions to facilities
ALTER TABLE training_sessions
ADD COLUMN facility_id UUID REFERENCES facilities(id);

-- Link swimmers to assigned facility
ALTER TABLE swimmers
ADD COLUMN facility_id UUID REFERENCES facilities(id);

-- Add trigger for updated_at
CREATE OR REPLACE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON facilities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_facility_schedules_facility ON facility_schedules(facility_id);
CREATE INDEX idx_facility_schedules_day ON facility_schedules(day_of_week);
CREATE INDEX idx_training_sessions_facility ON training_sessions(facility_id) WHERE facility_id IS NOT NULL;
CREATE INDEX idx_swimmers_facility ON swimmers(facility_id) WHERE facility_id IS NOT NULL;

-- RLS Policies
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lane_capacity_rules ENABLE ROW LEVEL SECURITY;

-- Anyone can view facilities (public info)
CREATE POLICY "Anyone can view facilities" ON facilities 
  FOR SELECT USING (true);

-- Admins can manage facilities
CREATE POLICY "Admins can manage facilities" ON facilities 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Anyone can view schedules
CREATE POLICY "Anyone can view schedules" ON facility_schedules 
  FOR SELECT USING (true);

-- Admins can manage schedules
CREATE POLICY "Admins can manage schedules" ON facility_schedules 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Anyone can view capacity rules
CREATE POLICY "Anyone can view capacity rules" ON lane_capacity_rules 
  FOR SELECT USING (true);

-- Admins can manage capacity rules
CREATE POLICY "Admins can manage capacity rules" ON lane_capacity_rules 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- Seed data
INSERT INTO facilities (name, lanes, pool_length, address) VALUES
  ('Aga Khan Sports Club', 6, 25, 'Aga Khan location'),
  ('Lavington Swimming Pool', 6, 25, 'Lavington location'),
  ('School of the Nations (SON)', 6, 25, 'SON location');

INSERT INTO facility_schedules (facility_id, day_of_week, start_time, end_time, squad) VALUES
  -- Aga Khan: Mon(1), Wed(3), Fri(5) 4-6PM, Sat(6) 6-10AM
  ((SELECT id FROM facilities WHERE name = 'Aga Khan Sports Club'), 1, '16:00', '18:00', 'competitive'),
  ((SELECT id FROM facilities WHERE name = 'Aga Khan Sports Club'), 3, '16:00', '18:00', 'competitive'),
  ((SELECT id FROM facilities WHERE name = 'Aga Khan Sports Club'), 5, '16:00', '18:00', 'competitive'),
  ((SELECT id FROM facilities WHERE name = 'Aga Khan Sports Club'), 6, '06:00', '10:00', 'competitive'),
  
  -- Lavington: Mon(1), Wed(3), Fri(5) 5-6:30AM
  ((SELECT id FROM facilities WHERE name = 'Lavington Swimming Pool'), 1, '05:00', '06:30', 'fitness'),
  ((SELECT id FROM facilities WHERE name = 'Lavington Swimming Pool'), 3, '05:00', '06:30', 'fitness'),
  ((SELECT id FROM facilities WHERE name = 'Lavington Swimming Pool'), 5, '05:00', '06:30', 'fitness'),
  
  -- SON: Tue(2), Thu(4) 4-6PM, Sat(6) 6-9AM
  ((SELECT id FROM facilities WHERE name = 'School of the Nations (SON)'), 2, '16:00', '18:00', 'learn_to_swim'),
  ((SELECT id FROM facilities WHERE name = 'School of the Nations (SON)'), 4, '16:00', '18:00', 'learn_to_swim'),
  ((SELECT id FROM facilities WHERE name = 'School of the Nations (SON)'), 6, '06:00', '09:00', 'learn_to_swim');

INSERT INTO lane_capacity_rules (sub_squad, swimmers_per_lane) VALUES
  ('elite', 5),
  ('dev1', 6),
  ('dev2', 6),
  ('dev3', 6),
  ('learn_to_swim', 6);

-- Add comments for documentation
COMMENT ON TABLE facilities IS 'Swimming pool facilities used for training';
COMMENT ON TABLE facility_schedules IS 'Days and times when facilities are available';
COMMENT ON TABLE lane_capacity_rules IS 'Maximum swimmers per lane by sub-squad level';

-- Verification
DO $$
DECLARE
  v_facilities INTEGER;
  v_schedules INTEGER;
  v_capacity_rules INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_facilities FROM facilities;
  SELECT COUNT(*) INTO v_schedules FROM facility_schedules;
  SELECT COUNT(*) INTO v_capacity_rules FROM lane_capacity_rules;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FACILITY MANAGEMENT MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistics:';
  RAISE NOTICE '   - Facilities created: %', v_facilities;
  RAISE NOTICE '   - Facility schedules: %', v_schedules;
  RAISE NOTICE '   - Capacity rules: %', v_capacity_rules;
  RAISE NOTICE '';
  RAISE NOTICE '✅ New tables created:';
  RAISE NOTICE '   - facilities (pools with lanes and length)';
  RAISE NOTICE '   - facility_schedules (availability by day/time)';
  RAISE NOTICE '   - lane_capacity_rules (swimmers per lane by level)';
  RAISE NOTICE '';
  RAISE NOTICE '🔗 Linked columns:';
  RAISE NOTICE '   - training_sessions.facility_id';
  RAISE NOTICE '   - swimmers.facility_id';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next: Build admin facility management UI';
  RAISE NOTICE '';
END $$;

-- Show seeded data
SELECT 'Facilities' as category, name, lanes, pool_length as length_m, address 
FROM facilities
ORDER BY name;

SELECT 'Schedules' as category, f.name as facility, 
  CASE day_of_week WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue' 
    WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri' WHEN 6 THEN 'Sat' END as day,
  start_time, end_time, squad
FROM facility_schedules fs
JOIN facilities f ON f.id = fs.facility_id
ORDER BY f.name, day_of_week, start_time;

SELECT 'Capacity Rules' as category, sub_squad, swimmers_per_lane 
FROM lane_capacity_rules
ORDER BY sub_squad;
