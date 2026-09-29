-- My Profile: what staff may change about themselves.
--
-- "Users can update own profile" lets a signed-in user update their own
-- `users` row — every column of it. That included `job_title_id`, which
-- decides the person's role and so their permissions: an attendant could make
-- themselves an Executive Housekeeper with one request. Also `department_id`,
-- `shift_id` and `hotel_id`.
--
-- Now a person may change only their name, photo and phone number. Everything
-- else about their job stays with whoever manages staff (`staff.manage`) and
-- with server-side writes.
--
-- Also adds `phone`, shown and edited on My Profile.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.users.phone IS 'Contact number, as the person entered it. Edited on My Profile.';

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_format;
ALTER TABLE public.users ADD CONSTRAINT users_phone_format
  CHECK (phone IS NULL OR (length(phone) BETWEEN 3 AND 32 AND phone ~ '^\+?[0-9 ().-]+$'));

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_full_name_length;
ALTER TABLE public.users ADD CONSTRAINT users_full_name_length
  CHECK (full_name IS NULL OR length(btrim(full_name)) BETWEEN 1 AND 80) NOT VALID;

CREATE OR REPLACE FUNCTION public._users_guard_self_edit()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Server-side writes (no user) and staff managers may change anything.
  IF auth.uid() IS NULL OR public.auth_has_permission('staff.manage') THEN
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

REVOKE ALL ON FUNCTION public._users_guard_self_edit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS users_guard_self_edit ON public.users;
CREATE TRIGGER users_guard_self_edit
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public._users_guard_self_edit();

-- ---------------------------------------------------------------------------
-- Staff may read their own hotel (its name on Settings and My Profile).
-- RLS was on with no policy at all, so every read came back empty.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can read their hotel" ON public.hotels;
CREATE POLICY "Users can read their hotel" ON public.hotels
  FOR SELECT TO authenticated USING (id = public.auth_hotel_id());
