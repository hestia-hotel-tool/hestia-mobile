-- Tickets belong to the department they were raised for (client RBAC update,
-- 2026-10-26).
--
--   Resolve  (change status: Unsolved / Solved / Out of Order)
--            only people in the ticket's department. Housekeeping raising a
--            ticket for Engineering cannot close it; Engineering can.
--   Reassign (change the assignee)
--            only the department's leads, and only to someone in that
--            department.
--   Hotel-wide: the Hotel Manager (the lead of Executive and Administration)
--            and platform admins may do both in every department.
--
-- Until now status and assignee were open to anyone in the hotel: the UPDATE
-- policy is hotel-wide and _tickets_guard_edit only protected the ticket's
-- own fields. The rules are enforced here, in that trigger, so neither app nor
-- the back office can step around them; the apps also hide what a person
-- cannot do (ticket_access_for_me()).
--
-- A ticket with no department (older rows) keeps the old rule for both: its
-- author or someone with tickets.manage.
--
-- "Lead" is a property of a job title, not a role — Director of Engineering
-- and Shift Engineer share one role — so it is a flag on job_titles. The RBAC
-- seed upserts job titles without touching this column, so re-seeding keeps it.

BEGIN;

-- 1. Who leads a department -------------------------------------------------
ALTER TABLE public.job_titles
  ADD COLUMN IF NOT EXISTS is_department_lead boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.job_titles.is_department_lead IS
  'Heads and managers of the department: may reassign its tickets. The lead of Executive and Administration acts hotel-wide.';

UPDATE public.job_titles SET is_department_lead = (key IN (
  'executive_housekeeper', 'supervisor',                       -- Housekeeping
  'director_of_rooms', 'front_office_manager', 'night_manager', -- Front Office
  'head_concierge',                                             -- Concierge
  'in_room_dining_manager', 'in_room_dining_supervisor',        -- In Room Dining
  'director_of_engineering',                                    -- Engineering
  'director_of_information_technology',                         -- IT
  'hotel_manager'                                               -- Executive and Administration
));

-- 2. The caller's department and standing -----------------------------------
-- The job title decides the department (users.department_id is a legacy copy
-- that can drift); it is the fallback for someone with no title.
CREATE OR REPLACE FUNCTION public.auth_department_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(jt.department_id, u.department_id)
    FROM public.users u
    LEFT JOIN public.job_titles jt ON jt.id = u.job_title_id
   WHERE u.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.auth_is_department_lead()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce((
    SELECT jt.is_department_lead
      FROM public.users u JOIN public.job_titles jt ON jt.id = u.job_title_id
     WHERE u.id = auth.uid()), false);
$$;

-- The Hotel Manager (lead of Executive and Administration) and platform admins.
CREATE OR REPLACE FUNCTION public.auth_tickets_hotel_wide()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_platform_admin() OR coalesce((
    SELECT jt.is_department_lead AND d.key = 'executive'
      FROM public.users u
      JOIN public.job_titles jt ON jt.id = u.job_title_id
      JOIN public.departments d ON d.id = jt.department_id
     WHERE u.id = auth.uid()), false);
$$;

REVOKE ALL ON FUNCTION public.auth_department_id() FROM public, anon;
REVOKE ALL ON FUNCTION public.auth_is_department_lead() FROM public, anon;
REVOKE ALL ON FUNCTION public.auth_tickets_hotel_wide() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.auth_department_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_is_department_lead() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_tickets_hotel_wide() TO authenticated;

-- 3. What the apps need to show the right controls ------------------------------
CREATE OR REPLACE FUNCTION public.ticket_access_for_me()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'department_id', public.auth_department_id(),
    'department_name', (SELECT name FROM public.departments WHERE id = public.auth_department_id()),
    'is_lead', public.auth_is_department_lead(),
    'hotel_wide', public.auth_tickets_hotel_wide(),
    'can_manage', public.auth_has_permission('tickets.manage')
  );
$$;
REVOKE ALL ON FUNCTION public.ticket_access_for_me() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ticket_access_for_me() TO authenticated;

-- 4. The rules, on every ticket update -----------------------------------------
CREATE OR REPLACE FUNCTION public._tickets_guard_edit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_hotelwide boolean;
  v_mine      uuid;
  v_dept_name text;
  v_rerouted  boolean := NEW.department_id IS DISTINCT FROM OLD.department_id;
BEGIN
  -- Server-side writes (no user) are trusted.
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  v_hotelwide := public.auth_tickets_hotel_wide();
  v_mine := public.auth_department_id();
  SELECT name INTO v_dept_name FROM public.departments WHERE id = OLD.department_id;

  -- Resolve: the ticket's department only.
  IF NEW.status IS DISTINCT FROM OLD.status AND NOT v_hotelwide THEN
    IF OLD.department_id IS NULL THEN
      IF NOT (v_uid = OLD.created_by_id OR public.auth_has_permission('tickets.manage')) THEN
        RAISE EXCEPTION 'Only the person who raised this ticket or a manager can change its status.'
          USING ERRCODE = '42501';
      END IF;
    ELSIF v_mine IS DISTINCT FROM OLD.department_id THEN
      RAISE EXCEPTION 'Only % can resolve this ticket.', coalesce(v_dept_name, 'its department')
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Reassign: the department's leads only, to someone in that department.
  -- Re-routing to another department (author or manager, checked below)
  -- carries its new assignee with it.
  IF NEW.assigned_to_id IS DISTINCT FROM OLD.assigned_to_id THEN
    IF NOT v_hotelwide AND NOT v_rerouted THEN
      IF OLD.department_id IS NULL THEN
        IF NOT (v_uid = OLD.created_by_id OR public.auth_has_permission('tickets.manage')) THEN
          RAISE EXCEPTION 'Only the person who raised this ticket or a manager can reassign it.'
            USING ERRCODE = '42501';
        END IF;
      ELSIF NOT (public.auth_is_department_lead() AND v_mine = OLD.department_id) THEN
        RAISE EXCEPTION 'Only the heads of % can reassign this ticket.', coalesce(v_dept_name, 'its department')
          USING ERRCODE = '42501';
      END IF;
    END IF;
    IF NEW.assigned_to_id IS NOT NULL AND NEW.department_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.users u
        LEFT JOIN public.job_titles jt ON jt.id = u.job_title_id
       WHERE u.id = NEW.assigned_to_id
         AND coalesce(jt.department_id, u.department_id) = NEW.department_id
    ) THEN
      RAISE EXCEPTION 'A ticket can only be assigned to someone in its department.'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- The ticket's own fields: its author or a manager (unchanged).
  IF v_uid = OLD.created_by_id OR public.auth_has_permission('tickets.manage') OR v_hotelwide THEN
    RETURN NEW;
  END IF;
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.photo_urls IS DISTINCT FROM OLD.photo_urls
     OR NEW.room_id IS DISTINCT FROM OLD.room_id
     OR NEW.type IS DISTINCT FROM OLD.type
     OR v_rerouted
     OR NEW.created_by_id IS DISTINCT FROM OLD.created_by_id THEN
    RAISE EXCEPTION 'Only the person who raised this ticket or a manager can edit it.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
