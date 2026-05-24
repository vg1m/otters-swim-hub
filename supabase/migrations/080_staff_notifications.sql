-- Staff notifications for admins and coaches (separate from parent notifications).

CREATE TABLE public.staff_notifications (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role                TEXT        NOT NULL CHECK (role IN ('admin', 'coach')),
  type                TEXT        NOT NULL,
  title               TEXT        NOT NULL,
  body                TEXT,
  swimmer_id          UUID        REFERENCES public.swimmers(id) ON DELETE SET NULL,
  session_id          UUID        REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  coach_assignment_id UUID        REFERENCES public.coach_assignments(id) ON DELETE SET NULL,
  invoice_id          UUID        REFERENCES public.invoices(id) ON DELETE SET NULL,
  dedupe_key          TEXT        NOT NULL,
  read_at             TIMESTAMPTZ,
  emailed_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT staff_notifications_recipient_type_dedupe UNIQUE (recipient_id, type, dedupe_key)
);

CREATE INDEX idx_staff_notifications_recipient_created
  ON public.staff_notifications (recipient_id, created_at DESC);

CREATE INDEX idx_staff_notifications_unread
  ON public.staff_notifications (recipient_id)
  WHERE read_at IS NULL;

CREATE INDEX idx_staff_notifications_swimmer_id
  ON public.staff_notifications (swimmer_id);

CREATE INDEX idx_staff_notifications_session_id
  ON public.staff_notifications (session_id);

CREATE INDEX idx_staff_notifications_coach_assignment_id
  ON public.staff_notifications (coach_assignment_id);

COMMENT ON TABLE public.staff_notifications IS
  'In-app notifications for admins and coaches. Written by admin actions, registration API, and pay cron.';

ALTER TABLE public.staff_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read own notifications"
  ON public.staff_notifications
  FOR SELECT
  USING (
    recipient_id = (SELECT auth.uid())
    AND role = (
      SELECT p.role FROM public.profiles p WHERE p.id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Staff mark own notifications read"
  ON public.staff_notifications
  FOR UPDATE
  USING (
    recipient_id = (SELECT auth.uid())
    AND role = (
      SELECT p.role FROM public.profiles p WHERE p.id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    recipient_id = (SELECT auth.uid())
    AND role = (
      SELECT p.role FROM public.profiles p WHERE p.id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins insert staff notifications"
  ON public.staff_notifications
  FOR INSERT
  WITH CHECK (public.is_admin());
