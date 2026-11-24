-- Ticket task notifications across departments (client, 2026-11-24: "There
-- is no task notifications for engineering — make sure task notifications are
-- sent and received respectively").
--
-- A ticket notified only the person it was assigned to (_tickets_notify). The
-- usual path — Housekeeping raises a ticket for Engineering, unassigned — told
-- nobody in Engineering, and nobody told the person who raised it when it was
-- solved. Now:
--
--   ticket_created  a ticket raised for a department by someone outside it
--                   goes to that department's leads (engineering_lead, or a
--                   role with tickets.manage; everyone in the department when
--                   it has no lead) — "Henry Tankeu created a ticket for Room
--                   201: Broken Shower." Tickets raised inside the department
--                   (a technician's own, checklist tickets) already have their
--                   own notices (checklist_submitted / ticket_created on the
--                   inspection, ticket_assigned).
--   ticket_solved   when a ticket becomes done, the person who raised it is
--                   told who solved it.
--
-- Nobody is told of their own action (_notify_user).

BEGIN;

-- The people who run a department's tickets.
CREATE OR REPLACE FUNCTION public._department_ticket_lead_ids(p_hotel_id uuid, p_department_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH members AS (
    SELECT u.id, r.id AS role_id, r.key AS role_key
      FROM public.users u
      JOIN public.job_titles jt ON jt.id = u.job_title_id
      LEFT JOIN public.roles r ON r.id = jt.role_id
     WHERE u.hotel_id = p_hotel_id AND jt.department_id = p_department_id
  ), leads AS (
    SELECT m.id FROM members m
     WHERE m.role_key = 'engineering_lead'
        OR EXISTS (
          SELECT 1 FROM public.role_permissions rp JOIN public.permissions p ON p.id = rp.permission_id
           WHERE rp.role_id = m.role_id AND p.name = 'tickets.manage'
        )
  )
  SELECT id FROM leads
  UNION ALL
  SELECT id FROM members WHERE NOT EXISTS (SELECT 1 FROM leads);
$$;
REVOKE ALL ON FUNCTION public._department_ticket_lead_ids(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- 1. A new ticket from another department → that department's leads.
CREATE OR REPLACE FUNCTION public._tickets_notify_department()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_creator_dept uuid;
  v_creator text;
  v_room text;
BEGIN
  IF NEW.department_id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT jt.department_id, u.full_name INTO v_creator_dept, v_creator
    FROM public.users u LEFT JOIN public.job_titles jt ON jt.id = u.job_title_id
   WHERE u.id = NEW.created_by_id;
  IF v_creator_dept IS NOT DISTINCT FROM NEW.department_id THEN
    RETURN NULL;
  END IF;
  SELECT room_number INTO v_room FROM public.rooms WHERE id = NEW.room_id;

  PERFORM public._notify_user(
    l.id, NEW.hotel_id, 'ticket_created', 'New ticket',
    CASE WHEN v_room IS NOT NULL
      THEN format('%s created a ticket for Room %s: %s.', coalesce(v_creator, 'Someone'), v_room, NEW.title)
      ELSE format('%s created a ticket: %s.', coalesce(v_creator, 'Someone'), NEW.title)
    END,
    jsonb_build_object('ticketId', NEW.id, 'roomId', NEW.room_id))
    FROM public._department_ticket_lead_ids(NEW.hotel_id, NEW.department_id) AS l(id);
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public._tickets_notify_department() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tickets_notify_department ON public.tickets;
CREATE TRIGGER tickets_notify_department
  AFTER INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public._tickets_notify_department();

-- 2. Solved → the person who raised it.
CREATE OR REPLACE FUNCTION public._tickets_notify_solved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor text;
  v_room text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'done' OR OLD.status IS NOT DISTINCT FROM 'done' OR NEW.created_by_id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT full_name INTO v_actor FROM public.users WHERE id = auth.uid();
  SELECT room_number INTO v_room FROM public.rooms WHERE id = NEW.room_id;
  PERFORM public._notify_user(
    NEW.created_by_id, NEW.hotel_id, 'ticket_solved', 'Ticket solved',
    format('%s solved your ticket: %s%s.', coalesce(v_actor, 'Someone'), NEW.title,
      CASE WHEN v_room IS NOT NULL THEN format(' (Room %s)', v_room) ELSE '' END),
    jsonb_build_object('ticketId', NEW.id, 'roomId', NEW.room_id));
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public._tickets_notify_solved() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tickets_notify_solved ON public.tickets;
CREATE TRIGGER tickets_notify_solved
  AFTER UPDATE OF status ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public._tickets_notify_solved();

COMMIT;
