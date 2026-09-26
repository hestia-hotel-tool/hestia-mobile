-- A promise time is kept until the room is ready: Cleaned or Inspected
-- fulfils it, so it is cleared there rather than lingering on the card and in
-- the header of a finished room.

CREATE OR REPLACE FUNCTION public._rooms_cleaning_clock()
RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_old_status text := lower(replace(replace(coalesce(OLD.house_keeping_status, ''), '_', ''), ' ', ''));
  v_new_status text := lower(replace(replace(coalesce(NEW.house_keeping_status, ''), '_', ''), ' ', ''));
  v_was boolean := public._room_cleaning_running(OLD.house_keeping_status, OLD.paused_at, OLD.return_later_at, OLD.refuse_service_at);
  v_is  boolean := public._room_cleaning_running(NEW.house_keeping_status, NEW.paused_at, NEW.return_later_at, NEW.refuse_service_at);
BEGIN
  -- Entering In Progress from anything else is a new cleaning run.
  IF v_new_status = 'inprogress' AND v_old_status <> 'inprogress' THEN
    NEW.cleaning_elapsed_seconds := 0;
    NEW.cleaning_started_at := NULL;
    NEW.cleaning_overdue_notified_at := NULL;
    v_was := false;
  END IF;

  IF v_was AND NOT v_is THEN
    -- Stopped (paused, returning later, refused, cleaned…): bank the stretch.
    NEW.cleaning_elapsed_seconds := coalesce(NEW.cleaning_elapsed_seconds, 0)
      + greatest(0, floor(extract(epoch FROM now() - coalesce(OLD.cleaning_started_at, now()))))::int;
    NEW.cleaning_started_at := NULL;
  ELSIF v_is AND NOT v_was THEN
    NEW.cleaning_started_at := now();
  END IF;

  -- The room is ready: the promise is kept.
  IF v_new_status IN ('cleaned', 'inspected') THEN
    NEW.promise_time_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;
