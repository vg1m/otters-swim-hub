-- Diagnostic queries to understand pending registrations issues

-- 1. Check swimmers with NULL parent_id (orphaned)
SELECT 
  'Orphaned Swimmers' as check_type,
  COUNT(*) as count,
  STRING_AGG(first_name || ' ' || last_name || ' (' || status || ')', ', ') as swimmers
FROM swimmers
WHERE parent_id IS NULL;

-- 2. Check for swimmers with same name but different parent_id (duplicates after linking)
SELECT 
  'Potential Duplicates' as check_type,
  first_name,
  last_name,
  date_of_birth,
  STRING_AGG(
    'parent_id=' || COALESCE(parent_id::text, 'NULL') || ', status=' || status || ', id=' || id::text, 
    ' | '
  ) as details
FROM swimmers
GROUP BY first_name, last_name, date_of_birth
HAVING COUNT(*) > 1;

-- 3. Check pending swimmers and their invoice/payment status
SELECT 
  'Pending Swimmers with Payment Status' as check_type,
  s.id as swimmer_id,
  s.first_name || ' ' || s.last_name as swimmer_name,
  s.parent_id,
  s.status as swimmer_status,
  s.payment_deferred,
  i.id as invoice_id,
  i.status as invoice_status,
  p.id as payment_id,
  p.status as payment_status,
  p.paystack_reference
FROM swimmers s
LEFT JOIN invoices i ON (i.parent_id = s.parent_id OR (i.parent_id IS NULL AND s.parent_id IS NULL))
LEFT JOIN payments p ON p.invoice_id = i.id
WHERE s.status = 'pending'
ORDER BY s.created_at DESC;

-- 4. Check what the admin query would actually return (simplified)
SELECT 
  'Admin View Query Result' as check_type,
  s.id,
  s.first_name || ' ' || s.last_name as name,
  s.status,
  s.parent_id,
  COUNT(i.id) as invoice_count,
  STRING_AGG(i.status, ', ') as invoice_statuses
FROM swimmers s
LEFT JOIN invoices i ON i.swimmer_id = s.id  -- This is what the admin query uses
WHERE s.status = 'pending'
GROUP BY s.id, s.first_name, s.last_name, s.status, s.parent_id;

-- 5. Check payments callback_data to see if swimmer IDs are stored
SELECT 
  'Payment Callback Data Check' as check_type,
  p.id as payment_id,
  p.status,
  p.callback_data->>'parentEmail' as parent_email,
  jsonb_array_length(COALESCE(p.callback_data->'swimmers', '[]'::jsonb)) as swimmer_count,
  p.callback_data->'swimmers' as swimmer_ids,
  i.status as invoice_status
FROM payments p
LEFT JOIN invoices i ON i.id = p.invoice_id
WHERE p.created_at > NOW() - INTERVAL '7 days'
ORDER BY p.created_at DESC
LIMIT 10;
