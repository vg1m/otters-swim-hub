-- Enhanced Registration System Migration
-- Adds consent management, emergency contacts, and pay-later functionality

-- 1. Extend profiles table with relationship and emergency contact fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS relationship TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- 2. Update swimmers table to track payment deferral
ALTER TABLE swimmers ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN DEFAULT false;
ALTER TABLE swimmers ADD COLUMN IF NOT EXISTS payment_deferred BOOLEAN DEFAULT false;

-- 3. Create registration_consents table for Kenya Data Protection Act compliance
CREATE TABLE IF NOT EXISTS registration_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  swimmer_id UUID REFERENCES swimmers(id) ON DELETE CASCADE,
  media_consent BOOLEAN NOT NULL DEFAULT false,
  code_of_conduct_consent BOOLEAN NOT NULL DEFAULT true,
  data_accuracy_confirmed BOOLEAN NOT NULL DEFAULT true,
  consent_text TEXT NOT NULL,
  consented_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_registration_consents_parent_id ON registration_consents(parent_id);
CREATE INDEX IF NOT EXISTS idx_registration_consents_swimmer_id ON registration_consents(swimmer_id);
CREATE INDEX IF NOT EXISTS idx_swimmers_payment_deferred ON swimmers(payment_deferred);

-- 5. Enable RLS on registration_consents table
ALTER TABLE registration_consents ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for registration_consents
-- Parents can view their own consents
CREATE POLICY "Parents can view own consents"
  ON registration_consents FOR SELECT
  USING (parent_id = auth.uid());

-- Admins can view all consents
CREATE POLICY "Admins can view all consents"
  ON registration_consents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert consents (during registration)
CREATE POLICY "System can insert consents"
  ON registration_consents FOR INSERT
  WITH CHECK (true);

-- Parents can update their own media consent
CREATE POLICY "Parents can update own media consent"
  ON registration_consents FOR UPDATE
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- Admins can manage all consents
CREATE POLICY "Admins can manage all consents"
  ON registration_consents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. Add comments for documentation
COMMENT ON TABLE registration_consents IS 'Stores consent records for Kenya Data Protection Act compliance';
COMMENT ON COLUMN profiles.relationship IS 'Parent/guardian relationship to swimmer (Father, Mother, Guardian, Other)';
COMMENT ON COLUMN profiles.emergency_contact_name IS 'Emergency contact full name';
COMMENT ON COLUMN profiles.emergency_contact_relationship IS 'Emergency contact relationship to swimmer';
COMMENT ON COLUMN profiles.emergency_contact_phone IS 'Emergency contact phone number';
COMMENT ON COLUMN swimmers.payment_deferred IS 'True if parent chose pay-later option during registration';
COMMENT ON COLUMN swimmers.registration_complete IS 'True when all registration steps completed (forms filled, consents given)';
