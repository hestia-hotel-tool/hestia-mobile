-- Back office B2: staff administration (docs/04-backend-changes.md §B2, Step 2.1).
--
-- 1. users.email, users.active, users.invited_at, users.last_sign_in_at.
--    email and last_sign_in_at are copied from auth.users by a trigger and
--    backfilled now.
-- 2. The self-edit guard also protects the new columns: only staff managers
--    (and server-side writes) change them.
-- 3. admin_update_staff(): staff managers edit someone in their hotel (the
--    users UPDATE policy only allows a person's own row).
--
-- Inviting, disabling, enabling and password resets are back-office Server
-- Actions with the service-role client (auth.admin.*), after the caller's
-- staff.manage is checked with their own session.
--
-- Mobile impact: none required. A disabled account is banned in Auth, so it
-- can't sign in or refresh; the app also signs out a session whose profile
-- reads active = false (src/lib/tenant.ts, same change).

-- ===========================================================================
-- 1. Columns
-- ===========================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email            text,
  ADD COLUMN IF NOT EXISTS active           boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invited_at       timestamptz,
  ADD COLUMN IF NOT EXISTS last_sign_in_at  timestamptz;

COMMENT ON COLUMN public.users.email IS 'Copied from auth.users.email (trigger _sync_user_from_auth). Read only for apps.';
COMMENT ON COLUMN public.users.active IS 'False: disabled from the back office (Auth ban). Mobile signs such a session out.';
COMMENT ON COLUMN public.users.invited_at IS 'When the back office last sent this person an invite.';
COMMENT ON COLUMN public.users.last_sign_in_at IS 'Copied from auth.users.last_sign_in_at. Null: never signed in (invite pending).';

-- The sync trigger marks its own transaction so the guard below lets it through.
CREATE OR REPLACE FUNCTION public._sync_user_from_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('hestia.auth_sync', 'on', true);
  UPDATE public.users
     SET email = NEW.email,
         last_sign_in_at = NEW.last_sign_in_at
   WHERE id = NEW.id
     AND (email IS DISTINCT FROM NEW.email OR last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at);
  PERFORM set_config('hestia.auth_sync', 'off', true);
  RETURN NEW;
END;
$$;

-- Named to sort after on_auth_user_created, which creates the users row on insert.
DROP TRIGGER IF EXISTS on_auth_user_synced ON auth.users;
CREATE TRIGGER on_auth_user_synced
  AFTER INSERT OR UPDATE OF email, last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public._sync_user_from_auth();

UPDATE public.users u
   SET email = au.email,
       last_sign_in_at = au.last_sign_in_at
  FROM auth.users au
 WHERE au.id = u.id
   AND (u.email IS DISTINCT FROM au.email OR u.last_sign_in_at IS DISTINCT FROM au.last_sign_in_at);

CREATE INDEX IF NOT EXISTS users_hotel_active_idx ON public.users (hotel_id, active);

-- ===========================================================================
-- 2. Self-edit guard: the new columns are the manager's (or Auth's) to change
-- ===========================================================================

