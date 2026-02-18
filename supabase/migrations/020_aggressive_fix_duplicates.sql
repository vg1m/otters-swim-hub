-- Aggressive fix for duplicates and pending paid swimmers

-- STEP 1: Approve ALL swimmers that have paid invoices (regardless of orphan status)
-- This catches swimmers whose parent has a paid invoice
WITH paid_parent_swimmers AS (
  SELECT DISTINCT s.id
  FROM swimmers s
  JOIN invoices i ON i.parent_id = s.parent_id
  WHERE i.status = 'paid'
    AND s.status = 'pending'
    AND s.parent_id IS NOT NULL
)
UPDATE swimmers
SET status = 'approved'
WHERE id IN (SELECT id FROM paid_parent_swimmers);

-- Log how many were approved
DO $$
DECLARE
  approved_count INTEGER;
BEGIN
  GET DIAGNOSTICS approved_count = ROW_COUNT;
  IF approved_count > 0 THEN
    RAISE NOTICE 'Approved % swimmers with paid invoices (by parent_id)', approved_count;
  END IF;
END $$;

-- STEP 2: Approve orphaned swimmers if their payment is completed
-- This uses the callback_data to find which swimmers belong to which payment
WITH orphaned_paid_swimmers AS (
  SELECT DISTINCT s.id
  FROM swimmers s
  CROSS JOIN payments p
  WHERE s.parent_id IS NULL
    AND s.status = 'pending'
    AND p.status = 'completed'
    AND p.callback_data->'swimmers' @> to_jsonb(ARRAY[s.id])
)
UPDATE swimmers
SET status = 'approved'
WHERE id IN (SELECT id FROM orphaned_paid_swimmers);

DO $$
DECLARE
  approved_count INTEGER;
BEGIN
  GET DIAGNOSTICS approved_count = ROW_COUNT;
  IF approved_count > 0 THEN
    RAISE NOTICE 'Approved % orphaned swimmers with completed payments', approved_count;
  END IF;
END $$;

-- STEP 3: Remove duplicate swimmers - more aggressive approach
-- For each duplicate set, keep ONLY the one with the highest ID (most recent)
DO $$
DECLARE
  duplicate_cursor CURSOR FOR
    SELECT 
      first_name,
      last_name,
      date_of_birth,
      COALESCE(parent_id::text, 'NULL') as parent_group
    FROM swimmers
    GROUP BY first_name, last_name, date_of_birth, COALESCE(parent_id::text, 'NULL')
    HAVING COUNT(*) > 1;
  
  dup_record RECORD;
  ids_to_delete UUID[];
  ids_to_keep UUID[];
  deleted_total INTEGER := 0;
BEGIN
  FOR dup_record IN duplicate_cursor LOOP
    -- Get all IDs for this duplicate set
    SELECT ARRAY_AGG(id ORDER BY created_at ASC, id ASC) 
    INTO ids_to_delete
    FROM swimmers
    WHERE first_name = dup_record.first_name
      AND last_name = dup_record.last_name
      AND date_of_birth = dup_record.date_of_birth
      AND COALESCE(parent_id::text, 'NULL') = dup_record.parent_group;
    
    -- Keep the last one (most recent), delete the rest
    IF array_length(ids_to_delete, 1) > 1 THEN
      ids_to_keep := ARRAY[ids_to_delete[array_length(ids_to_delete, 1)]];
      ids_to_delete := ids_to_delete[1:array_length(ids_to_delete, 1)-1];
      
      RAISE NOTICE 'Deleting duplicates for: % % (keeping %, deleting %)', 
        dup_record.first_name, dup_record.last_name, ids_to_keep[1], array_length(ids_to_delete, 1);
      
      DELETE FROM swimmers WHERE id = ANY(ids_to_delete);
      deleted_total := deleted_total + array_length(ids_to_delete, 1);
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Total duplicate swimmers deleted: %', deleted_total;
END $$;

-- STEP 4: Add unique constraint (if not already exists)
ALTER TABLE swimmers 
DROP CONSTRAINT IF EXISTS unique_swimmer_per_parent;

-- Use a different approach: allow multiple NULL parent_ids
CREATE UNIQUE INDEX IF NOT EXISTS unique_swimmer_per_parent_idx
ON swimmers (parent_id, first_name, last_name, date_of_birth)
WHERE parent_id IS NOT NULL;

COMMENT ON INDEX unique_swimmer_per_parent_idx IS 
  'Prevents duplicate swimmers for the same parent. Orphaned swimmers (parent_id = NULL) can have duplicates temporarily.';

-- STEP 5: Final verification
SELECT 
  'Final Status' as check_type,
  status,
  COUNT(*) as count
FROM swimmers
GROUP BY status
ORDER BY status;

SELECT 
  'Remaining Duplicates' as check_type,
  COUNT(*) as duplicate_sets
FROM (
  SELECT 
    first_name,
    last_name,
    date_of_birth,
    COALESCE(parent_id::text, 'NULL') as parent_group,
    COUNT(*) as dup_count
  FROM swimmers
  GROUP BY first_name, last_name, date_of_birth, COALESCE(parent_id::text, 'NULL')
  HAVING COUNT(*) > 1
) dups;
