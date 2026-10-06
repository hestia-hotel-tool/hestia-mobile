-- Task notifications, written by the database.
--
-- ## Why this exists
--
-- In-app notifications were written by the `notify` Edge Function, which the app
-- called after the fact. Its inserts never set `hotel_id` — NOT NULL since the
-- tenancy work — so every one of them failed. On the development database the
-- only notifications that exist are General Announcements (written by
-- `publish_announcement`); there has never been a chat_message, ticket_tag or
-- room_assignment row, so Tasks, the Chat badge's message counts and the
-- ticket-tag badge have never worked.
--
-- Triggers fix that and more: a notification now follows from the change
-- itself, however it was made (app, dashboard, SQL), in the same transaction,
-- with the source row's hotel.
--
-- ## What notifies whom
--
--   room assigned (or reassigned)       -> the assignee            room_assignment
--   assigned room flagged               -> its attendant           room_flagged
--   assigned room set to priority       -> its attendant           room_priority
--   room set to Cleaned                 -> whoever assigned it      room_cleaned
--   room sent back to Dirty after
--     Cleaned/Inspected (rejected)      -> its attendant           room_rejected
--   ticket assigned                     -> the assignee            ticket_assigned
--   tagged on a ticket                  -> the tagged person       ticket_tag
--   chat message                        -> the other participants  chat_message
--
-- Inspected does not notify (for now). Nobody is notified about their own
-- action. The app lists every task type under Chat > Notifications > Tasks.
--
-- ## Not here: push
--
-- These rows show in the app live (Realtime), on the badges and in Tasks. Push to
-- a closed phone is a follow-up: a webhook on `notifications` INSERT calling a
-- reworked `notify` function.

-- Who assigned a room — needed to tell them when it is cleaned.
ALTER TABLE public.room_assignments
  ADD COLUMN IF NOT EXISTS assigned_by_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.room_assignments.assigned_by_id IS
  'Who made this assignment (auth.uid() at insert / reassign). Receives the room_cleaned notification.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Insert one notification, unless there is no recipient or the recipient is
-- the person making the change.
CREATE OR REPLACE FUNCTION public._notify_user(
  p_user_id uuid,
  p_hotel_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb
) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF p_user_id IS NULL OR p_hotel_id IS NULL THEN
    RETURN;
  END IF;
  IF p_user_id = auth.uid() THEN
    RETURN;
  END IF;
  INSERT INTO public.notifications (user_id, hotel_id, type, title, body, data)
  VALUES (p_user_id, p_hotel_id, p_type, p_title, p_body, coalesce(p_data, '{}'::jsonb));
END;
$$;

