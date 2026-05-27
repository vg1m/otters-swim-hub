-- Club-wide announcements published by admins.

CREATE TABLE public.club_announcements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  link_url     TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_club_announcements_published
  ON public.club_announcements (published_at DESC);

COMMENT ON TABLE public.club_announcements IS
  'Admin-published club announcements; fan-out to notifications on publish.';

ALTER TABLE public.club_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage club announcements"
  ON public.club_announcements
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Authenticated read club announcements"
  ON public.club_announcements
  FOR SELECT
  TO authenticated
  USING (true);
