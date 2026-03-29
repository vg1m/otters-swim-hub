-- Break RLS recursion: profiles <-> swimmers when policies read each other.
-- SECURITY DEFINER helpers still apply RLS to inner queries unless row_security is off.
-- Also replace EXISTS(subquery on profiles) on swimmers with is_*() helpers.

-- ---------------------------------------------------------------------------
-- 1. Role helpers: bypass RLS inside function body (trusted reads of profiles)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'coach'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_coach()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'coach')
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Admin check for RLS; row_security off avoids profiles↔swimmers recursion.';
COMMENT ON FUNCTION public.is_coach() IS
  'Coach check for RLS; row_security off avoids profiles↔swimmers recursion.';
COMMENT ON FUNCTION public.is_admin_or_coach() IS
  'Admin or coach check for RLS; row_security off avoids recursion.';

-- ---------------------------------------------------------------------------
-- 2. Parent coach visibility: reading swimmers/coach_notes must not re-enter swimmers RLS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.parent_has_coach_note_visible(p_coach_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coach_notes cn
    INNER JOIN public.swimmers s ON s.id = cn.swimmer_id
    WHERE cn.coach_id = p_coach_id
      AND s.parent_id = (SELECT auth.uid())
      AND cn.is_private = false
  );
$$;

COMMENT ON FUNCTION public.parent_has_coach_note_visible(uuid) IS
  'Parent visibility of coach profile via notes; row_security off avoids swimmers RLS recursion.';

-- ---------------------------------------------------------------------------
-- 3. Swimmers: stop subqueries that read profiles from within swimmers RLS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can manage swimmers" ON public.swimmers;
CREATE POLICY "Admins can manage swimmers" ON public.swimmers
  FOR ALL
  USING (public.is_admin_or_coach())
  WITH CHECK (public.is_admin_or_coach());

DROP POLICY IF EXISTS "Coaches can view squad swimmers" ON public.swimmers;
CREATE POLICY "Coaches can view squad swimmers" ON public.swimmers
  FOR SELECT
  USING (public.is_coach());

-- ---------------------------------------------------------------------------
-- 4. attendance / training_sessions: avoid EXISTS(profiles) under RLS
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Coaches can manage attendance" ON public.attendance;
CREATE POLICY "Coaches can manage attendance" ON public.attendance
  FOR ALL
  USING (public.is_admin_or_coach())
  WITH CHECK (public.is_admin_or_coach());

DROP POLICY IF EXISTS "Admins can manage training sessions" ON public.training_sessions;
CREATE POLICY "Admins can manage training sessions" ON public.training_sessions
  FOR ALL
  USING (public.is_admin_or_coach())
  WITH CHECK (public.is_admin_or_coach());
