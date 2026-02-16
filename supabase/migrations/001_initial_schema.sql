-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('parent', 'admin', 'coach')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Swimmers table
CREATE TABLE swimmers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  squad TEXT NOT NULL CHECK (squad IN ('competitive', 'learn_to_swim', 'fitness')),
  sub_squad TEXT CHECK (sub_squad IN ('elite', 'dev1', 'dev2', 'dev3')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'inactive')),
  license_number TEXT,
  medical_expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swimmer_id UUID REFERENCES swimmers(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'due', 'paid')),
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  transaction_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice line items table
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  mpesa_transaction_id TEXT,
  phone_number TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  callback_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Training sessions table
CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  squad TEXT NOT NULL CHECK (squad IN ('competitive', 'learn_to_swim', 'fitness')),
  pool_location TEXT NOT NULL,
  coach_id UUID REFERENCES profiles(id),
  qr_code_token TEXT UNIQUE NOT NULL DEFAULT uuid_generate_v4()::TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendance table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  swimmer_id UUID REFERENCES swimmers(id) ON DELETE CASCADE,
  check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checked_in_by TEXT NOT NULL CHECK (checked_in_by IN ('self', 'coach')),
  coach_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, swimmer_id)
);

-- Meets table
CREATE TABLE meets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  venue TEXT NOT NULL,
  date DATE NOT NULL,
  course TEXT NOT NULL CHECK (course IN ('SCM', 'LCM')),
  entry_open_date DATE NOT NULL,
  entry_close_date DATE NOT NULL,
  transport_available BOOLEAN DEFAULT FALSE,
  accommodation_available BOOLEAN DEFAULT FALSE,
  transport_cost DECIMAL(10, 2),
  accommodation_cost DECIMAL(10, 2),
  qualifying_times JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meet registrations table
CREATE TABLE meet_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meet_id UUID REFERENCES meets(id) ON DELETE CASCADE,
  swimmer_id UUID REFERENCES swimmers(id) ON DELETE CASCADE,
  events_entered JSONB,
  transport_required BOOLEAN DEFAULT FALSE,
  accommodation_required BOOLEAN DEFAULT FALSE,
  invoice_id UUID REFERENCES invoices(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'withdrawn')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(meet_id, swimmer_id)
);

-- Create indexes for better performance
CREATE INDEX idx_swimmers_parent_id ON swimmers(parent_id);
CREATE INDEX idx_swimmers_status ON swimmers(status);
CREATE INDEX idx_invoices_parent_id ON invoices(parent_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_attendance_session_id ON attendance(session_id);
CREATE INDEX idx_attendance_swimmer_id ON attendance(swimmer_id);
CREATE INDEX idx_training_sessions_date ON training_sessions(session_date);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE swimmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE meets ENABLE ROW LEVEL SECURITY;
ALTER TABLE meet_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for swimmers
CREATE POLICY "Parents can view own swimmers"
  ON swimmers FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "Parents can insert own swimmers"
  ON swimmers FOR INSERT
  WITH CHECK (parent_id = auth.uid());

CREATE POLICY "Parents can update own swimmers"
  ON swimmers FOR UPDATE
  USING (parent_id = auth.uid());

CREATE POLICY "Admins can view all swimmers"
  ON swimmers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Coaches can view squad swimmers"
  ON swimmers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

-- RLS Policies for invoices
CREATE POLICY "Parents can view own invoices"
  ON invoices FOR SELECT
  USING (parent_id = auth.uid());

CREATE POLICY "Admins can manage all invoices"
  ON invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for invoice_line_items
CREATE POLICY "Users can view invoice items"
  ON invoice_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND (invoices.parent_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      ))
    )
  );

CREATE POLICY "Admins can manage invoice items"
  ON invoice_line_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for payments
CREATE POLICY "Parents can view own payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = payments.invoice_id
      AND invoices.parent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System can insert payments"
  ON payments FOR INSERT
  WITH CHECK (true);

-- RLS Policies for training_sessions
CREATE POLICY "Anyone can view training sessions"
  ON training_sessions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage training sessions"
  ON training_sessions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for attendance
CREATE POLICY "Parents can view own swimmer attendance"
  ON attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM swimmers
      WHERE swimmers.id = attendance.swimmer_id
      AND swimmers.parent_id = auth.uid()
    )
  );

CREATE POLICY "Users can mark own attendance"
  ON attendance FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM swimmers
      WHERE swimmers.id = attendance.swimmer_id
      AND swimmers.parent_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can manage attendance"
  ON attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- RLS Policies for meets
CREATE POLICY "Anyone can view meets"
  ON meets FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage meets"
  ON meets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for meet_registrations
CREATE POLICY "Parents can view own meet registrations"
  ON meet_registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM swimmers
      WHERE swimmers.id = meet_registrations.swimmer_id
      AND swimmers.parent_id = auth.uid()
    )
  );

CREATE POLICY "Parents can register own swimmers"
  ON meet_registrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM swimmers
      WHERE swimmers.id = meet_registrations.swimmer_id
      AND swimmers.parent_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage meet registrations"
  ON meet_registrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_swimmers_updated_at BEFORE UPDATE ON swimmers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meets_updated_at BEFORE UPDATE ON meets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate invoice total from line items
CREATE OR REPLACE FUNCTION calculate_invoice_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE invoices
  SET total_amount = (
    SELECT COALESCE(SUM(amount * quantity), 0)
    FROM invoice_line_items
    WHERE invoice_id = NEW.invoice_id
  )
  WHERE id = NEW.invoice_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-calculate invoice total
CREATE TRIGGER update_invoice_total AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION calculate_invoice_total();
