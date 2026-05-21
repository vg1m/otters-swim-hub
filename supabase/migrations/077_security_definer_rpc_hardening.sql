-- Supabase security advisor (lint 0028 / 0029): harden SECURITY DEFINER RPC surface.
-- 076 introduced clone_rubric_template + squads_ensure_rubric_on_enable; revoke anon/PUBLIC
-- execute explicitly (REVOKE ALL FROM PUBLIC is not enough on Supabase for PostgREST).
-- Re-assert revokes on rubric helpers and other definer RPCs after any CREATE OR REPLACE.

-- -----------------------------------------------------------------------------
-- 1) clone_rubric_template: server/trigger only — never anon/authenticated RPC
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clone_rubric_template(
  p_target_slug text,
  p_source_slug text DEFAULT 'dev2'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  src_domain public.rubric_domains%ROWTYPE;
  new_domain_id uuid;
  jwt_role text;
BEGIN
  jwt_role := COALESCE(auth.jwt() ->> 'role', '');

  -- Block direct PostgREST calls from browsers; allow triggers and migrations.
  IF pg_trigger_depth() = 0 AND jwt_role IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'clone_rubric_template is not authorized for client RPC'
      USING ERRCODE = '42501';
  END IF;

  IF p_target_slug IS NULL OR trim(p_target_slug) = '' THEN
    RETURN;
  END IF;
  IF p_source_slug IS NULL OR trim(p_source_slug) = '' THEN
    RETURN;
  END IF;
  IF p_target_slug = p_source_slug THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.rubric_domains WHERE squad_slug = p_target_slug LIMIT 1
  ) THEN
    RETURN;
  END IF;

  FOR src_domain IN
    SELECT *
    FROM public.rubric_domains
    WHERE squad_slug = p_source_slug
    ORDER BY sort_order, id
  LOOP
    INSERT INTO public.rubric_domains (squad_slug, section, domain_name, sort_order, is_custom)
    VALUES (p_target_slug, src_domain.section, src_domain.domain_name, src_domain.sort_order, false)
    RETURNING id INTO new_domain_id;

    INSERT INTO public.rubric_milestones (domain_id, text, sort_order, is_custom)
    SELECT new_domain_id, m.text, m.sort_order, false
    FROM public.rubric_milestones m
    WHERE m.domain_id = src_domain.id
      AND m.is_custom = false;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.clone_rubric_template(text, text) IS
  'Copies non-custom rubric_domains/milestones from source slug to target slug if target has none. Not exposed to anon/authenticated RPC.';

REVOKE ALL ON FUNCTION public.clone_rubric_template(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clone_rubric_template(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.clone_rubric_template(text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.clone_rubric_template(text, text) TO service_role;

-- -----------------------------------------------------------------------------
-- 2) squads_ensure_rubric_on_enable: trigger-only (no PostgREST RPC)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.squads_ensure_rubric_on_enable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.rubrics_enabled = true
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.rubrics_enabled, false) = false) THEN
    PERFORM public.clone_rubric_template(NEW.slug, 'dev2');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.squads_ensure_rubric_on_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.squads_ensure_rubric_on_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.squads_ensure_rubric_on_enable() FROM authenticated;

-- -----------------------------------------------------------------------------
-- 3) Rubric auth helpers: anon must not execute (authenticated: intentional for RLS)
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.auth_can_manage_swimmer_rubric(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auth_can_manage_swimmer_rubric(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.auth_can_manage_swimmer_rubric(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_can_manage_swimmer_rubric(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.auth_can_manage_rubric_squad_slug(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auth_can_manage_rubric_squad_slug(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.auth_can_manage_rubric_squad_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_can_manage_rubric_squad_slug(text) TO service_role;

-- -----------------------------------------------------------------------------
-- 4) Re-assert 070 pattern on other SECURITY DEFINER RPCs (anon/PUBLIC closed)
-- -----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.auth_user_can_access_parent_data(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auth_user_can_access_parent_data(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.auth_user_can_access_parent_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_can_access_parent_data(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.claim_family_invite() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_family_invite() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_family_invite() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_family_invite() TO service_role;

REVOKE EXECUTE ON FUNCTION public.calculate_invoice_total() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_invoice_total() FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_invoice_total() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.generate_session_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_session_code() FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_session_code() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_coach() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_coach() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_coach() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_coach() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_coach() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_coach() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.parent_has_coach_note_visible(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.parent_has_coach_note_visible(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.parent_has_coach_note_visible(uuid) TO authenticated;
