-- Supabase Performance Advisor:
--   auth_rls_initplan: use ((SELECT auth.jwt()) ->> 'role') so JWT reads are InitPlan-stable.
--   multiple_permissive_policies: merge overlapping permissive policies with equivalent OR predicates,
--     splitting FOR ALL patterns into single-command policies (no Postgres "FOR INSERT, DELETE" shorthand).

-- -----------------------------------------------------------------------------
-- 1) profiles: narrower SELECT + UPDATE than old "FOR ALL JWT"; service_role kept explicit
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role can do anything" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view coaches linked via notes on own swimmers" ON public.profiles;

CREATE POLICY "profiles_select_scope"
  ON public.profiles
  FOR SELECT
  USING (
    (id = (SELECT auth.uid()))
    OR public.is_admin()
    OR (
      role = 'coach'
      AND public.parent_has_coach_note_visible(profiles.id)
    )
  );

CREATE POLICY "Service role full access profiles"
  ON public.profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

CREATE POLICY "profiles_update_members"
  ON public.profiles
  FOR UPDATE
  USING (
    id = (SELECT auth.uid())
    OR public.is_admin()
  )
  WITH CHECK (
    id = (SELECT auth.uid())
    OR public.is_admin()
  );

-- -----------------------------------------------------------------------------
-- 2) payments: admin DML vs single INSERT permitting service_role JWT (narrower than FOR ALL + JWT)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;

CREATE POLICY "payments_select_admin"
  ON public.payments
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "payments_insert_admin_or_service_role"
  ON public.payments
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (((SELECT auth.jwt()) ->> 'role') = 'service_role')
  );

CREATE POLICY "payments_update_admin"
  ON public.payments
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "payments_delete_admin"
  ON public.payments
  FOR DELETE
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3) receipts: parents/authenticated SELECT merged; admin DML kept separate from service INSERT
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role can insert receipts" ON public.receipts;
DROP POLICY IF EXISTS "Admins can manage receipts" ON public.receipts;
DROP POLICY IF EXISTS "Parents can view own receipts" ON public.receipts;

CREATE POLICY "receipts_select_scope"
  ON public.receipts
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = receipts.invoice_id
        AND public.auth_user_can_access_parent_data(i.parent_id)
    )
  );

CREATE POLICY "receipts_insert_admin_or_service_role"
  ON public.receipts
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (((SELECT auth.jwt()) ->> 'role') = 'service_role')
  );

CREATE POLICY "receipts_update_admin"
  ON public.receipts
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "receipts_delete_admin"
  ON public.receipts
  FOR DELETE
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4) registration_consents: merged SELECT/UPDATE; INSERT is admin or service_role JWT only
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role can insert consents" ON public.registration_consents;
DROP POLICY IF EXISTS "Admins can manage consents" ON public.registration_consents;
DROP POLICY IF EXISTS "Parents can view own consents" ON public.registration_consents;
DROP POLICY IF EXISTS "Parents can update own media consent" ON public.registration_consents;

CREATE POLICY "registration_consents_select_parents_and_admins"
  ON public.registration_consents
  FOR SELECT
  USING (
    public.is_admin()
    OR public.auth_user_can_access_parent_data(parent_id)
    OR swimmer_id IN (
      SELECT s.id FROM public.swimmers s
      WHERE public.auth_user_can_access_parent_data(s.parent_id)
    )
  );

CREATE POLICY "registration_consents_update_parents_or_admins"
  ON public.registration_consents
  FOR UPDATE
  USING (
    public.is_admin()
    OR parent_id = (SELECT auth.uid())
  )
  WITH CHECK (
    public.is_admin()
    OR parent_id = (SELECT auth.uid())
  );

CREATE POLICY "registration_consents_insert_admin_or_service_role"
  ON public.registration_consents
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR (((SELECT auth.jwt()) ->> 'role') = 'service_role')
  );

CREATE POLICY "registration_consents_delete_admin"
  ON public.registration_consents
  FOR DELETE
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 5) attendance: merge coach ALL with parent SELECT / primary-parent INSERT (+ staff UPDATE/DELETE only)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Coaches can manage attendance" ON public.attendance;
DROP POLICY IF EXISTS "Parents can view own swimmer attendance" ON public.attendance;
DROP POLICY IF EXISTS "Users can mark own attendance" ON public.attendance;

