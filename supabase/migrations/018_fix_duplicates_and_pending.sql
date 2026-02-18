-- Fix duplicate swimmers and pending registration issues

-- PART 1: Add unique constraint to prevent future duplicates
-- This prevents creating duplicate swimmers for the same parent
ALTER TABLE swimmers 
DROP CONSTRAINT IF EXISTS unique_swimmer_per_parent;

ALTER TABLE swimmers 
ADD CONSTRAINT unique_swimmer_per_parent 
UNIQUE NULLS NOT DISTINCT (parent_id, first_name, last_name, date_of_birth);

COMMENT ON CONSTRAINT unique_swimmer_per_parent ON swimmers IS 
  'Prevents duplicate swimmers with same name, DOB, and parent. Allows NULL parent_id for orphaned registrations but treats all NULLs as distinct.';

-- PART 2: Clean up existing duplicates
-- Keep the most recent swimmer for each duplicate set, delete older ones
WITH duplicates AS (
  SELECT 
    id,
    parent_id,
    first_name,
    last_name,
    date_of_birth,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY 
        COALESCE(parent_id::text, 'orphaned'),
        first_name, 
        last_name, 
        date_of_birth 
      ORDER BY created_at DESC, id DESC
    ) as row_num
  FROM swimmers
)
DELETE FROM swimmers
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Log how many duplicates were removed
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % duplicate swimmer records', deleted_count;
END $$;

-- PART 3: Ensure swimmers are properly approved when payment completes
-- Update any orphaned swimmers that have completed payments but aren't approved
WITH completed_orphaned_swimmers AS (
  SELECT DISTINCT s.id
  FROM swimmers s
  JOIN payments p ON p.callback_data->'swimmers' ? s.id::text
  WHERE s.status = 'pending'
    AND p.status = 'completed'
    AND s.parent_id IS NULL
)
UPDATE swimmers
SET status = 'approved'
WHERE id IN (SELECT id FROM completed_orphaned_swimmers);

-- Log approvals
DO $$
DECLARE
  approved_count INTEGER;
BEGIN
  GET DIAGNOSTICS approved_count = ROW_COUNT;
  IF approved_count > 0 THEN
    RAISE NOTICE 'Approved % orphaned swimmers with completed payments', approved_count;
  END IF;
END $$;

-- PART 4: Verification queries
-- Show remaining pending swimmers
SELECT 
  'Remaining Pending Swimmers' as status,
  COUNT(*) as count
FROM swimmers
WHERE status = 'pending';

-- Show any remaining duplicates
SELECT 
  'Remaining Duplicates' as status,
  COUNT(*) as count
FROM (
  SELECT 
    first_name, 
    last_name, 
    date_of_birth,
    COALESCE(parent_id::text, 'orphaned') as parent_group,
    COUNT(*) as dup_count
  FROM swimmers
  GROUP BY first_name, last_name, date_of_birth, parent_group
  HAVING COUNT(*) > 1
) dups;
