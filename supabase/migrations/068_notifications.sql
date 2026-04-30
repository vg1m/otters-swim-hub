-- Parent-facing notifications: persisted event log for changes that matter.
-- Types: invoice_issued | payment_received | swimmer_approved |
--        swimmer_rejected | squad_assigned | coach_assigned

CREATE TABLE public.notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  body        TEXT,
  swimmer_id  UUID        REFERENCES public.swimmers(id)  ON DELETE SET NULL,
  invoice_id  UUID        REFERENCES public.invoices(id)  ON DELETE SET NULL,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_parent
  ON public.notifications (parent_id, created_at DESC);

CREATE INDEX idx_notifications_unread
  ON public.notifications (parent_id)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Parents: read their own notifications
CREATE POLICY "Parents read own notifications"
  ON public.notifications
  FOR SELECT
  USING (parent_id = (SELECT auth.uid()));

-- Parents: mark their own notifications as read (update read_at only)
CREATE POLICY "Parents mark own notifications read"
  ON public.notifications
  FOR UPDATE
  USING (parent_id = (SELECT auth.uid()))
  WITH CHECK (parent_id = (SELECT auth.uid()));

-- Admins (client JWT): insert notifications for any parent
CREATE POLICY "Admins insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Service role bypasses RLS entirely (webhook route).
-- No extra policy needed for service_role.

COMMENT ON TABLE public.notifications IS
  'Persisted event notifications for parents. Written by admin actions and the Paystack webhook. Read by parents from their dashboard.';