CREATE POLICY "attendance_select_parents_or_staff"
  ON public.attendance
  FOR SELECT
  USING (
    public.is_admin_or_coach()
    OR EXISTS (
      SELECT 1 FROM public.swimmers s
      WHERE s.id = attendance.swimmer_id
        AND public.auth_user_can_access_parent_data(s.parent_id)
    )
  );

CREATE POLICY "attendance_insert_parents_or_staff"
  ON public.attendance
  FOR INSERT
  WITH CHECK (
    public.is_admin_or_coach()
    OR EXISTS (
      SELECT 1 FROM public.swimmers s
      WHERE s.id = attendance.swimmer_id
        AND s.parent_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "attendance_update_staff"
  ON public.attendance
  FOR UPDATE
  USING (public.is_admin_or_coach())
  WITH CHECK (public.is_admin_or_coach());

CREATE POLICY "attendance_delete_staff"
  ON public.attendance
  FOR DELETE
  USING (public.is_admin_or_coach());

-- -----------------------------------------------------------------------------
-- 6) coach_assignments
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage assignments" ON public.coach_assignments;
DROP POLICY IF EXISTS "Coaches can view own assignments" ON public.coach_assignments;

CREATE POLICY "coach_assignments_select_scope"
  ON public.coach_assignments
  FOR SELECT
  USING (
    public.is_admin()
    OR coach_id = (SELECT auth.uid())
  );

CREATE POLICY "coach_assignments_insert_admin"
  ON public.coach_assignments
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "coach_assignments_update_admin"
  ON public.coach_assignments
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "coach_assignments_delete_admin"
  ON public.coach_assignments
  FOR DELETE
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 7) coach_session_pay_events
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage coach session pay events" ON public.coach_session_pay_events;
DROP POLICY IF EXISTS "Coaches can view own session pay events" ON public.coach_session_pay_events;

CREATE POLICY "coach_session_pay_events_select_scope"
  ON public.coach_session_pay_events
  FOR SELECT
  USING (
    public.is_admin()
    OR coach_id = (SELECT auth.uid())
  );

CREATE POLICY "coach_session_pay_events_insert_admin"
  ON public.coach_session_pay_events
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "coach_session_pay_events_update_admin"
  ON public.coach_session_pay_events
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "coach_session_pay_events_delete_admin"
  ON public.coach_session_pay_events
  FOR DELETE
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 8) coach_notes: single SELECT covering staff + delegated parents (same TO scope as sibling policies)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Coaches can view notes for assigned swimmers" ON public.coach_notes;
DROP POLICY IF EXISTS "Parents can view non-private notes for own swimmers" ON public.coach_notes;

CREATE POLICY "coach_notes_select_parents_or_staff"
  ON public.coach_notes
  FOR SELECT
  USING (
    public.is_admin_or_coach()
    OR (
      is_private = false
      AND EXISTS (
        SELECT 1 FROM public.swimmers s
        WHERE s.id = coach_notes.swimmer_id
          AND public.auth_user_can_access_parent_data(s.parent_id)
      )
    )
  );

-- -----------------------------------------------------------------------------
-- 9) Public read catalogs (+ facilities from 043)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view facilities" ON public.facilities;
DROP POLICY IF EXISTS "Admins can manage facilities" ON public.facilities;
CREATE POLICY "facilities_select_all" ON public.facilities FOR SELECT USING (true);
CREATE POLICY "facilities_insert_admin"
  ON public.facilities FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "facilities_update_admin"
  ON public.facilities FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "facilities_delete_admin"
  ON public.facilities FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view schedules" ON public.facility_schedules;
DROP POLICY IF EXISTS "Admins can manage schedules" ON public.facility_schedules;
CREATE POLICY "facility_schedules_select_all"
  ON public.facility_schedules FOR SELECT USING (true);
CREATE POLICY "facility_schedules_insert_admin"
  ON public.facility_schedules FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "facility_schedules_update_admin"
  ON public.facility_schedules FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "facility_schedules_delete_admin"
  ON public.facility_schedules FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view capacity rules" ON public.lane_capacity_rules;
