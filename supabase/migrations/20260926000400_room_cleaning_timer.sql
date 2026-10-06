-- Promise time, the cleaning clock, and the notifications around them.
--
-- 1. `rooms.promise_time_at` — "the room will be ready by", set from the
--    Promise Time sheet. Until now it only lived in screen state and was lost
--    on reload.
--
-- 2. The cleaning clock. A room's credit is its expected cleaning time in
--    minutes. The clock runs while the room is In Progress and not paused,
--    returning later or refusing service; those stop it. It is kept here, by
--    trigger, so every client (and the overdue job) agrees on it:
--
--      cleaning_started_at       when the current running stretch began, or
--                                null while the clock is stopped
--      cleaning_elapsed_seconds  time banked from earlier stretches
--
--    Time so far = elapsed + (now - started_at, if running). Entering In
--    Progress from any other status starts a fresh run at zero.
--
-- 3. Notifications (in-app, via `_notify_user`, which never notifies the
--    person who made the change):
--      room_paused   the room was paused / set to Return Later / refused
--                    service — to the assigner and the attendant
--      room_promise  a promise time was set — to the attendant
--      room_overdue  the clock passed the credit — to the assigner and the
--                    attendant, once per run, from a pg_cron job every minute
--
-- 4. `hotels.timezone`, so times written into notifications read as the
--    hotel's local time ("Return at 14:30"), not UTC.

ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/Zurich';

COMMENT ON COLUMN public.hotels.timezone IS
  'IANA time zone. Used to write local times into notification text.';

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS promise_time_at timestamptz,
  ADD COLUMN IF NOT EXISTS cleaning_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS cleaning_elapsed_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cleaning_overdue_notified_at timestamptz;

COMMENT ON COLUMN public.rooms.promise_time_at IS 'Promised ready-by time (Promise Time sheet).';
COMMENT ON COLUMN public.rooms.cleaning_started_at IS 'Start of the current running stretch of the cleaning clock; null while stopped.';
COMMENT ON COLUMN public.rooms.cleaning_elapsed_seconds IS 'Cleaning time banked from earlier stretches of this run.';
COMMENT ON COLUMN public.rooms.cleaning_overdue_notified_at IS 'When this run''s "taking longer than expected" notice went out.';

-- Is the clock running for this row?
CREATE OR REPLACE FUNCTION public._room_cleaning_running(p_status text, p_paused_at timestamptz,
  p_return_later_at timestamptz, p_refuse_service_at timestamptz)
RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT lower(replace(replace(coalesce(p_status, ''), '_', ''), ' ', '')) = 'inprogress'
     AND p_paused_at IS NULL
     AND p_return_later_at IS NULL
     AND p_refuse_service_at IS NULL;
$$;

-- "14:30", "tomorrow 09:00" or "Mon 29 Sep 09:00", in the hotel's zone.
CREATE OR REPLACE FUNCTION public._hotel_local_time_label(p_hotel_id uuid, p_at timestamptz)
RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_tz text;
  v_local timestamp;
  v_today date;
BEGIN
  IF p_at IS NULL THEN RETURN NULL; END IF;
  SELECT coalesce(timezone, 'UTC') INTO v_tz FROM public.hotels WHERE id = p_hotel_id;
  v_tz := coalesce(v_tz, 'UTC');
  v_local := p_at AT TIME ZONE v_tz;
  v_today := (now() AT TIME ZONE v_tz)::date;
  IF v_local::date = v_today THEN
    RETURN to_char(v_local, 'HH24:MI');
  ELSIF v_local::date = v_today + 1 THEN
    RETURN 'tomorrow ' || to_char(v_local, 'HH24:MI');
  END IF;
  RETURN to_char(v_local, 'Dy FMDD Mon HH24:MI');
END;
$$;

-- "8 min", "1 h 5 min".
CREATE OR REPLACE FUNCTION public._minutes_label(p_seconds integer)
RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE
    WHEN p_seconds < 3600 THEN greatest(1, round(p_seconds / 60.0))::int || ' min'
    WHEN (p_seconds % 3600) / 60 = 0 THEN (p_seconds / 3600) || ' h'
    ELSE (p_seconds / 3600) || ' h ' || ((p_seconds % 3600) / 60) || ' min'
  END;
$$;

-- ---------------------------------------------------------------------------
-- The clock
-- ---------------------------------------------------------------------------

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

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rooms_cleaning_clock ON public.rooms;
CREATE TRIGGER rooms_cleaning_clock
  BEFORE UPDATE OF house_keeping_status, paused_at, return_later_at, refuse_service_at ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public._rooms_cleaning_clock();

-- Rooms already being cleaned: start their clock now rather than never.
UPDATE public.rooms
   SET cleaning_started_at = now()
 WHERE cleaning_started_at IS NULL
   AND public._room_cleaning_running(house_keeping_status, paused_at, return_later_at, refuse_service_at);

-- ---------------------------------------------------------------------------
-- Pause / return later / refuse service / promise time notices
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._rooms_notify_activity()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  ra public.room_assignments;
  v_actor text;
  v_body text;
  v_data jsonb := jsonb_build_object('roomId', NEW.id);
  v_so_far integer;
