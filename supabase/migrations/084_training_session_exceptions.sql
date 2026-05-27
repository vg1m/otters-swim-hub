-- Per-occurrence overrides and cancellations for recurring training session series.

CREATE TABLE public.training_session_exceptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  status          TEXT NOT NULL CHECK (status IN ('cancelled', 'override')),
  start_time      TIME,
  end_time        TIME,
  coach_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  facility_id     UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  pool_location   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT training_session_exceptions_session_date_unique
    UNIQUE (session_id, occurrence_date)
);

CREATE INDEX idx_training_session_exceptions_session_id
  ON public.training_session_exceptions (session_id);

CREATE INDEX idx_training_session_exceptions_occurrence_date
  ON public.training_session_exceptions (occurrence_date);

COMMENT ON TABLE public.training_session_exceptions IS
  'Overrides or cancellations for a single date in a recurring session series.';

CREATE TABLE public.training_session_exception_squads (
  exception_id UUID NOT NULL REFERENCES public.training_session_exceptions(id) ON DELETE CASCADE,
  squad_id     UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
  PRIMARY KEY (exception_id, squad_id)
);

CREATE INDEX idx_training_session_exception_squads_exception
  ON public.training_session_exception_squads (exception_id);

ALTER TABLE public.training_session_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_session_exception_squads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and coaches manage session exceptions"
  ON public.training_session_exceptions
  FOR ALL
  USING (public.is_admin_or_coach())
  WITH CHECK (public.is_admin_or_coach());

CREATE POLICY "Admins and coaches manage exception squads"
  ON public.training_session_exception_squads
  FOR ALL
  USING (public.is_admin_or_coach())
  WITH CHECK (public.is_admin_or_coach());

CREATE TRIGGER training_session_exceptions_updated_at
  BEFORE UPDATE ON public.training_session_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
