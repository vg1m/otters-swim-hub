-- Covering indexes for foreign keys flagged by Supabase Performance Advisor (lint 0001_unindexed_foreign_keys).
-- Improves DELETE/UPDATE on referenced tables and join planning.
--
-- Not addressed here (by design):
--   • unused_index (0005): stats reset on restart / low traffic; many listed indexes match real access patterns—drop only after prod verification.
--   • auth_db_connections_absolute: Supabase Dashboard → Project Settings → Auth / database pool—percentage-based allocation, not SQL.

CREATE INDEX IF NOT EXISTS idx_attendance_coach_id
  ON public.attendance (coach_id);

CREATE INDEX IF NOT EXISTS idx_coach_session_delivery_reviews_reviewed_by
  ON public.coach_session_delivery_reviews (reviewed_by);

CREATE INDEX IF NOT EXISTS idx_family_account_members_invited_by
  ON public.family_account_members (invited_by);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id
  ON public.invoice_line_items (invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoices_swimmer_id
  ON public.invoices (swimmer_id);

CREATE INDEX IF NOT EXISTS idx_meet_registrations_invoice_id
  ON public.meet_registrations (invoice_id);

CREATE INDEX IF NOT EXISTS idx_meet_registrations_swimmer_id
  ON public.meet_registrations (swimmer_id);

CREATE INDEX IF NOT EXISTS idx_notifications_invoice_id
  ON public.notifications (invoice_id);

CREATE INDEX IF NOT EXISTS idx_notifications_swimmer_id
  ON public.notifications (swimmer_id);

CREATE INDEX IF NOT EXISTS idx_profiles_coach_squad_id
  ON public.profiles (coach_squad_id);

CREATE INDEX IF NOT EXISTS idx_swimmer_performances_recorded_by
  ON public.swimmer_performances (recorded_by);
