-- Migration: Convert session codes from UUID to 6-character alphanumeric codes
-- This makes codes easier for parents to enter manually

-- Function to generate 6-character alphanumeric codes
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excludes confusing chars (I,O,0,1)
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate 6 random characters
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM training_sessions WHERE qr_code_token = result) LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Update existing sessions to use new 6-character codes
-- This ensures all existing sessions have the new format
UPDATE training_sessions
SET qr_code_token = generate_session_code()
WHERE length(qr_code_token) > 6; -- Only update UUID-based codes

-- Modify the table to use the new function as default
ALTER TABLE training_sessions 
  ALTER COLUMN qr_code_token SET DEFAULT generate_session_code();

-- Add a comment for documentation
COMMENT ON FUNCTION generate_session_code() IS 'Generates a unique 6-character alphanumeric code for training session check-ins. Excludes confusing characters like I, O, 0, 1.';

-- Verify the changes
DO $$
DECLARE
  sample_code TEXT;
  code_count INTEGER;
BEGIN
  -- Check that codes are now 6 characters
  SELECT qr_code_token INTO sample_code
  FROM training_sessions
  LIMIT 1;
  
  IF sample_code IS NOT NULL THEN
    RAISE NOTICE 'Sample session code: %', sample_code;
    RAISE NOTICE 'Code length: %', length(sample_code);
  END IF;
  
  -- Count total sessions updated
  SELECT COUNT(*) INTO code_count
  FROM training_sessions
  WHERE length(qr_code_token) = 6;
  
  RAISE NOTICE 'Sessions with 6-character codes: %', code_count;
END $$;
