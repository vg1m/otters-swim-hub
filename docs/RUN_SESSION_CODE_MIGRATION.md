# Fix Session Code Length - URGENT

## Issue
Session codes are currently UUIDs (36 characters) making them impossible for parents to type manually. This causes the "Invalid session code" error.

## Solution
Run this migration to convert all codes to 6-character alphanumeric format.

## Steps to Fix

### 1. Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar

### 2. Run the Migration
Copy and paste the entire contents of:
```
supabase/migrations/035_short_session_codes.sql
```

Or use this direct SQL:

```sql
-- Function to generate 6-character alphanumeric codes
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  
  WHILE EXISTS (SELECT 1 FROM training_sessions WHERE qr_code_token = result) LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Update existing sessions
UPDATE training_sessions
SET qr_code_token = generate_session_code()
WHERE length(qr_code_token) > 6;

-- Set as default for new sessions
ALTER TABLE training_sessions 
  ALTER COLUMN qr_code_token SET DEFAULT generate_session_code();
```

### 3. Click "Run" or press Ctrl+Enter

### 4. Verify Success
Run this query to check:
```sql
SELECT 
  id,
  session_date,
  qr_code_token,
  length(qr_code_token) as code_length
FROM training_sessions
ORDER BY session_date DESC
LIMIT 10;
```

You should see codes like: `A2B3C4`, `X9Y2Z7`, `K4M8N2` (6 characters each)

## What Changed

### Before:
- Code: `550e8400-e29b-41d4-a716-446655440000` (36 characters - UUID)
- Parent experience: ❌ Impossible to type manually

### After:
- Code: `K4M8N2` (6 characters - easy!)
- Parent experience: ✅ Quick and simple

## Code Generation Rules
- **Length**: Exactly 6 characters
- **Characters**: A-Z (except I, O) and 2-9 (excludes 0, 1)
- **Why exclude?**: Prevents confusion between:
  - I (letter) and 1 (number)
  - O (letter) and 0 (number)
- **Format**: All uppercase (e.g., `K4M8N2`)
- **Uniqueness**: Guaranteed unique per session

## Expected Outcome
✅ All existing sessions get new 6-character codes
✅ New sessions automatically get 6-character codes
✅ Parents can easily type codes
✅ "Invalid session code" error is fixed

## Testing
After running the migration:
1. Go to `/admin/sessions`
2. Click "View Check-In Code" on any session
3. Code should now be 6 characters (e.g., `K4M8N2`)
4. Print or copy the code
5. Test check-in from parent's view at `/check-in`

## Support
If you encounter any issues:
1. Check the SQL output for error messages
2. Verify you have the correct database permissions
3. Ensure you're connected to the correct project
