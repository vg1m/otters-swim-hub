-- Link parent notifications to training sessions (schedule change alerts).

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_session_id
  ON public.notifications (session_id)
  WHERE session_id IS NOT NULL;

COMMENT ON TABLE public.notifications IS
  'Persisted event notifications for parents. Types include invoice_issued, payment_received, swimmer_approved, swimmer_rejected, squad_assigned, coach_assigned, session_schedule_changed.';