DROP POLICY IF EXISTS "Admins can manage capacity rules" ON public.lane_capacity_rules;
CREATE POLICY "lane_capacity_rules_select_all"
  ON public.lane_capacity_rules FOR SELECT USING (true);
CREATE POLICY "lane_capacity_rules_insert_admin"
  ON public.lane_capacity_rules FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "lane_capacity_rules_update_admin"
  ON public.lane_capacity_rules FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "lane_capacity_rules_delete_admin"
  ON public.lane_capacity_rules FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view meets" ON public.meets;
DROP POLICY IF EXISTS "Admins can manage meets" ON public.meets;
CREATE POLICY "meets_select_all" ON public.meets FOR SELECT USING (true);
CREATE POLICY "meets_insert_admin" ON public.meets FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "meets_update_admin"
  ON public.meets FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "meets_delete_admin" ON public.meets FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view squads" ON public.squads;
DROP POLICY IF EXISTS "Admins manage squads" ON public.squads;
CREATE POLICY "squads_select_all" ON public.squads FOR SELECT USING (true);
CREATE POLICY "squads_insert_admin"
  ON public.squads FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "squads_update_admin"
  ON public.squads FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "squads_delete_admin"
  ON public.squads FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view facility schedule squads" ON public.facility_schedule_squads;
DROP POLICY IF EXISTS "Admins manage facility schedule squads" ON public.facility_schedule_squads;
CREATE POLICY "facility_schedule_squads_select_all"
  ON public.facility_schedule_squads FOR SELECT USING (true);
CREATE POLICY "facility_schedule_squads_insert_admin"
  ON public.facility_schedule_squads FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "facility_schedule_squads_update_admin"
  ON public.facility_schedule_squads FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "facility_schedule_squads_delete_admin"
  ON public.facility_schedule_squads FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view training session squads" ON public.training_session_squads;
DROP POLICY IF EXISTS "Admins manage training session squads" ON public.training_session_squads;
CREATE POLICY "training_session_squads_select_all"
  ON public.training_session_squads FOR SELECT USING (true);
CREATE POLICY "training_session_squads_insert_admin"
  ON public.training_session_squads FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "training_session_squads_update_admin"
  ON public.training_session_squads FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "training_session_squads_delete_admin"
  ON public.training_session_squads FOR DELETE USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can view training sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Admins can manage training sessions" ON public.training_sessions;
CREATE POLICY "training_sessions_select_all"
  ON public.training_sessions FOR SELECT USING (true);
CREATE POLICY "training_sessions_insert_staff"
  ON public.training_sessions FOR INSERT WITH CHECK (public.is_admin_or_coach());
CREATE POLICY "training_sessions_update_staff"
  ON public.training_sessions
  FOR UPDATE
  USING (public.is_admin_or_coach())
  WITH CHECK (public.is_admin_or_coach());
CREATE POLICY "training_sessions_delete_staff"
  ON public.training_sessions FOR DELETE USING (public.is_admin_or_coach());

-- -----------------------------------------------------------------------------
-- 10) meet_registrations
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can view own meet registrations" ON public.meet_registrations;
DROP POLICY IF EXISTS "Parents can register own swimmers" ON public.meet_registrations;
DROP POLICY IF EXISTS "Admins can manage meet registrations" ON public.meet_registrations;

CREATE POLICY "meet_registrations_select_scope"
  ON public.meet_registrations
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.swimmers s
      WHERE s.id = meet_registrations.swimmer_id
        AND public.auth_user_can_access_parent_data(s.parent_id)
    )
  );

CREATE POLICY "meet_registrations_insert_scope"
  ON public.meet_registrations
  FOR INSERT
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.swimmers s
      WHERE s.id = meet_registrations.swimmer_id
        AND public.auth_user_can_access_parent_data(s.parent_id)
    )
  );

CREATE POLICY "meet_registrations_update_admin"
  ON public.meet_registrations
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "meet_registrations_delete_admin"
  ON public.meet_registrations
  FOR DELETE
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 11) invoices + invoice_line_items
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can view own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins can manage invoices" ON public.invoices;

