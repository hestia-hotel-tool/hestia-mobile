-- Back office: platform admins ("super admins") hardened to the usual
-- multi-tenant standard (hestia-backoffice, after B1/B2).
--
-- 1. Platform powers need a second factor: is_platform_admin() is true only in
--    a session at AAL2 (TOTP verified). Membership alone (platform_admin_member)
--    lets the back office send the person to set up or enter their code.
-- 2. platform_audit_log: every hotel switch and every grant or revoke, readable
--    by platform admins only, written only by the functions below.
-- 3. platform_switch_hotel() records the switch (from, to).
-- 4. platform_grant_admin() / platform_revoke_admin(): service role only (the
--    SQL editor, scripts). The app can never make someone a platform admin.
--
-- Mobile impact: none. Platform admins aren't line staff; on mobile their
-- session is AAL1, so they act with their job title's permissions there.

-- ===========================================================================
-- 1. Membership, and powers that need AAL2
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.platform_admin_member()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid());
$$;
COMMENT ON FUNCTION public.platform_admin_member() IS
  'The caller is on the platform team, whether or not this session has passed MFA. For routing to /mfa only; checks use is_platform_admin().';
REVOKE ALL ON FUNCTION public.platform_admin_member() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.platform_admin_member() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
     AND coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;
COMMENT ON FUNCTION public.is_platform_admin() IS
  'A platform admin in a session verified with a second factor (AAL2). Every platform power checks this.';

-- ===========================================================================
-- 2. Audit log
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.platform_audit_log (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id        uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  action          text NOT NULL CHECK (action IN ('grant_platform_admin', 'revoke_platform_admin', 'switch_hotel')),
  target_user_id  uuid,
  from_hotel_id   uuid REFERENCES public.hotels (id) ON DELETE SET NULL,
  hotel_id        uuid REFERENCES public.hotels (id) ON DELETE SET NULL,
  details         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.platform_audit_log IS
  'What the platform team did across hotels. Written only by SECURITY DEFINER functions; read by platform admins.';
CREATE INDEX IF NOT EXISTS platform_audit_log_created_idx ON public.platform_audit_log (created_at DESC);

ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_audit_log FROM anon, authenticated;
GRANT SELECT ON public.platform_audit_log TO authenticated;
DROP POLICY IF EXISTS platform_audit_log_select ON public.platform_audit_log;
CREATE POLICY platform_audit_log_select ON public.platform_audit_log
  FOR SELECT TO authenticated USING (public.is_platform_admin());

-- ===========================================================================
-- 3. Switching hotel, recorded
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.platform_switch_hotel(p_hotel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_from uuid;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only the Hestia team can switch hotels, after verifying with their authenticator.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.hotels WHERE id = p_hotel_id) THEN
    RAISE EXCEPTION 'That hotel no longer exists.' USING ERRCODE = 'P0002';
  END IF;

  SELECT hotel_id INTO v_from FROM public.users WHERE id = auth.uid();
  PERFORM set_config('hestia.platform_switch', 'on', true);
  UPDATE public.users SET hotel_id = p_hotel_id WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your account has no staff profile to switch.' USING ERRCODE = 'P0002';
  END IF;
  PERFORM set_config('hestia.platform_switch', 'off', true);

  INSERT INTO public.platform_audit_log (actor_id, action, from_hotel_id, hotel_id)
  VALUES (auth.uid(), 'switch_hotel', v_from, p_hotel_id);
END;
$$;
REVOKE ALL ON FUNCTION public.platform_switch_hotel(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.platform_switch_hotel(uuid) TO authenticated;

-- ===========================================================================
-- 4. Granting and revoking (service role only)
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.platform_grant_admin(p_email text, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(btrim(p_email));
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'No account with the email %. Invite them first.', p_email USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.platform_admins (user_id) VALUES (v_user) ON CONFLICT DO NOTHING;
  IF FOUND THEN
    INSERT INTO public.platform_audit_log (actor_id, action, target_user_id, details)
    VALUES (auth.uid(), 'grant_platform_admin', v_user, jsonb_build_object('note', p_note, 'by', current_user));
  END IF;
  RETURN v_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_revoke_admin(p_email text, p_note text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower(btrim(p_email));
  DELETE FROM public.platform_admins WHERE user_id = v_user;
  IF FOUND THEN
    INSERT INTO public.platform_audit_log (actor_id, action, target_user_id, details)
    VALUES (auth.uid(), 'revoke_platform_admin', v_user, jsonb_build_object('note', p_note, 'by', current_user));
  END IF;
  RETURN v_user;
END;
$$;

-- Never from the app: only the service role (scripts) and the SQL editor (postgres).
REVOKE ALL ON FUNCTION public.platform_grant_admin(text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.platform_revoke_admin(text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.platform_grant_admin(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.platform_revoke_admin(text, text) TO service_role;
