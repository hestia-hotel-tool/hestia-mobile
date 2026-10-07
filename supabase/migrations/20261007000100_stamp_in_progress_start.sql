-- Stamp the start of a cleaning run however the room got to In Progress.
--
-- `room_action('start')` sets `in_progress_started_at`, which drives the undo
-- window and the delayed "Cleaning started" notice. App builds from before the
-- state machine write the status directly (accepted while a hotel has
-- `status_rules_enforced = false`), and those starts carried no stamp — so the
-- supervisor was never told. Entering In Progress from anything else now
-- stamps it here, unless the write set it itself. A resume (already In
-- Progress) is not a new run and keeps the original stamp.
CREATE OR REPLACE FUNCTION public._rooms_stamp_in_progress_start()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.house_keeping_status = 'InProgress'
     AND OLD.house_keeping_status IS DISTINCT FROM 'InProgress'
     AND NEW.in_progress_started_at IS NOT DISTINCT FROM OLD.in_progress_started_at THEN
    NEW.in_progress_started_at := now();
    NEW.started_notified_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- After rooms_00_require_room_action (the guard), before the rest.
DROP TRIGGER IF EXISTS rooms_01_stamp_in_progress_start ON public.rooms;
CREATE TRIGGER rooms_01_stamp_in_progress_start
  BEFORE UPDATE OF house_keeping_status ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public._rooms_stamp_in_progress_start();
