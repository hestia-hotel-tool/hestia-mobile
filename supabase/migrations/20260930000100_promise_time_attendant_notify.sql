-- Promise time: the attendant always hears about it.
--
-- `_rooms_notify_activity` (20260929000400) tells the assigned attendant when
-- a promise is set. That misses the usual order on the floor: the promise is
-- made at the front desk first and the room assigned after, and the attendant
-- only got "You have been assigned to Room 505" with nothing about the time.
--
-- 1. An assignment to a room with a standing promise says so in the same
--    notification (one push, not two).
-- 2. Removing a promise tells the attendant it no longer stands. Not when the
--    room was cleaned: `_rooms_cleaning_clock` clears it then, as kept.
--
-- `_notify_user` skips the person making the change, as everywhere else.

CREATE OR REPLACE FUNCTION public._room_assignments_notify()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_room text;
  v_shift text;
  v_promise timestamptz;
  v_status text;
  v_body text;
  v_data jsonb;
BEGIN
  -- An upsert that re-saves the same person is not a new assignment.
  IF TG_OP = 'UPDATE' AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN
    RETURN NEW;
  END IF;

  SELECT room_number, promise_time_at, house_keeping_status
    INTO v_room, v_promise, v_status
    FROM public.rooms WHERE id = NEW.room_id;
  SELECT btrim(name) INTO v_shift FROM public.shifts WHERE id = NEW.shift_id;

  v_body := CASE WHEN v_shift IS NOT NULL AND v_shift <> ''
    THEN format('You have been assigned to Room %s (%s shift).', v_room, v_shift)
    ELSE format('You have been assigned to Room %s.', v_room)
  END;
  v_data := jsonb_build_object('roomId', NEW.room_id, 'shiftId', NEW.shift_id);

  IF v_promise IS NOT NULL AND v_status NOT IN ('Cleaned', 'Inspected') THEN
    v_body := v_body || format(' Promised ready by %s.', public._hotel_local_time_label(NEW.hotel_id, v_promise));
    v_data := v_data || jsonb_build_object('promiseTimeAt', v_promise);
  END IF;

  PERFORM public._notify_user(NEW.user_id, NEW.hotel_id, 'room_assignment', 'Room assignment', v_body, v_data);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public._rooms_notify_promise_removed()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  ra public.room_assignments;
BEGIN
  IF OLD.promise_time_at IS NULL OR NEW.promise_time_at IS NOT NULL
     OR NEW.house_keeping_status IN ('Cleaned', 'Inspected') THEN
    RETURN NEW;
  END IF;
  ra := public._current_room_assignment(NEW.id);
  IF ra.id IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM public._notify_user(ra.user_id, NEW.hotel_id, 'room_promise', 'Promise time removed',
    format('Room %s is no longer promised for %s.', NEW.room_number,
      public._hotel_local_time_label(NEW.hotel_id, OLD.promise_time_at)),
    jsonb_build_object('roomId', NEW.id, 'promiseTimeAt', NULL));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rooms_notify_promise_removed ON public.rooms;
CREATE TRIGGER rooms_notify_promise_removed
  AFTER UPDATE OF promise_time_at ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public._rooms_notify_promise_removed();
