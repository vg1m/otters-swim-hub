-- Migration: Fix duplicate receipts issue
-- Some invoices have multiple receipts, causing errors when trying to download

-- First, identify and log duplicate receipts
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT invoice_id, COUNT(*) as receipt_count
    FROM receipts
    GROUP BY invoice_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'Found % invoices with duplicate receipts', duplicate_count;
END $$;

-- Keep only the most recent receipt for each invoice, delete older duplicates
WITH ranked_receipts AS (
  SELECT 
    id,
    invoice_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY invoice_id ORDER BY created_at DESC) as rn
  FROM receipts
)
DELETE FROM receipts
WHERE id IN (
  SELECT id 
  FROM ranked_receipts 
  WHERE rn > 1
);

-- Add a unique constraint to prevent future duplicates
-- This will ensure only one receipt per invoice
ALTER TABLE receipts
  DROP CONSTRAINT IF EXISTS unique_receipt_per_invoice;

ALTER TABLE receipts
  ADD CONSTRAINT unique_receipt_per_invoice 
  UNIQUE (invoice_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT unique_receipt_per_invoice ON receipts IS 
  'Ensures only one receipt exists per invoice. If a receipt needs to be regenerated, the old one should be deleted or updated, not duplicated.';

-- Verify the fix
DO $$
DECLARE
  duplicate_count INTEGER;
  total_receipts INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT invoice_id, COUNT(*) as receipt_count
    FROM receipts
    GROUP BY invoice_id
    HAVING COUNT(*) > 1
  ) duplicates;
  
  SELECT COUNT(*) INTO total_receipts FROM receipts;
  
  RAISE NOTICE '✅ Fix complete. Total receipts: %, Remaining duplicates: %', total_receipts, duplicate_count;
  
  IF duplicate_count > 0 THEN
    RAISE WARNING 'Still have % invoices with duplicate receipts!', duplicate_count;
  ELSE
    RAISE NOTICE '✅ All duplicate receipts cleaned up successfully';
  END IF;
END $$;
