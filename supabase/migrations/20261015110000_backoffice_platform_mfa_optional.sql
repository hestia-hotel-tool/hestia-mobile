-- Back office: two-step verification optional for platform admins.
--
-- 20261015100000 made platform powers require an AAL2 session for everyone.
-- Now the usual "optional MFA" rule (Supabase's documented pattern): a
-- platform admin who has a verified authenticator must use it (AAL2); one
-- who hasn't set one up works at AAL1. Turning it on is in My profile.
--
-- Mobile impact: none.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
     AND (
       coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
       OR NOT EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id = auth.uid() AND f.status = 'verified')
     );
$$;
COMMENT ON FUNCTION public.is_platform_admin() IS
  'A platform admin. If they have a verified authenticator, only in a session that used it (AAL2). Every platform power checks this.';

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
    RAISE EXCEPTION 'Only the Hestia team can switch hotels.' USING ERRCODE = '42501';
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