CREATE POLICY "invoices_select_scope"
  ON public.invoices
  FOR SELECT
  USING (
    public.is_admin()
    OR public.auth_user_can_access_parent_data(parent_id)
  );

CREATE POLICY "invoices_insert_admin"
  ON public.invoices
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "invoices_update_admin"
  ON public.invoices
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "invoices_delete_admin"
  ON public.invoices
  FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view invoice items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Admins can manage invoice items" ON public.invoice_line_items;

CREATE POLICY "invoice_line_items_select_scope"
  ON public.invoice_line_items
  FOR SELECT
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_line_items.invoice_id
        AND public.auth_user_can_access_parent_data(i.parent_id)
    )
  );

CREATE POLICY "invoice_line_items_insert_admin"
  ON public.invoice_line_items
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "invoice_line_items_update_admin"
  ON public.invoice_line_items
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "invoice_line_items_delete_admin"
  ON public.invoice_line_items
  FOR DELETE
  USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 12) family_account_members
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Primary parent manages family invites" ON public.family_account_members;
DROP POLICY IF EXISTS "Member can view own family link" ON public.family_account_members;

CREATE POLICY "family_account_members_select_delegates"
  ON public.family_account_members
  FOR SELECT
  USING (
    primary_parent_id = (SELECT auth.uid())
    OR member_user_id = (SELECT auth.uid())
  );

CREATE POLICY "family_account_members_insert_primary"
  ON public.family_account_members
  FOR INSERT
  WITH CHECK (primary_parent_id = (SELECT auth.uid()));

CREATE POLICY "family_account_members_update_primary"
  ON public.family_account_members
  FOR UPDATE
  USING (primary_parent_id = (SELECT auth.uid()))
  WITH CHECK (primary_parent_id = (SELECT auth.uid()));

CREATE POLICY "family_account_members_delete_primary"
  ON public.family_account_members
  FOR DELETE
  USING (primary_parent_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- 13) swimmer_performances SELECT merge
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Parents can view own swimmer performances" ON public.swimmer_performances;
DROP POLICY IF EXISTS "Coaches and admins can view all performances" ON public.swimmer_performances;

CREATE POLICY "swimmer_performances_select_scope"
  ON public.swimmer_performances
  FOR SELECT
  USING (
    public.is_admin_or_coach()
    OR EXISTS (
      SELECT 1 FROM public.swimmers s
      WHERE s.id = swimmer_performances.swimmer_id
        AND public.auth_user_can_access_parent_data(s.parent_id)
    )
  );

-- -----------------------------------------------------------------------------
-- 14) swimmers: one SELECT; split writes (coach/staff vs primary parent)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage swimmers" ON public.swimmers;
DROP POLICY IF EXISTS "Coaches can view squad swimmers" ON public.swimmers;
DROP POLICY IF EXISTS "Coaches can view assigned swimmers" ON public.swimmers;
DROP POLICY IF EXISTS "Parents can view own swimmers" ON public.swimmers;

CREATE POLICY "swimmers_select_scope"
  ON public.swimmers
  FOR SELECT
  USING (
    public.is_admin_or_coach()
    OR public.auth_user_can_access_parent_data(parent_id)
  );

DROP POLICY IF EXISTS "Parents can insert own swimmers" ON public.swimmers;
DROP POLICY IF EXISTS "Parents can update own swimmers" ON public.swimmers;

CREATE POLICY "swimmers_insert_staff_or_primary_parent"
  ON public.swimmers
  FOR INSERT
  WITH CHECK (
    public.is_admin_or_coach()
    OR parent_id = (SELECT auth.uid())
  );

CREATE POLICY "swimmers_update_staff_or_primary_parent"
  ON public.swimmers
  FOR UPDATE
  USING (
    public.is_admin_or_coach()
    OR parent_id = (SELECT auth.uid())
  )
  WITH CHECK (
    public.is_admin_or_coach()
    OR parent_id = (SELECT auth.uid())
  );

CREATE POLICY "swimmers_delete_staff"
  ON public.swimmers
  FOR DELETE
  USING (public.is_admin_or_coach());
