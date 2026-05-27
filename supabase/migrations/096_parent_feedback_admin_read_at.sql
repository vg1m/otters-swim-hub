-- Track when admin has seen an open feedback ticket (nav badge).

ALTER TABLE public.parent_feedback
  ADD COLUMN IF NOT EXISTS admin_read_at TIMESTAMPTZ;

COMMENT ON COLUMN public.parent_feedback.admin_read_at IS
  'When an admin last opened this ticket; null on open tickets means unread in admin inbox.';

-- Answered/closed tickets are not shown as needing attention.
UPDATE public.parent_feedback
SET admin_read_at = COALESCE(responded_at, created_at)
WHERE status <> 'open'
  AND admin_read_at IS NULL;