CREATE OR REPLACE FUNCTION public._users_guard_self_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Server-side writes (no user), the auth sync trigger and staff managers may change anything.
  IF auth.uid() IS NULL
     OR current_setting('hestia.auth_sync', true) = 'on'
     OR public.auth_has_permission('staff.manage') THEN
    RETURN NEW;
  END IF;
  IF current_setting('hestia.platform_switch', true) = 'on'
     AND public.is_platform_admin()
     AND NEW.id = auth.uid()
     AND NEW.job_title_id IS NOT DISTINCT FROM OLD.job_title_id
     AND NEW.role_id IS NOT DISTINCT FROM OLD.role_id
     AND NEW.department_id IS NOT DISTINCT FROM OLD.department_id
     AND NEW.shift_id IS NOT DISTINCT FROM OLD.shift_id
     AND NEW.created_at IS NOT DISTINCT FROM OLD.created_at
     AND NEW.email IS NOT DISTINCT FROM OLD.email
     AND NEW.active IS NOT DISTINCT FROM OLD.active
     AND NEW.invited_at IS NOT DISTINCT FROM OLD.invited_at
     AND NEW.last_sign_in_at IS NOT DISTINCT FROM OLD.last_sign_in_at THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.job_title_id IS DISTINCT FROM OLD.job_title_id
     OR NEW.role_id IS DISTINCT FROM OLD.role_id
     OR NEW.department_id IS DISTINCT FROM OLD.department_id
     OR NEW.shift_id IS DISTINCT FROM OLD.shift_id
     OR NEW.hotel_id IS DISTINCT FROM OLD.hotel_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.active IS DISTINCT FROM OLD.active
     OR NEW.invited_at IS DISTINCT FROM OLD.invited_at
     OR NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    RAISE EXCEPTION 'Your job title, department and shift are managed by your manager.'
      USING ERRCODE = '42501', HINT = 'You can change your name, photo and phone number.';
  END IF;
  RETURN NEW;
END;
$$;

-- ===========================================================================
-- 3. admin_update_staff
-- ===========================================================================

-- p_avatar_url: NULL keeps the photo, '' removes it.
CREATE OR REPLACE FUNCTION public.admin_update_staff(
  p_user_id uuid,
  p_full_name text,
  p_phone text,
  p_department_id uuid,
  p_job_title_id uuid,
  p_shift_id uuid,
  p_avatar_url text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_title_department uuid;
  v_title_role uuid;
  v_name text := btrim(coalesce(p_full_name, ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
BEGIN
  IF NOT public.auth_has_permission('staff.manage') THEN
    RAISE EXCEPTION 'Only a manager can edit staff.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND hotel_id = v_hotel) THEN
    RAISE EXCEPTION 'That person is not in this hotel.' USING ERRCODE = 'P0002';
  END IF;
  IF char_length(v_name) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Enter a name of up to 120 characters.' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_phone) > 30 THEN
    RAISE EXCEPTION 'Enter a phone number of up to 30 characters.' USING ERRCODE = '22023';
  END IF;

  IF p_job_title_id IS NOT NULL THEN
    SELECT department_id, role_id INTO v_title_department, v_title_role FROM public.job_titles WHERE id = p_job_title_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That job title no longer exists.' USING ERRCODE = 'P0002';
    END IF;
    IF p_department_id IS DISTINCT FROM v_title_department THEN
      RAISE EXCEPTION 'That job title belongs to another department.' USING ERRCODE = '22023';
    END IF;
  ELSIF p_department_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.departments WHERE id = p_department_id) THEN
    RAISE EXCEPTION 'That department no longer exists.' USING ERRCODE = 'P0002';
  END IF;

  IF p_shift_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.shifts WHERE id = p_shift_id AND hotel_id = v_hotel) THEN
    RAISE EXCEPTION 'That shift is not one of this hotel''s.' USING ERRCODE = 'P0002';
  END IF;

  -- Lock-out guard: a manager can't take away their own staff.manage.
  IF p_user_id = auth.uid() AND NOT public.is_platform_admin() AND NOT EXISTS (
       SELECT 1
         FROM public.role_permissions rp
         JOIN public.permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = v_title_role AND p.name = 'staff.manage'
     ) THEN
    RAISE EXCEPTION 'You can''t give yourself a job title that can''t manage staff. Ask another manager.' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.users
     SET full_name = v_name,
         phone = v_phone,
         department_id = p_department_id,
         job_title_id = p_job_title_id,
         shift_id = p_shift_id,
         avatar_url = CASE WHEN p_avatar_url IS NULL THEN avatar_url ELSE nullif(p_avatar_url, '') END,
         updated_at = now()
   WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_staff(uuid, text, text, uuid, uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_staff(uuid, text, text, uuid, uuid, uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public._sync_user_from_auth() FROM PUBLIC;
