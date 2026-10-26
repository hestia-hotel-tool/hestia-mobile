-- A ticket can only be assigned to someone ON SHIFT (by their roster and the
-- shift's hours, in hotel time) who is SIGNED IN to the app (client RBAC
-- update, 2026-10-26).
--
--   on shift  — users.shift_id's hours contain the hotel's current time
--               (overnight shifts wrap midnight); active accounts only.
--   signed in — an app session (not a browser or a script) that has not been
--               signed out or expired, and was active in the last 16 hours.
--               The app renews its session about hourly while used; 16 hours
--               covers a full shift with the phone in a pocket, and drops
--               someone who signed in yesterday and went home.
--
-- Enforced in the database — creating a ticket with an assignee, and
-- reassigning — so neither app nor the back office can step around it.
-- The pickers list only assignable people (ticket_assignable_staff), so
-- nobody is offered someone the server would refuse. Server-side writes
-- (no user) are not checked.

BEGIN;

CREATE OR REPLACE FUNCTION public.user_on_shift_now(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.users u
      JOIN public.shifts s ON s.id = u.shift_id
      JOIN public.hotels h ON h.id = u.hotel_id
     WHERE u.id = p_user_id
       AND u.active
       AND s.start_time IS NOT NULL AND s.end_time IS NOT NULL
       AND CASE
             WHEN s.start_time <= s.end_time THEN
               (now() AT TIME ZONE coalesce(h.timezone, 'UTC'))::time >= s.start_time
               AND (now() AT TIME ZONE coalesce(h.timezone, 'UTC'))::time < s.end_time
             ELSE
               (now() AT TIME ZONE coalesce(h.timezone, 'UTC'))::time >= s.start_time
               OR (now() AT TIME ZONE coalesce(h.timezone, 'UTC'))::time < s.end_time
           END
  );
$$;

CREATE OR REPLACE FUNCTION public.user_signed_in_app(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.sessions s
     WHERE s.user_id = p_user_id
       AND (s.not_after IS NULL OR s.not_after > now())
       AND coalesce(s.refreshed_at, s.updated_at, s.created_at) > now() - interval '16 hours'
       -- The app, not the back office in a browser or a script.
       AND coalesce(s.user_agent, '') !~* '(mozilla|curl|node|undici|python|postman)'
  );
$$;

CREATE OR REPLACE FUNCTION public.ticket_assignable(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.user_on_shift_now(p_user_id) AND public.user_signed_in_app(p_user_id);
$$;

REVOKE ALL ON FUNCTION public.user_on_shift_now(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.user_signed_in_app(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.ticket_assignable(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ticket_assignable(uuid) TO authenticated;

-- The pickers' list: a department's staff who can take a ticket now.
CREATE OR REPLACE FUNCTION public.ticket_assignable_staff(p_department_id uuid, p_exclude_self boolean DEFAULT false)
RETURNS TABLE (id uuid, full_name text, avatar_url text, job_title text, department text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.id, u.full_name, u.avatar_url, jt.name, d.name
    FROM public.users u
    JOIN public.job_titles jt ON jt.id = u.job_title_id
    JOIN public.departments d ON d.id = jt.department_id
   WHERE u.hotel_id = public.auth_hotel_id()
     AND jt.department_id = p_department_id
     AND u.active
     AND NOT (p_exclude_self AND u.id = auth.uid())
     AND public.ticket_assignable(u.id)
   ORDER BY u.full_name;
$$;
REVOKE ALL ON FUNCTION public.ticket_assignable_staff(uuid, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ticket_assignable_staff(uuid, boolean) TO authenticated;

-- The rule, on create and on reassign.
CREATE OR REPLACE FUNCTION public._tickets_assignee_available()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR NEW.assigned_to_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.assigned_to_id IS NOT DISTINCT FROM OLD.assigned_to_id THEN
    RETURN NEW;
  END IF;
  IF NOT public.user_on_shift_now(NEW.assigned_to_id) THEN
    RAISE EXCEPTION 'They are not on shift right now. Assign someone who is.' USING ERRCODE = '22023';
  END IF;
  IF NOT public.user_signed_in_app(NEW.assigned_to_id) THEN
    RAISE EXCEPTION 'They are not signed in to the app. Assign someone who is.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_assignee_available ON public.tickets;
CREATE TRIGGER tickets_assignee_available
  BEFORE INSERT OR UPDATE OF assigned_to_id ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public._tickets_assignee_available();

COMMIT;
