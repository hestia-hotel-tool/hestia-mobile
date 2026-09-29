-- Service exceptions: Do Not Disturb, Refused Service and Return Later, done
-- the way hotels run them.
--
-- ## What was wrong
--
-- 1. Refused Service and Return Later saved the room as In Progress. The room
--    was not being cleaned, but it counted as In Progress everywhere and
--    blocked its attendant from starting another room.
-- 2. Do Not Disturb was one of Refused Service's reasons. They are different:
--    DND means the door cannot be knocked on and must be checked again;
--    refused means the guest said "no service today".
-- 3. Clearing one left the room In Progress, told nobody, and nothing expired:
--    a refusal from last week still showed.
-- 4. Nobody was reminded to check a DND door again or to go back at a
--    return-later time, and a DND that lasted all day raised no welfare check.
--
-- ## The rules (enforced here, whoever writes the room: app, list, detail, SQL)
--
--   Do Not Disturb   rooms.dnd_at. The room keeps its status (In Progress drops
--                    back to Dirty — nobody is cleaning); the clock stops.
--                    Every re-check (dnd_checked_at written again) counts and
--                    schedules the next one, `hotels.dnd_recheck_minutes`
--                    later. The attendant is reminded when a check is due.
--                    Still DND at `hotels.dnd_cutoff_time` (after at least one
--                    re-check window) → supervisors get a welfare-check alert,
--                    once per service day. Cleared → the room is Dirty, ready
--                    to clean.
--   Refused Service  refuse_service_at + reason. Status as for DND. Cleared
--                    ("guest now wants service") → Dirty. Ends by itself at the
--                    start of the next service day.
--   Return Later     return_later_at (must be in the future) + reason. Status as
--                    for DND. The attendant is reminded at the time; 30 minutes
--                    later, still not started → supervisors are told. Ends with
--                    the service day too.
--   Starting to clean (In Progress), Cleaned or Inspected ends any of the three.
--   Setting one ends the others: a room is in at most one state.
--
-- ## Who hears about it
--
-- Supervisors = whoever assigned the room + every housekeeping full-access user
-- on the room's shift (all of them when nobody is on it). The attendant too,
-- when someone else sets it. Nobody is told about their own action.
--
-- History: each set, re-check and clear is labelled in the room's History
-- (activity_logs, through _audit_label); the reminder bookkeeping is not.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS dnd_at timestamptz,
  ADD COLUMN IF NOT EXISTS dnd_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS dnd_check_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dnd_next_check_at timestamptz,
  ADD COLUMN IF NOT EXISTS dnd_reminded_at timestamptz,
  ADD COLUMN IF NOT EXISTS dnd_escalated_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_later_reminded_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_later_escalated_at timestamptz;

COMMENT ON COLUMN public.rooms.dnd_at IS 'Do Not Disturb since. Null = no DND. See 20260929000400.';
COMMENT ON COLUMN public.rooms.dnd_checked_at IS 'Last time staff checked the door and found DND still on. Writing it again records a re-check.';

ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS dnd_recheck_minutes integer NOT NULL DEFAULT 60
    CHECK (dnd_recheck_minutes BETWEEN 15 AND 240),
  ADD COLUMN IF NOT EXISTS dnd_cutoff_time time NOT NULL DEFAULT '14:00',
  ADD COLUMN IF NOT EXISTS service_day_starts time NOT NULL DEFAULT '04:00',
  ADD COLUMN IF NOT EXISTS service_day_reset_on date;

COMMENT ON COLUMN public.hotels.dnd_recheck_minutes IS 'How often a DND door is checked again (minutes).';
COMMENT ON COLUMN public.hotels.dnd_cutoff_time IS 'Hotel-local time after which a room still on DND needs a welfare check.';
COMMENT ON COLUMN public.hotels.service_day_starts IS 'Hotel-local time the housekeeping day starts: refusals and return-laters end then.';

-- Today counts as already started, so switching this on does not end today's
-- refusals and return-laters on the spot.
UPDATE public.hotels SET service_day_reset_on = (now() AT TIME ZONE coalesce(timezone, 'UTC'))::date
 WHERE service_day_reset_on IS NULL;

CREATE INDEX IF NOT EXISTS idx_rooms_dnd_open ON public.rooms (hotel_id) WHERE dnd_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rooms_return_later_open ON public.rooms (hotel_id) WHERE return_later_at IS NOT NULL;

-- Old data: DND saved as a refusal reason becomes a DND.
UPDATE public.rooms
   SET dnd_at = coalesce(refuse_service_at, now()), dnd_checked_at = coalesce(refuse_service_at, now()),
       dnd_check_count = 1, refuse_service_at = NULL, refuse_service_reason = NULL
 WHERE refuse_service_reason ILIKE '%do not disturb%';

-- ---------------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------------

-- The hotel's wall clock now.
CREATE OR REPLACE FUNCTION public._hotel_local_now(p_hotel_id uuid)
RETURNS timestamp
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT now() AT TIME ZONE coalesce((SELECT timezone FROM hotels WHERE id = p_hotel_id), 'UTC');
$$;

