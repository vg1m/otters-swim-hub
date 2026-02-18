-- Fix RLS policies to allow admins to view orphaned data (parent_id = NULL)
-- Issue: The invoices policy has `parent_id = auth.uid() OR` at the start
-- When parent_id is NULL, this condition returns NULL (not false), blocking access

-- Drop and recreate invoices policy with correct logic
DROP POLICY IF EXISTS "Admins can manage invoices" ON invoices;

CREATE POLICY "Admins can manage invoices"
  ON invoices FOR ALL
  USING (
    -- Service role can do everything
    auth.jwt()->>'role' = 'service_role' OR
    -- Admins can see ALL invoices (including orphaned ones with parent_id = NULL)
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    ) OR
    -- Parents can only see their own invoices (where parent_id matches)
    parent_id = auth.uid()
  );

-- Also fix payments table RLS (in case it has similar issues)
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
DROP POLICY IF EXISTS "Parents can view own payments" ON payments;

CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (
    -- Service role can do everything
    auth.jwt()->>'role' = 'service_role' OR
    -- Admins can see ALL payments
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    ) OR
    -- Parents can see payments for their invoices
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = payments.invoice_id 
      AND invoices.parent_id = auth.uid()
    )
  );

-- Fix registration_consents table RLS
DROP POLICY IF EXISTS "Admins can view all consents" ON registration_consents;
DROP POLICY IF EXISTS "Parents can view own consents" ON registration_consents;

CREATE POLICY "Admins can manage consents"
  ON registration_consents FOR ALL
  USING (
    -- Service role can do everything
    auth.jwt()->>'role' = 'service_role' OR
    -- Admins can see ALL consents (including orphaned ones)
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    ) OR
    -- Parents can see consents for their records
    parent_id = auth.uid()
  );

-- Verify the policies are correctly set
SELECT 
  tablename, 
  policyname,
  CASE 
    WHEN cmd = 'r' THEN 'SELECT'
    WHEN cmd = 'a' THEN 'INSERT'
    WHEN cmd = 'w' THEN 'UPDATE'
    WHEN cmd = 'd' THEN 'DELETE'
    WHEN cmd = '*' THEN 'ALL'
  END as command,
  qual::text as using_clause
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('invoices', 'payments', 'registration_consents')
ORDER BY tablename, policyname;

COMMENT ON POLICY "Admins can manage invoices" ON invoices IS 
  'Allows admins to view ALL invoices including orphaned ones (parent_id = NULL). Parents can only view their own invoices.';

COMMENT ON POLICY "Admins can manage payments" ON payments IS 
  'Allows admins to view ALL payments. Parents can only view payments linked to their invoices.';

COMMENT ON POLICY "Admins can manage consents" ON registration_consents IS 
  'Allows admins to view ALL consents including orphaned ones. Parents can only view their own consents.';
