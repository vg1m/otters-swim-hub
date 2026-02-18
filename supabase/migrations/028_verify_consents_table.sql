-- Verify registration_consents table exists and check structure

-- 1. Check if table exists
SELECT 
  'Table exists' as check_type,
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'registration_consents'
  ) as exists;

-- 2. Show table structure
SELECT 
  'Table columns' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'registration_consents'
ORDER BY ordinal_position;

-- 3. Check RLS policies
SELECT 
  'RLS policies' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual::text as using_clause
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'registration_consents'
ORDER BY policyname;

-- 4. Try to insert a test consent record (will roll back)
DO $$
DECLARE
  test_swimmer_id UUID;
  test_result TEXT;
BEGIN
  -- Get a test swimmer ID (any swimmer)
  SELECT id INTO test_swimmer_id
  FROM swimmers
  LIMIT 1;

  IF test_swimmer_id IS NOT NULL THEN
    -- Try to insert (using service role permissions)
    BEGIN
      INSERT INTO registration_consents (
        parent_id,
        swimmer_id,
        media_consent,
        code_of_conduct_consent,
        data_accuracy_confirmed,
        consent_text
      ) VALUES (
        NULL,
        test_swimmer_id,
        true,
        true,
        true,
        'Test consent text'
      );
      
      test_result := '✅ Test insert successful';
      
      -- Roll back the test insert
      RAISE EXCEPTION 'Rolling back test insert';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM = 'Rolling back test insert' THEN
        test_result := '✅ Test insert successful (rolled back)';
      ELSE
        test_result := '❌ Test insert failed: ' || SQLERRM;
      END IF;
    END;
  ELSE
    test_result := '⚠️ No swimmers found to test with';
  END IF;

  RAISE NOTICE '%', test_result;
END $$;

-- 5. Count existing consent records
SELECT 
  'Existing consents' as check_type,
  COUNT(*) as total_count,
  COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as orphaned_count,
  COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as linked_count
FROM registration_consents;
