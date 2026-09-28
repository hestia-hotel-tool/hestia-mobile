-- A room can only be started (set In Progress) once a room attendant is
-- assigned to it.
--
-- In Progress is "someone is cleaning this room": it starts the cleaning clock
-- and the overdue notices go to the assignee and whoever assigned them. With
-- nobody assigned there is no one cleaning, no one to notify, and the clock
-- would run for nothing. The app hides the option in that case; this is the
-- rule for every other path (an older build, the list's other options, a
-- script).
--
-- Only the *move into* In Progress is checked, so a room already in progress
-- can still be paused, returned to later or finished.

CREATE OR REPLACE FUNCTION public._rooms_require_attendant_for_in_progress()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF lower(replace(replace(coalesce(NEW.house_keeping_status, ''), '_', ''), ' ', '')) = 'inprogress'
     AND lower(replace(replace(coalesce(OLD.house_keeping_status, ''), '_', ''), ' ', '')) <> 'inprogress'
     AND NOT EXISTS (SELECT 1 FROM public.room_assignments ra WHERE ra.room_id = NEW.id) THEN
    RAISE EXCEPTION 'Assign a room attendant to Room % before starting to clean it.', NEW.room_number
      USING ERRCODE = 'P0001', HINT = 'Assign the room, then set it In Progress.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rooms_require_attendant_for_in_progress ON public.rooms;
-- Named to sort before rooms_cleaning_clock, so a refused update starts no clock.
CREATE TRIGGER rooms_a_require_attendant_for_in_progress
  BEFORE UPDATE OF house_keeping_status ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public._rooms_require_attendant_for_in_progress();
