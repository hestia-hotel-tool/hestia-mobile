-- Engineering checklist → notifications — Figma 4783:2223 (Tasks notifications).
--
-- The engineering leads (Director, Supervisors: role engineering_lead) hear
-- when a technician
--
--   checklist_submitted  submits a room's checklist   "Martin Loose submitted the checklist for Room 201."
--   ticket_created       raises a ticket from it       "Martin Loose created a ticket for Room 201: <title>."
--
-- Fired by triggers on the inspection tables, so the RPCs stay as they are;
-- the person who did it is never told about their own action.

BEGIN;

CREATE OR REPLACE FUNCTION public._engineering_lead_ids(p_hotel_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
    FROM public.users u
    JOIN public.job_titles jt ON jt.id = u.job_title_id
    JOIN public.roles r ON r.id = jt.role_id
   WHERE u.hotel_id = p_hotel_id AND r.key = 'engineering_lead';
$$;
REVOKE ALL ON FUNCTION public._engineering_lead_ids(uuid) FROM PUBLIC, anon, authenticated;

-- Submitted: completed_at set (or set again after a correction).
CREATE OR REPLACE FUNCTION public._room_inspections_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := coalesce(auth.uid(), NEW.completed_by);
  v_name text;
  v_room text;
  v_issues integer;
  v_lead uuid;
BEGIN
  IF NEW.completed_at IS NULL OR NEW.completed_at IS NOT DISTINCT FROM OLD.completed_at THEN
    RETURN NEW;
  END IF;
  IF NEW.department_id IS DISTINCT FROM public._department_id('engineering') THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO v_name FROM public.users WHERE id = v_actor;
  SELECT room_number INTO v_room FROM public.rooms WHERE id = NEW.room_id;
  SELECT count(*) INTO v_issues FROM public.room_inspection_results
   WHERE inspection_id = NEW.id AND result = 'issue';

  FOR v_lead IN SELECT * FROM public._engineering_lead_ids(NEW.hotel_id) LOOP
    CONTINUE WHEN v_lead = v_actor;
    PERFORM public._notify_user(
      v_lead, NEW.hotel_id, 'checklist_submitted', 'Checklist submitted',
      format('%s submitted the checklist for Room %s.%s', coalesce(v_name, 'A technician'), v_room,
             CASE WHEN v_issues = 0 THEN ' All items good.'
                  WHEN v_issues = 1 THEN ' 1 issue found.'
                  ELSE format(' %s issues found.', v_issues) END),
      jsonb_build_object('roomId', NEW.room_id, 'inspectionId', NEW.id)
    );
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._room_inspections_notify() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS room_inspections_notify ON public.room_inspections;
CREATE TRIGGER room_inspections_notify
  AFTER UPDATE OF completed_at ON public.room_inspections
  FOR EACH ROW EXECUTE FUNCTION public._room_inspections_notify();

-- A ticket raised from the checklist: ticket_id set on an issue.
CREATE OR REPLACE FUNCTION public._room_inspection_results_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_name text;
  v_ticket public.tickets%ROWTYPE;
  v_room text;
  v_lead uuid;
BEGIN
  IF NEW.ticket_id IS NULL OR NEW.ticket_id IS NOT DISTINCT FROM OLD.ticket_id THEN
    RETURN NEW;
  END IF;
  SELECT * INTO v_ticket FROM public.tickets WHERE id = NEW.ticket_id;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  v_actor := coalesce(v_actor, v_ticket.created_by_id);
  SELECT full_name INTO v_name FROM public.users WHERE id = v_actor;
  SELECT room_number INTO v_room FROM public.rooms WHERE id = v_ticket.room_id;

  FOR v_lead IN SELECT * FROM public._engineering_lead_ids(v_ticket.hotel_id) LOOP
    CONTINUE WHEN v_lead = v_actor;
    PERFORM public._notify_user(
      v_lead, v_ticket.hotel_id, 'ticket_created', 'Ticket created',
      format('%s created a ticket for Room %s: %s.', coalesce(v_name, 'A technician'), v_room, v_ticket.title),
      jsonb_build_object('ticketId', v_ticket.id, 'roomId', v_ticket.room_id)
    );
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._room_inspection_results_notify() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS room_inspection_results_notify ON public.room_inspection_results;
CREATE TRIGGER room_inspection_results_notify
  AFTER UPDATE OF ticket_id ON public.room_inspection_results
  FOR EACH ROW EXECUTE FUNCTION public._room_inspection_results_notify();

COMMIT;