-- The room's current assignment: the one being worked by the caller if there
-- is one (an attendant marking their own room), otherwise the latest.
CREATE OR REPLACE FUNCTION public._current_room_assignment(p_room_id uuid)
RETURNS public.room_assignments
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT ra.*
    FROM public.room_assignments ra
   WHERE ra.room_id = p_room_id
   ORDER BY (ra.user_id = auth.uid()) DESC NULLS LAST,
            ra.updated_at DESC NULLS LAST,
            ra.created_at DESC NULLS LAST
   LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- Room assignments
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._room_assignments_set_assigned_by()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    NEW.assigned_by_id := coalesce(auth.uid(), NEW.assigned_by_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public._room_assignments_notify()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_room text;
  v_shift text;
BEGIN
  -- An upsert that re-saves the same person is not a new assignment.
  IF TG_OP = 'UPDATE' AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN
    RETURN NEW;
  END IF;

  SELECT room_number INTO v_room FROM public.rooms WHERE id = NEW.room_id;
  SELECT btrim(name) INTO v_shift FROM public.shifts WHERE id = NEW.shift_id;

  PERFORM public._notify_user(
    NEW.user_id, NEW.hotel_id, 'room_assignment', 'Room assignment',
    CASE WHEN v_shift IS NOT NULL AND v_shift <> ''
      THEN format('You have been assigned to Room %s (%s shift).', v_room, v_shift)
      ELSE format('You have been assigned to Room %s.', v_room)
    END,
    jsonb_build_object('roomId', NEW.room_id, 'shiftId', NEW.shift_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS room_assignments_set_assigned_by ON public.room_assignments;
CREATE TRIGGER room_assignments_set_assigned_by
  BEFORE INSERT OR UPDATE OF user_id ON public.room_assignments
  FOR EACH ROW EXECUTE FUNCTION public._room_assignments_set_assigned_by();

DROP TRIGGER IF EXISTS room_assignments_notify ON public.room_assignments;
CREATE TRIGGER room_assignments_notify
  AFTER INSERT OR UPDATE OF user_id ON public.room_assignments
  FOR EACH ROW EXECUTE FUNCTION public._room_assignments_notify();

-- ---------------------------------------------------------------------------
-- Rooms: flagged, priority, cleaned, sent back
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._rooms_notify()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  ra public.room_assignments;
  v_attendant text;
  v_old_status text := lower(replace(coalesce(OLD.house_keeping_status, ''), '_', ''));
  v_new_status text := lower(replace(coalesce(NEW.house_keeping_status, ''), '_', ''));
  v_data jsonb := jsonb_build_object('roomId', NEW.id);
BEGIN
  ra := public._current_room_assignment(NEW.id);
  IF ra.id IS NULL THEN
    RETURN NEW; -- nobody on this room, nobody to tell
  END IF;

  IF coalesce(NEW.flagged, false) AND NOT coalesce(OLD.flagged, false) THEN
    PERFORM public._notify_user(ra.user_id, NEW.hotel_id, 'room_flagged', 'Room flagged',
      format('Room %s has been flagged.', NEW.room_number), v_data);
  END IF;

  IF lower(coalesce(NEW.priority, '')) = 'high' AND lower(coalesce(OLD.priority, '')) <> 'high' THEN
    PERFORM public._notify_user(ra.user_id, NEW.hotel_id, 'room_priority', 'Priority room',
      format('Room %s is now a priority.', NEW.room_number), v_data);
  END IF;

  IF v_new_status = 'cleaned' AND v_old_status <> 'cleaned' THEN
    SELECT full_name INTO v_attendant FROM public.users WHERE id = ra.user_id;
    PERFORM public._notify_user(ra.assigned_by_id, NEW.hotel_id, 'room_cleaned', 'Room cleaned',
      format('%s cleaned Room %s.', coalesce(v_attendant, 'The attendant'), NEW.room_number),
      v_data || jsonb_build_object('attendantId', ra.user_id));
  END IF;

  IF v_new_status = 'dirty' AND v_old_status IN ('cleaned', 'inspected') THEN
    PERFORM public._notify_user(ra.user_id, NEW.hotel_id, 'room_rejected', 'Room sent back',
      format('Room %s was sent back — please clean it again.', NEW.room_number), v_data);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rooms_notify ON public.rooms;
CREATE TRIGGER rooms_notify
  AFTER UPDATE OF flagged, priority, house_keeping_status ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public._rooms_notify();

-- ---------------------------------------------------------------------------
-- Tickets: assigned, tagged
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._tickets_notify()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_room text;
BEGIN
  IF NEW.assigned_to_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.assigned_to_id IS NOT DISTINCT FROM OLD.assigned_to_id THEN
    RETURN NEW;
  END IF;

  SELECT room_number INTO v_room FROM public.rooms WHERE id = NEW.room_id;
  PERFORM public._notify_user(
    NEW.assigned_to_id, NEW.hotel_id, 'ticket_assigned', 'Ticket assigned',
    CASE WHEN v_room IS NOT NULL
      THEN format('You have been assigned a ticket: %s (Room %s).', NEW.title, v_room)
      ELSE format('You have been assigned a ticket: %s.', NEW.title)
    END,
    jsonb_build_object('ticketId', NEW.id, 'roomId', NEW.room_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_notify ON public.tickets;
CREATE TRIGGER tickets_notify
  AFTER INSERT OR UPDATE OF assigned_to_id ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public._tickets_notify();

CREATE OR REPLACE FUNCTION public._ticket_tags_notify()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  t public.tickets;
  v_room text;
BEGIN
  SELECT * INTO t FROM public.tickets WHERE id = NEW.ticket_id;
  IF t.id IS NULL THEN
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
$$;

DROP TRIGGER IF EXISTS ticket_tags_notify ON public.ticket_tags;
CREATE TRIGGER ticket_tags_notify
  AFTER INSERT ON public.ticket_tags
  FOR EACH ROW EXECUTE FUNCTION public._ticket_tags_notify();

-- ---------------------------------------------------------------------------
-- Chat messages
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._messages_notify()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_sender text;
  v_body text;
BEGIN
  SELECT full_name INTO v_sender FROM public.users WHERE id = NEW.sender_id;
  v_body := CASE NEW.type
    WHEN 'image' THEN '📷 Photo'
    WHEN 'file' THEN '📎 File'
    ELSE coalesce(nullif(btrim(NEW.content), ''), 'New message')
  END;

  INSERT INTO public.notifications (user_id, hotel_id, type, title, body, data)
  SELECT cp.user_id, NEW.hotel_id, 'chat_message', coalesce(v_sender, 'New message'), left(v_body, 500),
         jsonb_build_object('chatId', NEW.chat_id, 'messageId', NEW.id)
    FROM public.chat_participants cp
   WHERE cp.chat_id = NEW.chat_id
     AND cp.user_id <> NEW.sender_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_notify ON public.messages;
CREATE TRIGGER messages_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public._messages_notify();

-- Internal: not callable over the API.
REVOKE ALL ON FUNCTION public._notify_user(uuid, uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._current_room_assignment(uuid) FROM PUBLIC, anon, authenticated;