-- Who supervises a room: its assigner + housekeeping full-access users on the
-- room's shift (all of them when none is on it).
CREATE OR REPLACE FUNCTION public._room_supervisor_ids(p_room_id uuid)
RETURNS SETOF uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  ra room_assignments := public._current_room_assignment(p_room_id);
  v_hotel uuid := (SELECT hotel_id FROM rooms WHERE id = p_room_id);
BEGIN
  RETURN QUERY
  WITH hk AS (
    SELECT u.id, u.shift_id
      FROM users u
      JOIN job_titles jt ON jt.id = u.job_title_id
      JOIN roles r ON r.id = jt.role_id
      JOIN departments d ON d.id = jt.department_id
     WHERE u.hotel_id = v_hotel AND r.key = 'full_access' AND d.key = 'housekeeping'
  ), on_shift AS (
    SELECT id FROM hk WHERE ra.shift_id IS NOT NULL AND shift_id = ra.shift_id
  )
  SELECT DISTINCT x.id FROM (
    SELECT ra.assigned_by_id AS id WHERE ra.assigned_by_id IS NOT NULL
    UNION ALL SELECT id FROM on_shift
    UNION ALL SELECT id FROM hk WHERE NOT EXISTS (SELECT 1 FROM on_shift)
  ) x;
END;
$$;

-- Tell the room's supervisors (and its attendant, if `p_with_attendant`).
CREATE OR REPLACE FUNCTION public._notify_room_supervisors(
  p_room_id uuid, p_hotel_id uuid, p_type text, p_title text, p_body text, p_data jsonb, p_with_attendant boolean
) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_id uuid;
  v_attendant uuid := (public._current_room_assignment(p_room_id)).user_id;
