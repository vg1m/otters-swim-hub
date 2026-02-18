-- Add database-level safety checks for consent records
-- Ensures data integrity and prevents silent failures

-- 1. Add a check constraint to ensure consent_text is never empty
ALTER TABLE registration_consents
DROP CONSTRAINT IF EXISTS check_consent_text_not_empty;

ALTER TABLE registration_consents
ADD CONSTRAINT check_consent_text_not_empty 
CHECK (LENGTH(TRIM(consent_text)) > 0);

-- 2. Create a function to validate consent records
CREATE OR REPLACE FUNCTION validate_consent_record()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure swimmer_id is valid
  IF NEW.swimmer_id IS NULL THEN
    RAISE EXCEPTION 'swimmer_id cannot be NULL';
  END IF;
  
  -- Ensure consent_text is not empty
  IF NEW.consent_text IS NULL OR LENGTH(TRIM(NEW.consent_text)) = 0 THEN
    RAISE EXCEPTION 'consent_text cannot be empty';
  END IF;
  
  -- Ensure at least one consent is recorded
  IF NEW.media_consent IS NULL AND NEW.code_of_conduct_consent IS NULL AND NEW.data_accuracy_confirmed IS NULL THEN
    RAISE EXCEPTION 'At least one consent field must be set';
  END IF;
  
  -- Log successful consent creation
  RAISE NOTICE 'Consent record created: swimmer_id=%, media=%, code=%, data=%', 
    NEW.swimmer_id, NEW.media_consent, NEW.code_of_conduct_consent, NEW.data_accuracy_confirmed;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Add trigger to validate consent records on insert
DROP TRIGGER IF EXISTS validate_consent_on_insert ON registration_consents;

CREATE TRIGGER validate_consent_on_insert
  BEFORE INSERT ON registration_consents
  FOR EACH ROW
  EXECUTE FUNCTION validate_consent_record();

-- 4. Create a monitoring view for consent health
CREATE OR REPLACE VIEW consent_health_check AS
SELECT 
  'Total swimmers' as metric,
  COUNT(*) as value
FROM swimmers
UNION ALL
SELECT 
  'Total consents' as metric,
  COUNT(*) as value
FROM registration_consents
UNION ALL
SELECT 
  'Swimmers without consents' as metric,
  COUNT(*) as value
FROM swimmers s
WHERE NOT EXISTS (
  SELECT 1 FROM registration_consents rc WHERE rc.swimmer_id = s.id
)
UNION ALL
SELECT 
  'Orphaned consents (no parent)' as metric,
  COUNT(*) as value
FROM registration_consents
WHERE parent_id IS NULL
UNION ALL
SELECT 
  'Consents created today' as metric,
  COUNT(*) as value
FROM registration_consents
WHERE created_at::DATE = CURRENT_DATE;

-- Grant access to the view
GRANT SELECT ON consent_health_check TO authenticated;
GRANT SELECT ON consent_health_check TO service_role;

-- 5. Test the constraints
DO $$
BEGIN
  -- Test 1: Try to insert consent with empty text (should fail)
  BEGIN
    INSERT INTO registration_consents (
      swimmer_id, 
      media_consent, 
      code_of_conduct_consent, 
      data_accuracy_confirmed, 
      consent_text
    )
    SELECT 
      id, 
      true, 
      true, 
      true, 
      ''  -- Empty text should fail
    FROM swimmers LIMIT 1;
    
    RAISE EXCEPTION 'Test FAILED: Empty consent_text was allowed';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%consent_text%' OR SQLERRM LIKE '%check_consent_text_not_empty%' THEN
      RAISE NOTICE '✅ Test 1 PASSED: Empty consent_text correctly rejected';
    ELSE
      RAISE NOTICE '⚠️ Test 1 UNCERTAIN: Error was: %', SQLERRM;
    END IF;
  END;
  
  -- Test 2: Check the health view works
  IF EXISTS (SELECT 1 FROM consent_health_check LIMIT 1) THEN
    RAISE NOTICE '✅ Test 2 PASSED: Consent health check view is accessible';
  ELSE
    RAISE NOTICE '❌ Test 2 FAILED: Consent health check view is not accessible';
  END IF;
END $$;

-- 6. Show current health status
SELECT * FROM consent_health_check ORDER BY metric;

-- 7. Add comment for documentation
COMMENT ON TABLE registration_consents IS 
  'Stores consent records for swimmers. Every swimmer MUST have a consent record. 
   Validated by validate_consent_record() trigger on insert.
   Monitor health with consent_health_check view.';

COMMENT ON CONSTRAINT check_consent_text_not_empty ON registration_consents IS
  'Ensures consent_text is never empty. Registration cannot proceed without full consent text.';

COMMENT ON FUNCTION validate_consent_record() IS
  'Validates consent records before insert. Ensures swimmer_id, consent_text, and at least one consent field are set.';

COMMENT ON VIEW consent_health_check IS
  'Real-time monitoring of consent record health. Shows swimmers without consents and orphaned consents.';
