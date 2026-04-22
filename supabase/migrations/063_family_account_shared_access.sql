-- Shared family access: co-parent / partner sees same swimmers & invoices as primary parent.
-- Primary remains canonical owner (swimmers.parent_id, invoices.parent_id unchanged).

-- ---------------------------------------------------------------------------
-- Membership table (must exist before auth_user_can_access_parent_data)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.family_account_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_parent_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  invited_email text NOT NULL,
  invited_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  invited_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_family_account_members_member
  ON public.family_account_members(member_user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_family_account_members_primary
  ON public.family_account_members(primary_parent_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_family_account_members_unique_email_active
  ON public.family_account_members(primary_parent_id, lower(trim(invited_email)))
  WHERE status IN ('pending', 'active');

COMMENT ON TABLE public.family_account_members IS
  'Links a secondary parent user to a primary parent account for shared hub access.';

ALTER TABLE public.family_account_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Primary parent manages family invites" ON public.family_account_members;
CREATE POLICY "Primary parent manages family invites"
  ON public.family_account_members
  FOR ALL
  TO authenticated
  USING (primary_parent_id = (SELECT auth.uid()))
  WITH CHECK (primary_parent_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Member can view own family link" ON public.family_account_members;
CREATE POLICY "Member can view own family link"
  ON public.family_account_members
  FOR SELECT
  TO authenticated
  USING (member_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Service role family_account_members" ON public.family_account_members;
CREATE POLICY "Service role family_account_members"
  ON public.family_account_members
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Helper: true if current user is the primary OR an active linked family member
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_can_access_parent_data(target_parent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    target_parent_id IS NOT NULL
    AND (
      target_parent_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.family_account_members fam
        WHERE fam.primary_parent_id = target_parent_id
          AND fam.member_user_id = (SELECT auth.uid())
          AND fam.status = 'active'
      )
    );
$$;

COMMENT ON FUNCTION public.auth_user_can_access_parent_data(uuid) IS
  'True if auth user is the given parent or an active family_account_members delegate.';

GRANT EXECUTE ON FUNCTION public.auth_user_can_access_parent_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_can_access_parent_data(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Claim pending invite after signup (email match)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_family_invite()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  em text;
  n int := 0;
BEGIN
  IF uid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT lower(trim(email)) INTO em FROM auth.users WHERE id = uid;
  IF em IS NULL OR em = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.family_account_members fam
  SET
    member_user_id = uid,
    status = 'active',
    accepted_at = coalesce(fam.accepted_at, now())
  WHERE lower(trim(fam.invited_email)) = em
    AND fam.status = 'pending'
    AND fam.member_user_id IS NULL;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_family_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_family_invite() TO service_role;

-- ---------------------------------------------------------------------------
-- Swimmers: read/update for delegates; insert only for primary (unchanged)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can view own swimmers" ON public.swimmers;
CREATE POLICY "Parents can view own swimmers" ON public.swimmers
  FOR SELECT TO authenticated
  USING (public.auth_user_can_access_parent_data(parent_id));

DROP POLICY IF EXISTS "Parents can insert own swimmers" ON public.swimmers;
CREATE POLICY "Parents can insert own swimmers" ON public.swimmers
  FOR INSERT TO authenticated
  WITH CHECK (parent_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Parents can update own swimmers" ON public.swimmers;
CREATE POLICY "Parents can update own swimmers" ON public.swimmers
  FOR UPDATE TO authenticated
  USING (parent_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- Invoices & line items & receipts
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can view own invoices" ON public.invoices;
CREATE POLICY "Parents can view own invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (public.auth_user_can_access_parent_data(parent_id));

DROP POLICY IF EXISTS "Users can view invoice items" ON public.invoice_line_items;
CREATE POLICY "Users can view invoice items" ON public.invoice_line_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND public.auth_user_can_access_parent_data(i.parent_id)
    )
  );

DROP POLICY IF EXISTS "Parents can view own receipts" ON public.receipts;
CREATE POLICY "Parents can view own receipts" ON public.receipts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = receipts.invoice_id
        AND public.auth_user_can_access_parent_data(i.parent_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Registration consents
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can view own consents" ON public.registration_consents;
CREATE POLICY "Parents can view own consents" ON public.registration_consents
  FOR SELECT TO authenticated
  USING (
    public.auth_user_can_access_parent_data(parent_id)
    OR swimmer_id IN (
      SELECT s.id FROM public.swimmers s
      WHERE public.auth_user_can_access_parent_data(s.parent_id)
    )
  );

DROP POLICY IF EXISTS "Parents can update own media consent" ON public.registration_consents;
CREATE POLICY "Parents can update own media consent" ON public.registration_consents
  FOR UPDATE TO authenticated
  USING (parent_id = (SELECT auth.uid()))
  WITH CHECK (parent_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- Attendance: co-parent can view; only primary inserts "mark own" (unchanged)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can view own swimmer attendance" ON public.attendance;
CREATE POLICY "Parents can view own swimmer attendance" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.swimmers s
      WHERE s.id = attendance.swimmer_id
        AND public.auth_user_can_access_parent_data(s.parent_id)
    )
  );

DROP POLICY IF EXISTS "Users can mark own attendance" ON public.attendance;
CREATE POLICY "Users can mark own attendance" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.swimmers s
      WHERE s.id = attendance.swimmer_id
        AND s.parent_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Meet registrations
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can view own meet registrations" ON public.meet_registrations;
CREATE POLICY "Parents can view own meet registrations" ON public.meet_registrations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.swimmers s
      WHERE s.id = meet_registrations.swimmer_id
        AND public.auth_user_can_access_parent_data(s.parent_id)
    )
  );

DROP POLICY IF EXISTS "Parents can register own swimmers" ON public.meet_registrations;
CREATE POLICY "Parents can register own swimmers" ON public.meet_registrations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.swimmers s
      WHERE s.id = meet_registrations.swimmer_id
        AND public.auth_user_can_access_parent_data(s.parent_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Performances & coach notes (parent read paths)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can view own swimmer performances" ON public.swimmer_performances;
CREATE POLICY "Parents can view own swimmer performances" ON public.swimmer_performances
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.swimmers s
      WHERE s.id = swimmer_performances.swimmer_id
        AND public.auth_user_can_access_parent_data(s.parent_id)
    )
  );

DROP POLICY IF EXISTS "Parents can view non-private notes for own swimmers" ON public.coach_notes;
CREATE POLICY "Parents can view non-private notes for own swimmers" ON public.coach_notes
  FOR SELECT TO authenticated
  USING (
    is_private = false
    AND EXISTS (
      SELECT 1 FROM public.swimmers s
      WHERE s.id = coach_notes.swimmer_id
        AND public.auth_user_can_access_parent_data(s.parent_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Coach profile visibility for parents (059): include delegated parents
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.parent_has_coach_note_visible(p_coach_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coach_notes cn
    INNER JOIN public.swimmers s ON s.id = cn.swimmer_id
    WHERE cn.coach_id = p_coach_id
      AND public.auth_user_can_access_parent_data(s.parent_id)
      AND cn.is_private = false
  );
$$;
