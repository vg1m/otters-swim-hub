-- Migration: Add fee types and payment periods to invoice line items
-- Enables multi-tier pricing: registration + monthly/quarterly training fees

-- Add fee_type column to categorize invoice line items
ALTER TABLE invoice_line_items 
ADD COLUMN fee_type TEXT 
CHECK (fee_type IN ('registration', 'monthly_training', 'quarterly_training', 'drop_in'));

-- Add payment_period for tracking billing cycles
ALTER TABLE invoice_line_items
ADD COLUMN payment_period TEXT;

-- Add index for faster queries by fee type
CREATE INDEX idx_invoice_line_items_fee_type ON invoice_line_items(fee_type);

-- Update existing records to categorize as registration
UPDATE invoice_line_items 
SET fee_type = 'registration',
    payment_period = NULL
WHERE fee_type IS NULL;

-- Make fee_type required going forward (after backfilling)
ALTER TABLE invoice_line_items 
ALTER COLUMN fee_type SET NOT NULL;

-- Verification
DO $$
DECLARE
  v_total_items INTEGER;
  v_registration_items INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_items FROM invoice_line_items;
  SELECT COUNT(*) INTO v_registration_items FROM invoice_line_items WHERE fee_type = 'registration';
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FEE TYPES MIGRATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistics:';
  RAISE NOTICE '   - Total invoice line items: %', v_total_items;
  RAISE NOTICE '   - Registration items (existing): %', v_registration_items;
  RAISE NOTICE '';
  RAISE NOTICE '✅ New columns added:';
  RAISE NOTICE '   - fee_type (registration, monthly_training, quarterly_training, drop_in)';
  RAISE NOTICE '   - payment_period (for tracking billing cycles)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 System now supports:';
  RAISE NOTICE '   - Multi-tier squad pricing';
  RAISE NOTICE '   - Quarterly discount tracking';
  RAISE NOTICE '   - Itemized fee breakdowns';
  RAISE NOTICE '';
END $$;

-- Show fee type distribution
SELECT 
  fee_type,
  COUNT(*) as item_count,
  SUM(amount * quantity) as total_amount
FROM invoice_line_items
GROUP BY fee_type
ORDER BY fee_type;