BEGIN
  ra := public._current_room_assignment(NEW.id);
  IF ra.id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT full_name INTO v_actor FROM public.users WHERE id = auth.uid();
  v_actor := coalesce(v_actor, 'Someone');
  v_so_far := coalesce(NEW.cleaning_elapsed_seconds, 0);

  IF NEW.paused_at IS NOT NULL AND OLD.paused_at IS NULL THEN
    v_body := format('%s paused Room %s', v_actor, NEW.room_number)
      || CASE WHEN v_so_far >= 60 THEN format(' after %s of cleaning.', public._minutes_label(v_so_far)) ELSE '.' END;
  ELSIF NEW.return_later_at IS NOT NULL AND NEW.return_later_at IS DISTINCT FROM OLD.return_later_at THEN
    v_body := format('%s will return to Room %s at %s', v_actor, NEW.room_number,
        public._hotel_local_time_label(NEW.hotel_id, NEW.return_later_at))
      || CASE WHEN nullif(btrim(coalesce(NEW.return_later_reason, '')), '') IS NOT NULL
           THEN ' — ' || btrim(NEW.return_later_reason) || '.' ELSE '.' END;
    v_data := v_data || jsonb_build_object('returnLaterAt', NEW.return_later_at);
  ELSIF NEW.refuse_service_at IS NOT NULL AND OLD.refuse_service_at IS NULL THEN
    v_body := format('Room %s refused service', NEW.room_number)
      || CASE WHEN nullif(btrim(coalesce(NEW.refuse_service_reason, '')), '') IS NOT NULL
           THEN ' — ' || btrim(NEW.refuse_service_reason) || '.' ELSE '.' END;
  END IF;

  IF v_body IS NOT NULL THEN
    PERFORM public._notify_user(ra.assigned_by_id, NEW.hotel_id, 'room_paused', 'Cleaning on hold', v_body, v_data);
    IF ra.user_id IS DISTINCT FROM ra.assigned_by_id THEN
      PERFORM public._notify_user(ra.user_id, NEW.hotel_id, 'room_paused', 'Cleaning on hold', v_body, v_data);
    END IF;
  END IF;

  IF NEW.promise_time_at IS NOT NULL AND NEW.promise_time_at IS DISTINCT FROM OLD.promise_time_at THEN
    PERFORM public._notify_user(ra.user_id, NEW.hotel_id, 'room_promise', 'Promise time',
      format('Room %s has been promised ready by %s.', NEW.room_number,
        public._hotel_local_time_label(NEW.hotel_id, NEW.promise_time_at)),
      jsonb_build_object('roomId', NEW.id, 'promiseTimeAt', NEW.promise_time_at));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rooms_notify_activity ON public.rooms;
CREATE TRIGGER rooms_notify_activity
  AFTER UPDATE OF paused_at, return_later_at, refuse_service_at, promise_time_at ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public._rooms_notify_activity();

-- ---------------------------------------------------------------------------
-- Overdue: once per run, when the clock passes the credit
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notify_overdue_room_cleaning()
RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  r record;
  ra public.room_assignments;
  v_attendant text;
  v_so_far integer;
  v_over integer;
  v_sent integer := 0;
BEGIN
  FOR r IN
    SELECT id, hotel_id, room_number, credit, cleaning_elapsed_seconds, cleaning_started_at
      FROM public.rooms
     WHERE cleaning_started_at IS NOT NULL
       AND cleaning_overdue_notified_at IS NULL
       AND coalesce(credit, 0) > 0
       AND cleaning_elapsed_seconds + extract(epoch FROM now() - cleaning_started_at) > credit * 60
     FOR UPDATE SKIP LOCKED
  LOOP
    v_so_far := r.cleaning_elapsed_seconds + floor(extract(epoch FROM now() - r.cleaning_started_at))::int;
    v_over := v_so_far - r.credit * 60;
    ra := public._current_room_assignment(r.id);

    IF ra.id IS NOT NULL THEN
      SELECT full_name INTO v_attendant FROM public.users WHERE id = ra.user_id;
      PERFORM public._notify_user(ra.assigned_by_id, r.hotel_id, 'room_overdue', 'Taking longer than expected',
        format('Room %s is %s over its %s cleaning time%s.', r.room_number, public._minutes_label(v_over),
          public._minutes_label(r.credit * 60),
          CASE WHEN v_attendant IS NOT NULL THEN ' (' || v_attendant || ')' ELSE '' END),
        jsonb_build_object('roomId', r.id, 'attendantId', ra.user_id, 'creditMinutes', r.credit));
      IF ra.user_id IS DISTINCT FROM ra.assigned_by_id THEN
        PERFORM public._notify_user(ra.user_id, r.hotel_id, 'room_overdue', 'Taking longer than expected',
          format('Room %s has passed its %s cleaning time. Let your supervisor know if you need help.',
            r.room_number, public._minutes_label(r.credit * 60)),
          jsonb_build_object('roomId', r.id, 'creditMinutes', r.credit));
      END IF;
    END IF;

    UPDATE public.rooms SET cleaning_overdue_notified_at = now() WHERE id = r.id;
    v_sent := v_sent + 1;
  END LOOP;
  RETURN v_sent;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_overdue_room_cleaning() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._hotel_local_time_label(uuid, timestamptz) FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'notify-overdue-room-cleaning';
  PERFORM cron.schedule('notify-overdue-room-cleaning', '* * * * *', 'SELECT public.notify_overdue_room_cleaning()');
END $$;
