-- Manually approve Test Swimmer 2 (since payment is confirmed)

-- Update Test Swimmer 2 status to approved
UPDATE swimmers
SET status = 'approved'
WHERE first_name = 'Test' 
  AND last_name = 'Swimmer 2'
  AND status = 'pending';

-- Return updated swimmer details
SELECT 
  'Updated Swimmer' as result,
  id,
  first_name,
  last_name,
  status,
  parent_id,
  created_at
FROM swimmers
WHERE first_name = 'Test' AND last_name = 'Swimmer 2';
