-- Back office access, permissions and platform admins (hestia-backoffice B1,
-- docs/04-backend-changes.md in that repo).
--
-- 1. Six permission keys for the back office, granted as EXTRA_GRANTS in
--    scripts/rbac/parse-spec.py (the regenerated 20260902000100_rbac_seed.sql
--    carries them for fresh databases; this migration adds them to existing ones).
-- 2. platform_admins: the Hestia team, who work across hotels. Managed with SQL
--    only, so RLS is on and there are no client policies.
-- 3. is_platform_admin(); platform admins hold every permission in both
--    get_my_permissions() (what the UI shows) and auth_has_permission() (what
--    RLS and RPCs enforce), so the two never disagree.
-- 4. platform_switch_hotel(): a platform admin moves their own users.hotel_id.
--    The users guard trigger lets that one change through, and only from here.
-- 5. platform_hotels(): every hotel with its room and staff counts.
--
-- Mobile impact: none. Mobile users are never platform admins, and their
-- permissions and the guard trigger behave exactly as before.

-- ---------------------------------------------------------------------------
-- 1. Permission keys
-- ---------------------------------------------------------------------------

INSERT INTO public.permissions (name, description) VALUES
  ('backoffice.access', 'Sign in to the back office'),
  ('rooms.manage', 'Create, edit and delete rooms, room types, floors and public areas'),
  ('reservations.manage', 'Create, edit and check reservations in and out'),
  ('guests.manage', 'Create and edit guests'),
  ('reports.view', 'Open reports and dashboard charts'),
  ('audit.view', 'Open the activity log')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM (VALUES
          ('backoffice.access', 'full_access'),
          ('backoffice.access', 'ops_senior'),
          ('rooms.manage', 'full_access'),
          ('reservations.manage', 'full_access'),
          ('reservations.manage', 'ops_senior'),
          ('guests.manage', 'full_access'),
          ('guests.manage', 'ops_senior'),
          ('reports.view', 'full_access'),
          ('reports.view', 'ops_senior'),
          ('audit.view', 'full_access')
       ) AS g(permission, role_key)
  JOIN public.roles r       ON r.key = g.role_key
  JOIN public.permissions p ON p.name = g.permission
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Platform admins
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.platform_admins IS
  'The Hestia team: every permission, in every hotel. Managed with SQL; no client access.';

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_admins FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. is_platform_admin, and platform admins in the permission checks
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS text[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN public.is_platform_admin() THEN
      (SELECT coalesce(array_agg(p.name ORDER BY p.name), '{}') FROM public.permissions p)
    ELSE
      (SELECT coalesce(array_agg(DISTINCT p.name), '{}')
         FROM public.users u
         JOIN public.job_titles jt       ON jt.id = u.job_title_id
         JOIN public.role_permissions rp ON rp.role_id = jt.role_id
         JOIN public.permissions p       ON p.id = rp.permission_id
        WHERE u.id = auth.uid())
  END;
$$;

CREATE OR REPLACE FUNCTION public.auth_has_permission(p_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_platform_admin()
      OR EXISTS (
           SELECT 1
             FROM public.users u
             JOIN public.job_titles jt       ON jt.id = u.job_title_id
             JOIN public.role_permissions rp ON rp.role_id = jt.role_id
             JOIN public.permissions p       ON p.id = rp.permission_id
            WHERE u.id = auth.uid() AND p.name = p_key
         );
$$;

-- ---------------------------------------------------------------------------
-- 4. Switching hotel
-- ---------------------------------------------------------------------------

-- The guard as before, plus one path: platform_switch_hotel() marks its own
-- transaction, and then only hotel_id may change.
CREATE OR REPLACE FUNCTION public._users_guard_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Server-side writes (no user) and staff managers may change anything.
  IF auth.uid() IS NULL OR public.auth_has_permission('staff.manage') THEN
    RETURN NEW;
  END IF;
  IF current_setting('hestia.platform_switch', true) = 'on'
     AND public.is_platform_admin()
     AND NEW.id = auth.uid()
     AND NEW.job_title_id IS NOT DISTINCT FROM OLD.job_title_id
     AND NEW.role_id IS NOT DISTINCT FROM OLD.role_id
     AND NEW.department_id IS NOT DISTINCT FROM OLD.department_id
     AND NEW.shift_id IS NOT DISTINCT FROM OLD.shift_id
     AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.job_title_id IS DISTINCT FROM OLD.job_title_id
     OR NEW.role_id IS DISTINCT FROM OLD.role_id
     OR NEW.department_id IS DISTINCT FROM OLD.department_id
     OR NEW.shift_id IS DISTINCT FROM OLD.shift_id
     OR NEW.hotel_id IS DISTINCT FROM OLD.hotel_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Your job title, department and shift are managed by your manager.'
      USING ERRCODE = '42501', HINT = 'You can change your name, photo and phone number.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_switch_hotel(p_hotel_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only the Hestia team can switch hotels.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.hotels WHERE id = p_hotel_id) THEN
    RAISE EXCEPTION 'That hotel no longer exists.' USING ERRCODE = 'P0002';
  END IF;

  PERFORM set_config('hestia.platform_switch', 'on', true);
  UPDATE public.users SET hotel_id = p_hotel_id WHERE id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Your account has no staff profile to switch.' USING ERRCODE = 'P0002';
  END IF;
  PERFORM set_config('hestia.platform_switch', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.platform_switch_hotel(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.platform_switch_hotel(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Every hotel, for the switcher and the Hotels page
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.platform_hotels()
RETURNS TABLE (id uuid, name text, timezone text, rooms integer, staff integer, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only the Hestia team can see every hotel.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT h.id, h.name, h.timezone,
           (SELECT count(*)::int FROM public.rooms r WHERE r.hotel_id = h.id),
           (SELECT count(*)::int FROM public.users u WHERE u.hotel_id = h.id),
           h.created_at
      FROM public.hotels h
     ORDER BY h.name;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_hotels() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.platform_hotels() TO authenticated;