BEGIN
  FOR v_id IN
    SELECT s.sid FROM public._room_supervisor_ids(p_room_id) AS s(sid)
    UNION
    SELECT v_attendant WHERE p_with_attendant AND v_attendant IS NOT NULL
  LOOP
    PERFORM public._notify_user(v_id, p_hotel_id, p_type, p_title, p_body, p_data);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public._hotel_local_now(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._room_supervisor_ids(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._notify_room_supervisors(uuid, uuid, text, text, text, jsonb, boolean) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. The rules (BEFORE UPDATE — runs first: "0" sorts before the other triggers)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._rooms_service_exceptions()
RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_recheck interval := make_interval(mins => coalesce(
    (SELECT dnd_recheck_minutes FROM hotels WHERE id = NEW.hotel_id), 60));
  v_dnd_set boolean := NEW.dnd_at IS NOT NULL AND OLD.dnd_at IS NULL;
  v_refuse_set boolean := NEW.refuse_service_at IS NOT NULL AND OLD.refuse_service_at IS NULL;
  v_return_set boolean := NEW.return_later_at IS NOT NULL AND NEW.return_later_at IS DISTINCT FROM OLD.return_later_at;
  v_done boolean := NEW.house_keeping_status IN ('Cleaned', 'Inspected');
  v_started boolean := NEW.house_keeping_status = 'InProgress' AND OLD.house_keeping_status IS DISTINCT FROM 'InProgress';
BEGIN
  -- Entering a state -------------------------------------------------------
  IF v_dnd_set OR v_refuse_set OR v_return_set THEN
    IF v_done THEN
      RAISE EXCEPTION 'Room % is already %: nothing left to service today.', NEW.room_number, lower(NEW.house_keeping_status)
        USING ERRCODE = '22023';
    END IF;
    IF v_return_set AND NEW.return_later_at < now() - interval '2 minutes' THEN
      RAISE EXCEPTION 'The return time has already passed. Choose a later time.' USING ERRCODE = '22023';
    END IF;
    -- Nobody is cleaning a room they cannot get into.
    IF NEW.house_keeping_status = 'InProgress' THEN
      NEW.house_keeping_status := 'Dirty';
    END IF;
    NEW.paused_at := NULL;
    -- One state at a time: the one just set wins.
    IF v_dnd_set THEN
      NEW.refuse_service_at := NULL; NEW.refuse_service_reason := NULL;
      NEW.return_later_at := NULL; NEW.return_later_reason := NULL;
    ELSIF v_refuse_set THEN
      NEW.dnd_at := NULL;
      NEW.return_later_at := NULL; NEW.return_later_reason := NULL;
    ELSE
      NEW.dnd_at := NULL;
      NEW.refuse_service_at := NULL; NEW.refuse_service_reason := NULL;
    END IF;
  ELSIF v_started OR v_done THEN
    -- Going in (or finishing) ends whatever was stopping service.
    NEW.dnd_at := NULL;
    NEW.refuse_service_at := NULL; NEW.refuse_service_reason := NULL;
    NEW.return_later_at := NULL; NEW.return_later_reason := NULL;
  END IF;

  -- DND bookkeeping ------------------------------------------------------------
  -- A DND runs from when it was first found; a re-sent start time is ignored.
  IF NEW.dnd_at IS NOT NULL AND OLD.dnd_at IS NOT NULL THEN
    NEW.dnd_at := OLD.dnd_at;
  END IF;
  IF NEW.dnd_at IS NOT NULL AND OLD.dnd_at IS NULL THEN
    NEW.dnd_at := now();
    NEW.dnd_checked_at := now();
    NEW.dnd_check_count := 1;
    NEW.dnd_next_check_at := now() + v_recheck;
    NEW.dnd_reminded_at := NULL;
    NEW.dnd_escalated_at := NULL;
  ELSIF NEW.dnd_at IS NOT NULL AND NEW.dnd_checked_at IS DISTINCT FROM OLD.dnd_checked_at THEN
    -- Checked the door again: still DND.
    NEW.dnd_checked_at := now();
    NEW.dnd_check_count := OLD.dnd_check_count + 1;
    NEW.dnd_next_check_at := now() + v_recheck;
    NEW.dnd_reminded_at := NULL;
  ELSIF NEW.dnd_at IS NULL THEN
    NEW.dnd_checked_at := NULL;
    NEW.dnd_check_count := 0;
    NEW.dnd_next_check_at := NULL;
    NEW.dnd_reminded_at := NULL;
    NEW.dnd_escalated_at := NULL;
  END IF;

  IF NEW.return_later_at IS DISTINCT FROM OLD.return_later_at THEN
    NEW.return_later_reminded_at := NULL;
    NEW.return_later_escalated_at := NULL;
  END IF;

  -- Leaving a state without starting to clean: back to Dirty, ready to clean.
  -- (Rooms stuck In Progress by the old flow land here too.)
  IF NOT v_started AND NOT v_done AND NEW.house_keeping_status = 'InProgress'
     AND NEW.paused_at IS NULL
     AND ((OLD.dnd_at IS NOT NULL AND NEW.dnd_at IS NULL)
       OR (OLD.refuse_service_at IS NOT NULL AND NEW.refuse_service_at IS NULL)
       OR (OLD.return_later_at IS NOT NULL AND NEW.return_later_at IS NULL)) THEN
    NEW.house_keeping_status := 'Dirty';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rooms_0_service_exceptions ON public.rooms;
CREATE TRIGGER rooms_0_service_exceptions
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public._rooms_service_exceptions();

-- ---------------------------------------------------------------------------
-- 4. Notifications on each change (AFTER UPDATE)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._rooms_notify_activity()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  ra public.room_assignments := public._current_room_assignment(NEW.id);
  v_actor text;
  v_at text := public._hotel_local_time_label(NEW.hotel_id, now());
  v_data jsonb := jsonb_build_object('roomId', NEW.id);
  v_so_far integer := coalesce(NEW.cleaning_elapsed_seconds, 0);
  v_by text;
  v_span text;
BEGIN
  SELECT full_name INTO v_actor FROM public.users WHERE id = auth.uid();
  v_by := CASE WHEN v_actor IS NOT NULL THEN format(' (%s, %s)', v_actor, v_at) ELSE format(' (%s)', v_at) END;

  -- Do Not Disturb -------------------------------------------------------------
  IF NEW.dnd_at IS NOT NULL AND OLD.dnd_at IS NULL THEN
    PERFORM public._notify_room_supervisors(NEW.id, NEW.hotel_id, 'room_dnd', 'Do Not Disturb',
      format('Room %s has a Do Not Disturb sign%s. Next check at %s.', NEW.room_number, v_by,
        public._hotel_local_time_label(NEW.hotel_id, NEW.dnd_next_check_at)),
      v_data || jsonb_build_object('nextCheckAt', NEW.dnd_next_check_at), true);
  ELSIF OLD.dnd_at IS NOT NULL AND NEW.dnd_at IS NULL AND auth.uid() IS NOT NULL THEN
    v_span := public._minutes_label(greatest(60, extract(epoch FROM now() - OLD.dnd_at)::int));
    PERFORM public._notify_room_supervisors(NEW.id, NEW.hotel_id, 'room_dnd_cleared', 'Do Not Disturb removed',
      format('Room %s: the Do Not Disturb sign is gone after %s%s%s.', NEW.room_number, v_span,
        CASE WHEN NEW.house_keeping_status = 'InProgress' THEN ' — cleaning has started' ELSE ' — ready to clean' END, v_by),
      v_data, true);
  END IF;

  -- Refused Service ------------------------------------------------------------
  IF NEW.refuse_service_at IS NOT NULL AND OLD.refuse_service_at IS NULL THEN
    PERFORM public._notify_room_supervisors(NEW.id, NEW.hotel_id, 'room_refused', 'Service refused',
      format('Room %s refused service%s%s.', NEW.room_number,
        CASE WHEN nullif(btrim(coalesce(NEW.refuse_service_reason, '')), '') IS NOT NULL
             THEN ' — ' || btrim(NEW.refuse_service_reason) ELSE '' END, v_by),
      v_data, true);
  ELSIF OLD.refuse_service_at IS NOT NULL AND NEW.refuse_service_at IS NULL AND auth.uid() IS NOT NULL
        AND NEW.house_keeping_status NOT IN ('Cleaned', 'Inspected') THEN
    PERFORM public._notify_room_supervisors(NEW.id, NEW.hotel_id, 'room_service_resumed', 'Service back on',
      format('Room %s: the guest now wants service%s%s.', NEW.room_number,
        CASE WHEN NEW.house_keeping_status = 'InProgress' THEN ' — cleaning has started' ELSE ' — ready to clean' END, v_by),
      v_data, true);
  END IF;

  -- Return Later -----------------------------------------------------------------
  IF NEW.return_later_at IS NOT NULL AND NEW.return_later_at IS DISTINCT FROM OLD.return_later_at THEN
    PERFORM public._notify_room_supervisors(NEW.id, NEW.hotel_id, 'room_return_later', 'Return later',
      format('Room %s: back at %s%s%s.', NEW.room_number,
        public._hotel_local_time_label(NEW.hotel_id, NEW.return_later_at),
        CASE WHEN nullif(btrim(coalesce(NEW.return_later_reason, '')), '') IS NOT NULL
             THEN ' — ' || btrim(NEW.return_later_reason) ELSE '' END, v_by),
      v_data || jsonb_build_object('returnLaterAt', NEW.return_later_at), true);
  END IF;

  -- Pause (the attendant stepping away) — as before: the assigner and attendant.
  IF NEW.paused_at IS NOT NULL AND OLD.paused_at IS NULL AND ra.id IS NOT NULL THEN
    PERFORM public._notify_user(ra.assigned_by_id, NEW.hotel_id, 'room_paused', 'Cleaning on hold',
      format('%s paused Room %s', coalesce(v_actor, 'Someone'), NEW.room_number)
        || CASE WHEN v_so_far >= 60 THEN format(' after %s of cleaning.', public._minutes_label(v_so_far)) ELSE '.' END,
      v_data);
    IF ra.user_id IS DISTINCT FROM ra.assigned_by_id THEN
      PERFORM public._notify_user(ra.user_id, NEW.hotel_id, 'room_paused', 'Cleaning on hold',
        format('%s paused Room %s.', coalesce(v_actor, 'Someone'), NEW.room_number), v_data);
    END IF;
  END IF;

  -- Promise time — as before: the attendant.
  IF NEW.promise_time_at IS NOT NULL AND NEW.promise_time_at IS DISTINCT FROM OLD.promise_time_at AND ra.id IS NOT NULL THEN
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
  AFTER UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public._rooms_notify_activity();

-- ---------------------------------------------------------------------------
-- 5. Timed work, every minute: reminders, escalations, the service-day reset
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.process_room_service_timers()
RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  r record;
  h record;
  v_attendant uuid;
  v_n integer := 0;
  v_local timestamp;
BEGIN
  -- New service day: refusals and return-laters end; a DND carries on (and is
  -- escalated again today, as a DND since yesterday).
  FOR h IN SELECT id, service_day_starts, service_day_reset_on FROM hotels LOOP
    v_local := public._hotel_local_now(h.id);
    IF v_local::time >= h.service_day_starts AND (h.service_day_reset_on IS NULL OR h.service_day_reset_on < v_local::date) THEN
      UPDATE rooms SET refuse_service_at = NULL, refuse_service_reason = NULL,
                       return_later_at = NULL, return_later_reason = NULL
       WHERE hotel_id = h.id AND (refuse_service_at IS NOT NULL OR return_later_at IS NOT NULL);
      UPDATE rooms SET dnd_escalated_at = NULL WHERE hotel_id = h.id AND dnd_at IS NOT NULL;
      UPDATE hotels SET service_day_reset_on = v_local::date WHERE id = h.id;
    END IF;
  END LOOP;

  -- DND: a re-check is due → remind the attendant (the supervisors if none).
  FOR r IN
    SELECT id, hotel_id, room_number, dnd_check_count FROM rooms
     WHERE dnd_at IS NOT NULL AND dnd_next_check_at <= now() AND dnd_reminded_at IS NULL
     FOR UPDATE SKIP LOCKED
  LOOP
    v_attendant := (public._current_room_assignment(r.id)).user_id;
    IF v_attendant IS NOT NULL THEN
      PERFORM public._notify_user(v_attendant, r.hotel_id, 'room_dnd_check', 'Check the DND sign',
        format('Room %s: time to check the Do Not Disturb sign again (check %s).', r.room_number, r.dnd_check_count + 1),
        jsonb_build_object('roomId', r.id));
    ELSE
      PERFORM public._notify_room_supervisors(r.id, r.hotel_id, 'room_dnd_check', 'Check the DND sign',
        format('Room %s: its Do Not Disturb sign is due a check and nobody is assigned.', r.room_number),
        jsonb_build_object('roomId', r.id), false);
    END IF;
    UPDATE rooms SET dnd_reminded_at = now() WHERE id = r.id;
    v_n := v_n + 1;
  END LOOP;

  -- DND past the cut-off (and past one re-check window) → welfare check.
  FOR r IN
    SELECT ro.id, ro.hotel_id, ro.room_number, ro.dnd_at, ro.dnd_check_count, ho.dnd_cutoff_time, ho.dnd_recheck_minutes
      FROM rooms ro JOIN hotels ho ON ho.id = ro.hotel_id
     WHERE ro.dnd_at IS NOT NULL AND ro.dnd_escalated_at IS NULL
       AND public._hotel_local_now(ro.hotel_id)::time >= ho.dnd_cutoff_time
       AND ro.dnd_at <= now() - make_interval(mins => ho.dnd_recheck_minutes)
     FOR UPDATE OF ro SKIP LOCKED
  LOOP
    PERFORM public._notify_room_supervisors(r.id, r.hotel_id, 'room_dnd_welfare', 'DND welfare check',
      format('Room %s has had a Do Not Disturb sign since %s (%s %s). Please contact the guest to check on them.',
        r.room_number, public._hotel_local_time_label(r.hotel_id, r.dnd_at), r.dnd_check_count,
        CASE WHEN r.dnd_check_count = 1 THEN 'check' ELSE 'checks' END),
      jsonb_build_object('roomId', r.id, 'dndSince', r.dnd_at), false);
    UPDATE rooms SET dnd_escalated_at = now() WHERE id = r.id;
    v_n := v_n + 1;
  END LOOP;

  -- Return Later: time to go back → the attendant.
  FOR r IN
    SELECT id, hotel_id, room_number, return_later_at FROM rooms
     WHERE return_later_at IS NOT NULL AND return_later_at <= now() AND return_later_reminded_at IS NULL
     FOR UPDATE SKIP LOCKED
  LOOP
    v_attendant := (public._current_room_assignment(r.id)).user_id;
    IF v_attendant IS NOT NULL THEN
      PERFORM public._notify_user(v_attendant, r.hotel_id, 'room_return_due', 'Time to go back',
        format('Room %s: the guest asked for service at %s.', r.room_number,
          public._hotel_local_time_label(r.hotel_id, r.return_later_at)),
        jsonb_build_object('roomId', r.id));
    END IF;
    UPDATE rooms SET return_later_reminded_at = now() WHERE id = r.id;
    v_n := v_n + 1;
  END LOOP;

  -- Return Later: 30 minutes past and still not started → supervisors.
  FOR r IN
    SELECT id, hotel_id, room_number, return_later_at FROM rooms
     WHERE return_later_at IS NOT NULL AND return_later_at <= now() - interval '30 minutes'
       AND return_later_escalated_at IS NULL
     FOR UPDATE SKIP LOCKED
  LOOP
    PERFORM public._notify_room_supervisors(r.id, r.hotel_id, 'room_return_overdue', 'Return later missed',
      format('Room %s was due for service at %s and has not been started.', r.room_number,
        public._hotel_local_time_label(r.hotel_id, r.return_later_at)),
      jsonb_build_object('roomId', r.id), false);
    UPDATE rooms SET return_later_escalated_at = now() WHERE id = r.id;
    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public.process_room_service_timers() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'process-room-service-timers';
  PERFORM cron.schedule('process-room-service-timers', '* * * * *', 'SELECT public.process_room_service_timers()');
END $$;

-- ---------------------------------------------------------------------------
-- 6. Settings: re-check interval and welfare cut-off (Settings › Hotel)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_hotel_service_rules(p_recheck_minutes integer, p_cutoff time)
RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.auth_has_permission('settings.manage') THEN
    RAISE EXCEPTION 'Only a manager can change these settings.' USING ERRCODE = '42501';
  END IF;
  IF p_recheck_minutes IS NULL OR p_recheck_minutes NOT BETWEEN 15 AND 240 THEN
    RAISE EXCEPTION 'Checks are between 15 minutes and 4 hours apart.' USING ERRCODE = '22023';
  END IF;
  IF p_cutoff IS NULL THEN
    RAISE EXCEPTION 'Choose a welfare-check time.' USING ERRCODE = '22023';
  END IF;
  UPDATE hotels SET dnd_recheck_minutes = p_recheck_minutes, dnd_cutoff_time = p_cutoff, updated_at = now()
   WHERE id = public.auth_hotel_id();
END;
$$;

REVOKE ALL ON FUNCTION public.update_hotel_service_rules(integer, time) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_hotel_service_rules(integer, time) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. History: what each change reads as; bookkeeping is not recorded
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._audit_strip(p_table text, j jsonb)
RETURNS jsonb
    LANGUAGE sql IMMUTABLE
    SET search_path TO 'public'
    AS $$
  SELECT CASE
    WHEN j IS NULL THEN NULL
    ELSE j - 'updated_at' - 'created_at'
           - CASE WHEN p_table = 'user_push_tokens' THEN 'expo_push_token' ELSE '' END
           - CASE WHEN p_table = 'rooms' THEN ARRAY[
               'dnd_next_check_at', 'dnd_reminded_at', 'dnd_escalated_at',
               'return_later_reminded_at', 'return_later_escalated_at',
               'cleaning_overdue_notified_at', 'cleaning_started_at', 'cleaning_elapsed_seconds']
             ELSE ARRAY[]::text[] END
  END;
$$;

CREATE OR REPLACE FUNCTION public._audit_label(p_table text, p_op text, o jsonb, n jsonb)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  name  text;   -- the audited row's own display name, from the payload
  who   text;
  extra text;
BEGIN
  ---------------------------------------------------------------- rooms ------
  -- Room History is already room-scoped, so wording stays room-relative and
  -- does not repeat the room number on every line.
  IF p_table = 'rooms' THEN
    IF p_op = 'INSERT' THEN RETURN 'Added the room'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Removed the room'; END IF;
    -- Service exceptions first: they change the status alongside.
    IF n->>'dnd_at' IS NOT NULL AND o->>'dnd_at' IS NULL THEN
      RETURN 'Do Not Disturb sign on the door';
    ELSIF n->>'dnd_at' IS NOT NULL AND (n->>'dnd_check_count') IS DISTINCT FROM (o->>'dnd_check_count') THEN
      RETURN 'Checked the door: still Do Not Disturb (check ' || (n->>'dnd_check_count') || ')';
    ELSIF n->>'dnd_at' IS NULL AND o->>'dnd_at' IS NOT NULL THEN
      RETURN CASE WHEN n->>'house_keeping_status' = 'InProgress' THEN 'Do Not Disturb removed — started cleaning'
                  WHEN n->>'refuse_service_at' IS NOT NULL THEN 'Guest refused service: ' || coalesce(n->>'refuse_service_reason', 'no reason given')
                  WHEN n->>'return_later_at' IS NOT NULL THEN 'Guest asked for service later'
                  ELSE 'Do Not Disturb sign removed — ready to clean' END;
    ELSIF n->>'refuse_service_at' IS NOT NULL AND o->>'refuse_service_at' IS NULL THEN
      RETURN 'Guest refused service: ' || coalesce(n->>'refuse_service_reason', 'no reason given');
    ELSIF n->>'refuse_service_at' IS NULL AND o->>'refuse_service_at' IS NOT NULL THEN
      RETURN CASE WHEN auth.uid() IS NULL THEN 'Refused service ended with the service day'
                  WHEN n->>'house_keeping_status' = 'InProgress' THEN 'Service back on — started cleaning'
                  ELSE 'Guest now wants service — ready to clean' END;
    ELSIF n->>'return_later_at' IS NOT NULL AND n->>'return_later_at' IS DISTINCT FROM o->>'return_later_at' THEN
      RETURN 'Guest asked for service later' ||
             coalesce(' — ' || nullif(btrim(n->>'return_later_reason'), ''), '');
    ELSIF n->>'return_later_at' IS NULL AND o->>'return_later_at' IS NOT NULL AND auth.uid() IS NULL THEN
      RETURN 'Return later ended with the service day';
    ELSIF n->>'paused_at' IS NOT NULL AND o->>'paused_at' IS NULL THEN
      RETURN 'Paused cleaning';
    END IF;
    IF n->>'house_keeping_status' IS DISTINCT FROM o->>'house_keeping_status' THEN
      RETURN 'Marked the room as ' ||
             COALESCE(public._audit_pretty(n->>'house_keeping_status'), 'unknown');
    ELSIF n->>'flagged' IS DISTINCT FROM o->>'flagged' THEN
      RETURN CASE WHEN (n->>'flagged')::boolean THEN 'Flagged the room' ELSE 'Removed the flag' END;
    ELSIF n->>'priority' IS DISTINCT FROM o->>'priority' THEN
      RETURN CASE WHEN n->>'priority' = 'high' THEN 'Marked the room as priority'
                  ELSE 'Removed the priority' END;
    ELSIF n->>'return_later_at' IS DISTINCT FROM o->>'return_later_at' THEN
      RETURN CASE WHEN n->>'return_later_at' IS NULL THEN 'Cleared return later'
                  ELSE 'Set the room to return later' END;
    END IF;
    RETURN 'Updated the room';

  -------------------------------------------------------------- tickets ------
  ELSIF p_table = 'tickets' THEN
    name := NULLIF(btrim(COALESCE(n->>'title', o->>'title', '')), '');
    extra := CASE WHEN name IS NOT NULL THEN ' "' || name || '"' ELSE '' END;

    IF p_op = 'INSERT' THEN
      RETURN 'Raised a ticket' || COALESCE(': ' || name, '');
    ELSIF p_op = 'DELETE' THEN
      RETURN 'Deleted the ticket' || extra;
    END IF;

    IF n->>'status' IS DISTINCT FROM o->>'status' THEN
      RETURN 'Marked ticket' || extra || ' as ' ||
             COALESCE(public._audit_pretty(n->>'status'), 'unknown');
    ELSIF n->>'assigned_to_id' IS DISTINCT FROM o->>'assigned_to_id' THEN
      RETURN CASE
        WHEN n->>'assigned_to_id' IS NULL THEN 'Unassigned ticket' || extra
        ELSE 'Assigned ticket' || extra || ' to ' ||
             public._audit_user_name((n->>'assigned_to_id')::uuid)
      END;
    ELSIF n->>'due_at' IS DISTINCT FROM o->>'due_at' THEN
      RETURN 'Changed the due time on ticket' || extra;
    ELSIF n->>'priority' IS DISTINCT FROM o->>'priority' THEN
      RETURN 'Set ticket' || extra || ' priority to ' ||
             COALESCE(public._audit_pretty(n->>'priority'), 'normal');
    END IF;
    RETURN 'Updated ticket' || extra;

  ----------------------------------------------------------- room_notes ------
  ELSIF p_table = 'room_notes' THEN
    IF p_op = 'INSERT' THEN
      name := public._hestia_snippet(n->>'text', 80);
      RETURN CASE WHEN NULLIF(btrim(COALESCE(name, '')), '') IS NOT NULL
                  THEN 'Added a note: “' || name || '”' ELSE 'Added a note' END;
    ELSIF p_op = 'DELETE' THEN RETURN 'Deleted a note';
    END IF;
    RETURN 'Edited a note';

  ---------------------------------------------------- room_assignments ------
  ELSIF p_table = 'room_assignments' THEN
    IF p_op = 'INSERT' THEN
      RETURN 'Assigned the room to ' || public._audit_user_name((n->>'user_id')::uuid);
    ELSIF p_op = 'DELETE' THEN
      RETURN 'Unassigned ' || public._audit_user_name((o->>'user_id')::uuid) || ' from the room';
    END IF;
    IF n->>'user_id' IS DISTINCT FROM o->>'user_id' THEN
      RETURN 'Reassigned the room to ' || public._audit_user_name((n->>'user_id')::uuid);
    ELSIF n->>'work_status' IS DISTINCT FROM o->>'work_status' THEN
      RETURN 'Marked the room as ' ||
             COALESCE(public._audit_pretty(n->>'work_status'), 'updated');
    ELSIF n->>'refuse_reason' IS DISTINCT FROM o->>'refuse_reason'
          AND n->>'refuse_reason' IS NOT NULL THEN
      RETURN 'Recorded a refused service: ' || (n->>'refuse_reason');
    ELSIF n->>'pause_reason' IS DISTINCT FROM o->>'pause_reason'
          AND n->>'pause_reason' IS NOT NULL THEN
      RETURN 'Paused cleaning: ' || (n->>'pause_reason');
    END IF;
    RETURN 'Updated the room assignment';

  --------------------------------------------------------------- guests ------
  ELSIF p_table = 'guests' THEN
    name := COALESCE(NULLIF(btrim(COALESCE(n->>'full_name', o->>'full_name', '')), ''), 'a guest');
    IF p_op = 'INSERT' THEN RETURN 'Added guest ' || name; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Removed guest ' || name; END IF;
    IF n->>'image_url' IS DISTINCT FROM o->>'image_url' THEN
      RETURN 'Updated the photo for ' || name;
    ELSIF n->>'vip_code' IS DISTINCT FROM o->>'vip_code' THEN
      RETURN 'Changed the VIP status for ' || name;
    ELSIF n->>'primary_email' IS DISTINCT FROM o->>'primary_email'
       OR n->>'address' IS DISTINCT FROM o->>'address'
       OR n->>'company' IS DISTINCT FROM o->>'company' THEN
      RETURN 'Updated contact details for ' || name;
    ELSIF n->>'full_name' IS DISTINCT FROM o->>'full_name' THEN
      RETURN 'Renamed guest ' || COALESCE(o->>'full_name', 'a guest') || ' to ' || name;
    END IF;
    RETURN 'Updated guest ' || name;

  --------------------------------------------------------- reservations ------
  ELSIF p_table = 'reservations' THEN
    IF p_op = 'INSERT' THEN RETURN 'Created a reservation'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Removed a reservation'; END IF;
    IF n->>'front_office_status' IS DISTINCT FROM o->>'front_office_status' THEN
      RETURN 'Set the front office status to ' ||
             COALESCE(public._audit_pretty(n->>'front_office_status'), 'unknown');
    ELSIF n->>'reservation_status' IS DISTINCT FROM o->>'reservation_status' THEN
      RETURN 'Set the reservation status to ' ||
             COALESCE(public._audit_pretty(n->>'reservation_status'), 'unknown');
    ELSIF n->>'room_id' IS DISTINCT FROM o->>'room_id' THEN
      RETURN 'Moved the reservation to ' ||
             COALESCE(public._audit_room_label((n->>'room_id')::uuid), 'another room');
    ELSIF n->>'arrival_date' IS DISTINCT FROM o->>'arrival_date'
       OR n->>'departure_date' IS DISTINCT FROM o->>'departure_date' THEN
      RETURN 'Changed the reservation dates';
    ELSIF n->>'eta' IS DISTINCT FROM o->>'eta' THEN
      RETURN 'Updated the guest arrival time';
    ELSIF n->>'promised_time' IS DISTINCT FROM o->>'promised_time' THEN
      RETURN 'Updated the promised time';
    ELSIF n->>'adults' IS DISTINCT FROM o->>'adults'
       OR n->>'kids' IS DISTINCT FROM o->>'kids' THEN
      RETURN 'Changed the number of guests';
    END IF;
    RETURN 'Updated the reservation';

  --------------------------------------------------- reservation_guests ------
  ELSIF p_table = 'reservation_guests' THEN
    name := public._audit_guest_name(COALESCE(n->>'guest_id', o->>'guest_id')::uuid);
    IF p_op = 'INSERT' THEN RETURN 'Added ' || name || ' to the reservation'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Removed ' || name || ' from the reservation'; END IF;
    RETURN 'Updated ' || name || ' on the reservation';

  ------------------------------------------------- lost_and_found_items ------
  ELSIF p_table = 'lost_and_found_items' THEN
    name := COALESCE(NULLIF(btrim(COALESCE(n->>'item_name', o->>'item_name', '')), ''), 'an item');
    IF p_op = 'INSERT' THEN RETURN 'Registered a found item: ' || name; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Deleted the lost & found entry for ' || name; END IF;
    IF n->>'status' IS DISTINCT FROM o->>'status' THEN
      RETURN 'Marked ' || name || ' as ' ||
             COALESCE(public._audit_pretty(n->>'status'), 'updated');
    ELSIF n->>'shipped_location' IS DISTINCT FROM o->>'shipped_location'
          AND n->>'shipped_location' IS NOT NULL THEN
      RETURN 'Shipped ' || name || ' to ' || (n->>'shipped_location');
    ELSIF n->>'storage_location' IS DISTINCT FROM o->>'storage_location' THEN
      RETURN 'Moved ' || name || ' to ' ||
             COALESCE(n->>'storage_location', 'a new location');
    END IF;
    RETURN 'Updated the lost & found entry for ' || name;

  --------------------------------------------------------- consumptions ------
  ELSIF p_table = 'consumptions' THEN
    name := public._audit_consumable_name(COALESCE(n->>'consumable_id', o->>'consumable_id')::uuid);
    IF p_op = 'INSERT' THEN
      RETURN 'Charged ' || COALESCE(n->>'quantity', '1') || ' x ' || name || ' to the room';
    ELSIF p_op = 'DELETE' THEN
      RETURN 'Removed the charge for ' || name;
    END IF;
    IF n->>'status' IS DISTINCT FROM o->>'status' THEN
      RETURN 'Marked the ' || name || ' charge as ' ||
             COALESCE(public._audit_pretty(n->>'status'), 'updated');
    ELSIF n->>'quantity' IS DISTINCT FROM o->>'quantity' THEN
      RETURN 'Changed the ' || name || ' quantity to ' || COALESCE(n->>'quantity', '0');
    END IF;
    RETURN 'Updated the charge for ' || name;

  ---------------------------------------------------------- consumables ------
  ELSIF p_table = 'consumables' THEN
    name := COALESCE(NULLIF(btrim(COALESCE(n->>'name', o->>'name', '')), ''), 'an item');
    IF p_op = 'INSERT' THEN RETURN 'Added ' || name || ' to the minibar list'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Removed ' || name || ' from the minibar list'; END IF;
    IF n->>'unit_price' IS DISTINCT FROM o->>'unit_price' THEN
      RETURN 'Changed the price of ' || name;
    ELSIF n->>'billable' IS DISTINCT FROM o->>'billable' THEN
      RETURN CASE WHEN (n->>'billable')::boolean
                  THEN 'Made ' || name || ' billable'
                  ELSE 'Made ' || name || ' non-billable' END;
    END IF;
    RETURN 'Updated ' || name;

  --------------------------------------------------------------- shifts ------
  ELSIF p_table = 'shifts' THEN
    name := COALESCE(NULLIF(btrim(COALESCE(n->>'name', o->>'name', '')), ''), 'a');
    IF p_op = 'INSERT' THEN RETURN 'Created the ' || name || ' shift'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Deleted the ' || name || ' shift'; END IF;
    IF n->>'start_time' IS DISTINCT FROM o->>'start_time'
       OR n->>'end_time' IS DISTINCT FROM o->>'end_time' THEN
      RETURN 'Changed the hours for the ' || name || ' shift';
    END IF;
    RETURN 'Updated the ' || name || ' shift';

  ---------------------------------------------------------- ticket_tags ------
  ELSIF p_table = 'ticket_tags' THEN
    who := public._audit_user_name(COALESCE(n->>'tagged_user_id', o->>'tagged_user_id')::uuid);
    IF p_op = 'INSERT' THEN RETURN 'Tagged ' || who || ' on a ticket'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Removed ' || who || ' from a ticket'; END IF;
    RETURN 'Updated a ticket tag for ' || who;

  ---------------------------------------------------------------- users ------
  ELSIF p_table = 'users' THEN
    name := COALESCE(NULLIF(btrim(COALESCE(n->>'full_name', o->>'full_name', '')), ''), 'a team member');
    IF p_op = 'INSERT' THEN RETURN 'Added ' || name || ' to the team'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Removed ' || name || ' from the team'; END IF;
    IF n->>'job_title_id' IS DISTINCT FROM o->>'job_title_id' THEN
      RETURN 'Changed the job title for ' || name || ' to ' ||
             COALESCE(public._audit_job_title_name((n->>'job_title_id')::uuid), 'none');
    ELSIF n->>'department_id' IS DISTINCT FROM o->>'department_id' THEN
      RETURN 'Moved ' || name || ' to ' ||
             COALESCE(public._audit_department_name((n->>'department_id')::uuid), 'another department');
    ELSIF n->>'hotel_id' IS DISTINCT FROM o->>'hotel_id' THEN
      RETURN 'Moved ' || name || ' to another hotel';
    ELSIF n->>'avatar_url' IS DISTINCT FROM o->>'avatar_url' THEN
      RETURN 'Updated the photo for ' || name;
    ELSIF n->>'full_name' IS DISTINCT FROM o->>'full_name' THEN
      RETURN 'Renamed ' || COALESCE(o->>'full_name', 'a team member') || ' to ' || name;
    END IF;
    RETURN 'Updated the profile for ' || name;
  END IF;

  ------------------------------------------------------------- fallback ------
  -- Reached only if a table is audited without wording added above. Kept
  -- readable rather than clever; add a branch instead of relying on this.
  RETURN CASE p_op
    WHEN 'INSERT' THEN 'Created a record in '
    WHEN 'DELETE' THEN 'Deleted a record in '
    ELSE 'Updated a record in '
  END || replace(p_table, '_', ' ');
END;
$function$;
