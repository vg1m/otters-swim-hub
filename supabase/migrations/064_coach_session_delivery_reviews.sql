-- Admin sign-off for coach service / pay justification (one row per training session)
CREATE TABLE IF NOT EXISTS public.coach_session_delivery_reviews (
  session_id UUID PRIMARY KEY REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_coach_session_delivery_reviews_coach
  ON public.coach_session_delivery_reviews (coach_id);

CREATE INDEX IF NOT EXISTS idx_coach_session_delivery_reviews_reviewed_at
  ON public.coach_session_delivery_reviews (reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_training_sessions_coach_date
  ON public.training_sessions (coach_id, session_date)
  WHERE coach_id IS NOT NULL;

COMMENT ON TABLE public.coach_session_delivery_reviews IS
  'Admin audit: service delivery reviewed per session; independent of parent billing.';

CREATE OR REPLACE FUNCTION public.coach_session_delivery_reviews_coach_matches_session()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.training_sessions ts
    WHERE ts.id = NEW.session_id
      AND ts.coach_id IS NOT NULL
      AND ts.coach_id = NEW.coach_id
  ) THEN
    RAISE EXCEPTION 'coach_session_delivery_reviews: coach_id must match training_sessions.coach_id for this session_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coach_session_delivery_reviews_match ON public.coach_session_delivery_reviews;
CREATE TRIGGER trg_coach_session_delivery_reviews_match
  BEFORE INSERT OR UPDATE OF session_id, coach_id
  ON public.coach_session_delivery_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.coach_session_delivery_reviews_coach_matches_session();

ALTER TABLE public.coach_session_delivery_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access coach session delivery reviews" ON public.coach_session_delivery_reviews;
CREATE POLICY "Admins full access coach session delivery reviews"
  ON public.coach_session_delivery_reviews
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_session_delivery_reviews TO authenticated;
