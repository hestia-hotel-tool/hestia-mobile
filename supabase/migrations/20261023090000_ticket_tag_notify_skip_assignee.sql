-- One notification, not two, for the person a ticket is assigned to.
--
-- Tester feedback: Yara was assigned a ticket and also tagged on it, and got
-- "Ticket assigned" and "Tagged on a ticket" half a second apart. The ticket
-- trigger (_tickets_notify) tells the assignee; the tag trigger
-- (_ticket_tags_notify) told every tagged person without checking whether
-- that person is the assignee, who already knows.
--
-- The tag notice now skips the ticket's assignee. Being assigned is the
-- stronger message and carries the same ticket. Tagging anyone else still
-- notifies them, and someone tagged first and assigned later still gets the
-- assignment — that is new news.

BEGIN;

CREATE OR REPLACE FUNCTION public._ticket_tags_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t public.tickets;
  v_room text;
BEGIN
  SELECT * INTO t FROM public.tickets WHERE id = NEW.ticket_id;
  IF t.id IS NULL THEN
    RETURN NEW;
  END IF;
  -- The assignee already had "Ticket assigned" for this ticket.
  IF NEW.tagged_user_id IS NOT DISTINCT FROM t.assigned_to_id THEN
    RETURN NEW;
  END IF;
  SELECT room_number INTO v_room FROM public.rooms WHERE id = t.room_id;
  PERFORM public._notify_user(
    NEW.tagged_user_id, NEW.hotel_id, 'ticket_tag', 'Tagged on a ticket',
    CASE WHEN v_room IS NOT NULL THEN format('Room %s: %s', v_room, t.title) ELSE t.title END,
    jsonb_build_object('ticketId', t.id, 'roomId', t.room_id)
  );
  RETURN NEW;
END;
$function$;

COMMIT;
