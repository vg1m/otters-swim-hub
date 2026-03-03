-- Migration: Fix RLS policy for registration_consents
-- Allow parents to view consents via their swimmers, not just direct parent_id match

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Parents can view own consents" ON registration_consents;

-- Create new policy that allows parents to view consents for their swimmers
CREATE POLICY "Parents can view own consents"
  ON registration_consents FOR SELECT
  USING (
    parent_id = (SELECT auth.uid())
    OR
    swimmer_id IN (
      SELECT id FROM swimmers WHERE parent_id = (SELECT auth.uid())
    )
  );

-- Verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CONSENT RLS POLICY FIXED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Parents can now view consents via:';
  RAISE NOTICE '   1. Direct parent_id match (original)';
  RAISE NOTICE '   2. Swimmer ownership (NEW - fixes the issue)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Consent history should now display correctly!';
  RAISE NOTICE '';
END $$;

-- Show the new policy
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'registration_consents'
  AND policyname = 'Parents can view own consents';
