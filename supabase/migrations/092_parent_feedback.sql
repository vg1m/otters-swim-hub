-- Parent feedback to admin with admin reply.

CREATE TABLE public.parent_feedback (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submitted_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject        TEXT NOT NULL,
  message        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'answered', 'closed')),
  admin_response TEXT,
  responded_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  responded_at   TIMESTAMPTZ,
  parent_read_at TIMESTAMPTZ,
  admin_read_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.parent_feedback.parent_read_at IS
  'When the parent last viewed the admin response; null means unread reply.';

COMMENT ON COLUMN public.parent_feedback.admin_read_at IS
  'When an admin last opened this ticket; null on open tickets means unread in admin inbox.';

CREATE INDEX idx_parent_feedback_parent ON public.parent_feedback (parent_id, created_at DESC);
CREATE INDEX idx_parent_feedback_status ON public.parent_feedback (status, created_at DESC);

COMMENT ON TABLE public.parent_feedback IS
  'Parent or family delegate feedback to admins; single admin response per ticket.';

ALTER TABLE public.parent_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage own feedback"
  ON public.parent_feedback
  FOR ALL
  TO authenticated
  USING (public.auth_user_can_access_parent_data(parent_id))
  WITH CHECK (public.auth_user_can_access_parent_data(parent_id));

CREATE POLICY "Admins manage all parent feedback"
  ON public.parent_feedback
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins can read family invites when viewing feedback context.
CREATE POLICY "Admins read family_account_members"
  ON public.family_account_members
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
