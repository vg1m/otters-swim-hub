-- Paystack Integration and Receipts System Migration
-- Replaces M-Pesa with Paystack payment processing

-- 1. Update payments table for Paystack
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS paystack_reference TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS paystack_authorization_code TEXT,
  ADD COLUMN IF NOT EXISTS payment_channel TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  DROP COLUMN IF EXISTS mpesa_transaction_id;

-- Add index for fast lookup by Paystack reference
CREATE INDEX IF NOT EXISTS idx_payments_paystack_reference ON payments(paystack_reference);

-- 2. Update invoices table payment_method constraint
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_payment_method_check;
ALTER TABLE invoices 
  ADD CONSTRAINT invoices_payment_method_check 
    CHECK (payment_method IN ('paystack', 'mpesa', 'bank_transfer', 'cash'));

-- Set default to paystack for new invoices
ALTER TABLE invoices ALTER COLUMN payment_method SET DEFAULT 'paystack';

-- 3. Create receipts table for generated receipt records
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES payments(id) ON DELETE CASCADE,
  receipt_number TEXT UNIQUE NOT NULL,
  receipt_url TEXT,
  receipt_data JSONB, -- Stores receipt details for regeneration
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for fast receipt lookups
CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_number ON receipts(receipt_number);

-- Add trigger for updated_at
CREATE TRIGGER receipts_updated_at
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Enable RLS on receipts table
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- RLS: Parents can view receipts for their own invoices
CREATE POLICY "Parents can view own receipts"
  ON receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = receipts.invoice_id
      AND invoices.parent_id = auth.uid()
    )
  );

-- RLS: Admins can view all receipts
CREATE POLICY "Admins can view all receipts"
  ON receipts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS: System can insert receipts (via API)
CREATE POLICY "System can insert receipts"
  ON receipts FOR INSERT
  WITH CHECK (true);

-- RLS: Admins can manage receipts
CREATE POLICY "Admins can manage receipts"
  ON receipts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Add comments for documentation
COMMENT ON TABLE receipts IS 'Stores receipt records for completed payments';
COMMENT ON COLUMN payments.paystack_reference IS 'Unique transaction reference from Paystack';
COMMENT ON COLUMN payments.paystack_authorization_code IS 'Authorization code for recurring payments';
COMMENT ON COLUMN payments.payment_channel IS 'Payment channel used (card, mobile_money, bank_transfer, etc.)';
COMMENT ON COLUMN payments.paid_at IS 'Timestamp when payment was completed';
COMMENT ON COLUMN receipts.receipt_number IS 'Unique receipt number (format: REC-YYYYMMDD-XXXXXX)';
COMMENT ON COLUMN receipts.receipt_url IS 'URL to PDF receipt file in Supabase Storage (if stored)';
COMMENT ON COLUMN receipts.receipt_data IS 'JSON data for receipt regeneration';

-- 6. Create function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_number TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate receipt number: REC-YYYYMMDD-6RandomDigits
    new_number := 'REC-' || 
                  TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                  LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
    
    -- Check if this number already exists
    SELECT EXISTS(SELECT 1 FROM receipts WHERE receipt_number = new_number) INTO exists_check;
    
    -- If it doesn't exist, we're good
    IF NOT exists_check THEN
      RETURN new_number;
    END IF;
    
    -- If it exists, loop will try again with a new random number
  END LOOP;
END;
$$;

-- 7. Verify schema changes
SELECT 
  'Payments table updated' as status,
  COUNT(*) as payment_records
FROM payments;

SELECT 
  'Receipts table created' as status,
  COUNT(*) as receipt_records
FROM receipts;
