-- Diagnose the actual state of Test Swimmer 1 and duplicates

-- 1. Show all Test Swimmer 1 records
SELECT 
  'Test Swimmer 1 Records' as check_type,
  s.id,
  s.first_name,
  s.last_name,
  s.parent_id,
  s.status,
  s.payment_deferred,
  s.created_at
FROM swimmers s
WHERE s.first_name = 'Test Swimmer' AND s.last_name = '1'
ORDER BY s.created_at;

-- 2. Find their invoices (if any)
SELECT 
  'Test Swimmer 1 Invoices' as check_type,
  i.id as invoice_id,
  i.parent_id,
  i.status as invoice_status,
  i.total_amount,
  i.paid_at
FROM swimmers s
LEFT JOIN invoices i ON i.parent_id = s.parent_id
WHERE s.first_name = 'Test Swimmer' AND s.last_name = '1';

-- 3. Find their payments
SELECT 
  'Test Swimmer 1 Payments' as check_type,
  p.id as payment_id,
  p.status as payment_status,
  p.amount,
  p.paid_at,
  p.paystack_reference,
  p.callback_data->'swimmers' as swimmer_ids_in_callback,
  i.id as invoice_id,
  i.status as invoice_status
FROM payments p
JOIN invoices i ON i.id = p.invoice_id
WHERE p.callback_data::text LIKE '%Test Swimmer%'
   OR i.parent_id IN (
     SELECT parent_id FROM swimmers 
     WHERE first_name = 'Test Swimmer' AND last_name = '1'
   );

-- 4. Check if swimmer IDs are in payment callback_data
SELECT 
  'Swimmer ID in Payment Callback?' as check_type,
  s.id as swimmer_id,
  s.first_name || ' ' || s.last_name as name,
  s.parent_id,
  p.id as payment_id,
  p.status as payment_status,
  p.callback_data->'swimmers' as swimmers_array,
  CASE 
    WHEN p.callback_data->'swimmers' ? s.id::text THEN 'YES'
    ELSE 'NO'
  END as swimmer_in_callback
FROM swimmers s
CROSS JOIN payments p
WHERE s.first_name = 'Test Swimmer' AND s.last_name = '1';

-- 5. Show all duplicates that still exist
SELECT 
  'Remaining Duplicates' as check_type,
  first_name,
  last_name,
  date_of_birth,
  COALESCE(parent_id::text, 'NULL') as parent_id,
  COUNT(*) as duplicate_count,
  STRING_AGG(id::text || ' (status: ' || status || ')', ', ') as duplicate_ids
FROM swimmers
GROUP BY first_name, last_name, date_of_birth, COALESCE(parent_id::text, 'NULL')
HAVING COUNT(*) > 1;

-- 6. Check constraint exists
SELECT
  'Constraint Check' as check_type,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'swimmers'
  AND constraint_name = 'unique_swimmer_per_parent';
