-- Why a room is flagged — Figma 406-1783's "Reason/note" under Flag Room.
--
-- A flag with no reason told the attendant only that something was wrong. The
-- reason is stored on the room, cleared when it is unflagged (by the app), and
-- carried into the attendant's `room_flagged` notification.

ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS flag_reason text;

COMMENT ON COLUMN public.rooms.flag_reason IS
  'Why the room is flagged (Flag Room > Reason/note). NULL when not flagged.';

-- Same function as 20260925000100_task_notifications.sql, with the reason in
-- the flagged message.
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
      CASE WHEN nullif(btrim(coalesce(NEW.flag_reason, '')), '') IS NOT NULL
        THEN format('Room %s has been flagged: %s', NEW.room_number, btrim(NEW.flag_reason))
        ELSE format('Room %s has been flagged.', NEW.room_number)
      END,
      v_data || jsonb_build_object('reason', nullif(btrim(coalesce(NEW.flag_reason, '')), '')));
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

-- The trigger now also fires when only the reason changes; the function only
-- notifies on the flagged false -> true edge, so editing a reason is silent.
DROP TRIGGER IF EXISTS rooms_notify ON public.rooms;
CREATE TRIGGER rooms_notify
  AFTER UPDATE OF flagged, flag_reason, priority, house_keeping_status ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public._rooms_notify();
