-- Cover FK columns flagged by Supabase unindexed_foreign_keys (INFO).
-- Helps profile deletes/updates and any joins/filtering by rated_by.

CREATE INDEX IF NOT EXISTS idx_smr_rated_by
  ON public.swimmer_milestone_ratings (rated_by);

CREATE INDEX IF NOT EXISTS idx_sar_rated_by
  ON public.swimmer_attitude_ratings (rated_by);
