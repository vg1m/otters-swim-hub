-- Emergency cleanup for Test Swimmer 3 duplicates
-- Quick fix before implementing root cause solution

-- Find the user ID for tbwko@telegmail.com
DO $$
DECLARE
  v_user_id UUID;
  v_deleted_count INTEGER := 0;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = 'tbwko@telegmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No user found with email tbwko@telegmail.com';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found user ID: %', v_user_id;
  
  -- Delete ALL orphaned Test Swimmer 3 records
  DELETE FROM swimmers
  WHERE first_name = 'Test'
    AND last_name = 'Swimmer 3'
    AND parent_id IS NULL;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % orphaned Test Swimmer 3 records', v_deleted_count;
  
  -- Link any remaining Test Swimmer 3 to this parent
  UPDATE swimmers
  SET parent_id = v_user_id,
      status = 'approved'
  WHERE first_name = 'Test'
    AND last_name = 'Swimmer 3'
    AND parent_id IS NULL;
END $$;

-- Show final state
SELECT 
  'Final Test Swimmer 3 state',
  id,
  parent_id,
  status,
  created_at
FROM swimmers
WHERE first_name = 'Test' AND last_name = 'Swimmer 3'
ORDER BY created_at DESC;
