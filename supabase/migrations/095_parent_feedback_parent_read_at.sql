-- Track when parent has seen admin reply (for unread badge).

ALTER TABLE public.parent_feedback
  ADD COLUMN IF NOT EXISTS parent_read_at TIMESTAMPTZ;

COMMENT ON COLUMN public.parent_feedback.parent_read_at IS
  'When the parent (or delegate) last viewed the admin response; null means unread reply.';

-- Existing answered tickets treated as already seen.
UPDATE public.parent_feedback
SET parent_read_at = responded_at
WHERE status = 'answered'
  AND responded_at IS NOT NULL
  AND parent_read_at IS NULL;
