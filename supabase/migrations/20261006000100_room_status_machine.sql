-- Room status as a state machine: who may do what, from which state.
--
-- Until now any signed-in user at the hotel could write any status column on
-- any room; the only rule was "In Progress needs some assignment row". This
-- migration makes `room_action()` the one way a room's housekeeping status or
-- service state changes, and keeps the rules in a table so they can change
-- without an app release.
--
--   Attendant (the room's assignee): start, undo start (2 min), pause, resume,
--     clean, DND / re-check / sign removed, refuse service / service back on,
--     return later / change / clear. One room in progress at a time.
--   Inspector (rooms.inspect): inspect, send back / reopen (reason required),
--     and clearing DND, refusals and return-laters.
--   Override (rooms.status.override): an attendant action on the assignee's
--     behalf — reason required, recorded, the attendant told. Same steps; it
--     changes who acts, never the order.
--
-- Priority, flag and promise time are attributes, not states, and keep their
-- existing paths (rush/flag permissions; promise time for anyone who can see
-- the room). Front Office additionally gets rooms.rush.toggle.

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
INSERT INTO public.permissions (name, description) VALUES
  ('rooms.inspect', 'Inspect cleaned rooms and send rooms back'),
  ('rooms.status.override', 'Act on a room for its attendant (reason required)')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.roles r
  JOIN public.permissions p ON p.name IN ('rooms.inspect', 'rooms.status.override')
 WHERE r.key = 'full_access'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.roles r
  JOIN public.permissions p ON p.name = 'rooms.rush.toggle'
 WHERE r.key = 'fo_agent'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Per-hotel settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotel_housekeeping_settings (
  hotel_id uuid PRIMARY KEY REFERENCES public.hotels(id) ON DELETE CASCADE,
  -- Off: the old free-for-all writes are accepted (a rollback switch).
  status_rules_enforced boolean NOT NULL DEFAULT true,
  -- How long an attendant may undo a start, in seconds.
  undo_start_seconds integer NOT NULL DEFAULT 120 CHECK (undo_start_seconds BETWEEN 0 AND 900),
  -- At a shift's end, unfinished rooms not being cleaned go back to the pool.
  shift_end_policy text NOT NULL DEFAULT 'carry_over' CHECK (shift_end_policy IN ('carry_over', 'keep')),
  -- At the start of the service day, rooms a guest slept in go back to Dirty.
  overnight_reset boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.hotel_housekeeping_settings (hotel_id)
SELECT id FROM public.hotels
ON CONFLICT (hotel_id) DO NOTHING;

ALTER TABLE public.hotel_housekeeping_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Hotel users read housekeeping settings" ON public.hotel_housekeeping_settings;
CREATE POLICY "Hotel users read housekeeping settings" ON public.hotel_housekeeping_settings
  FOR SELECT TO authenticated USING (hotel_id = (SELECT public.auth_hotel_id()));
DROP POLICY IF EXISTS "Managers edit housekeeping settings" ON public.hotel_housekeeping_settings;
CREATE POLICY "Managers edit housekeeping settings" ON public.hotel_housekeeping_settings
  FOR UPDATE TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()) AND (SELECT public.auth_has_permission('staff.manage')))
  WITH CHECK (hotel_id = (SELECT public.auth_hotel_id()));

-- A new hotel gets its row.
CREATE OR REPLACE FUNCTION public._hotels_default_housekeeping_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.hotel_housekeeping_settings (hotel_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS hotels_default_housekeeping_settings ON public.hotels;
CREATE TRIGGER hotels_default_housekeeping_settings
  AFTER INSERT ON public.hotels FOR EACH ROW EXECUTE FUNCTION public._hotels_default_housekeeping_settings();

-- ---------------------------------------------------------------------------
-- The rules
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_status_rules (
  action text NOT NULL,
  from_state text NOT NULL CHECK (from_state IN
    ('dirty', 'in_progress', 'paused', 'cleaned', 'inspected', 'dnd', 'refused', 'return_later')),
  actor text NOT NULL CHECK (actor IN ('assignee', 'inspector')),
  PRIMARY KEY (action, from_state, actor)
);
ALTER TABLE public.room_status_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone signed in reads the rules" ON public.room_status_rules;
CREATE POLICY "Anyone signed in reads the rules" ON public.room_status_rules
  FOR SELECT TO authenticated USING (true);

DELETE FROM public.room_status_rules;
INSERT INTO public.room_status_rules (action, from_state, actor) VALUES
  -- The attendant, on their own room.
  ('start', 'dirty', 'assignee'),
  ('start', 'return_later', 'assignee'),
  ('undo_start', 'in_progress', 'assignee'),
  ('pause', 'in_progress', 'assignee'),
  ('resume', 'paused', 'assignee'),
  ('clean', 'in_progress', 'assignee'),
  ('dnd', 'dirty', 'assignee'),
  ('dnd', 'return_later', 'assignee'),
  ('dnd_recheck', 'dnd', 'assignee'),
  ('dnd_clear', 'dnd', 'assignee'),
  ('refuse', 'dirty', 'assignee'),
  ('refuse', 'in_progress', 'assignee'),
  ('refuse_clear', 'refused', 'assignee'),
  ('return_later', 'dirty', 'assignee'),
  ('return_later', 'in_progress', 'assignee'),
  ('return_later', 'paused', 'assignee'),
  ('return_later', 'return_later', 'assignee'),
  ('return_later_clear', 'return_later', 'assignee'),
  -- Supervisors and leadership.
  ('inspect', 'cleaned', 'inspector'),
  ('send_back', 'cleaned', 'inspector'),
  ('send_back', 'inspected', 'inspector'),
  ('dnd_clear', 'dnd', 'inspector'),
  ('refuse_clear', 'refused', 'inspector'),
  ('return_later_clear', 'return_later', 'inspector');

-- ---------------------------------------------------------------------------
-- State, snapshot, bookkeeping columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS in_progress_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS started_notified_at timestamptz;

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS last_end_processed_on date;
-- Start counting from tomorrow: deploying must not sweep today's rooms.
UPDATE public.shifts s SET last_end_processed_on = public._hotel_local_now(s.hotel_id)::date
 WHERE s.last_end_processed_on IS NULL AND s.hotel_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public._room_state(
  p_status text, p_paused_at timestamptz, p_refuse_at timestamptz, p_refuse_reason text, p_return_at timestamptz
) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_status = 'Inspected' THEN 'inspected'
    WHEN p_status = 'Cleaned' THEN 'cleaned'
    WHEN p_refuse_at IS NOT NULL AND p_refuse_reason ILIKE '%do not disturb%' THEN 'dnd'
    WHEN p_refuse_at IS NOT NULL THEN 'refused'
    WHEN p_return_at IS NOT NULL THEN 'return_later'
    WHEN p_status = 'InProgress' AND p_paused_at IS NOT NULL THEN 'paused'
    WHEN p_status = 'InProgress' THEN 'in_progress'
    ELSE 'dirty'
  END;
$$;

CREATE OR REPLACE FUNCTION public._room_snapshot(p_room_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'id', r.id,
    'state', public._room_state(r.house_keeping_status, r.paused_at, r.refuse_service_at, r.refuse_service_reason, r.return_later_at),
    'house_keeping_status', r.house_keeping_status,
    'paused_at', r.paused_at,
    'refuse_service_at', r.refuse_service_at,
    'refuse_service_reason', r.refuse_service_reason,
    'return_later_at', r.return_later_at,
    'return_later_reason', r.return_later_reason,
    'dnd_at', r.dnd_at,
    'dnd_checked_at', r.dnd_checked_at,
    'dnd_check_count', r.dnd_check_count,
    'dnd_next_check_at', r.dnd_next_check_at,
    'promise_time_at', r.promise_time_at,
    'cleaning_started_at', r.cleaning_started_at,
    'cleaning_elapsed_seconds', r.cleaning_elapsed_seconds,
    'in_progress_started_at', r.in_progress_started_at
  )
  FROM public.rooms r WHERE r.id = p_room_id;
$$;

-- Duplicate taps on a flaky connection: one request id, one effect.
CREATE TABLE IF NOT EXISTS public.room_action_requests (
  request_id uuid PRIMARY KEY,
  room_id uuid NOT NULL,
  user_id uuid,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.room_action_requests ENABLE ROW LEVEL SECURITY; -- no policies: function-only

-- ---------------------------------------------------------------------------
-- Only room_action() writes status and service-state columns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._rooms_require_room_action()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  -- System jobs (cron, service role) and the function itself pass.
  IF auth.uid() IS NULL OR coalesce(current_setting('hestia.room_action', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF (NEW.house_keeping_status, NEW.paused_at, NEW.refuse_service_at, NEW.refuse_service_reason,
      NEW.return_later_at, NEW.return_later_reason, NEW.dnd_at, NEW.dnd_checked_at,
      NEW.cleaning_started_at, NEW.cleaning_elapsed_seconds, NEW.in_progress_started_at)
     IS DISTINCT FROM
     (OLD.house_keeping_status, OLD.paused_at, OLD.refuse_service_at, OLD.refuse_service_reason,
      OLD.return_later_at, OLD.return_later_reason, OLD.dnd_at, OLD.dnd_checked_at,
      OLD.cleaning_started_at, OLD.cleaning_elapsed_seconds, OLD.in_progress_started_at)
  THEN
    IF coalesce((SELECT status_rules_enforced FROM public.hotel_housekeeping_settings WHERE hotel_id = NEW.hotel_id), true) THEN
      RAISE EXCEPTION 'Room status changes go through room_action().' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
-- "rooms_00" sorts before "rooms_0_service_exceptions", so it checks first.
DROP TRIGGER IF EXISTS rooms_00_require_room_action ON public.rooms;
CREATE TRIGGER rooms_00_require_room_action
  BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public._rooms_require_room_action();

-- ---------------------------------------------------------------------------
-- room_action()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._room_action_label(p text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p
    WHEN 'start' THEN 'Start cleaning' WHEN 'undo_start' THEN 'Undo start' WHEN 'pause' THEN 'Pause'
    WHEN 'resume' THEN 'Resume' WHEN 'clean' THEN 'Cleaned' WHEN 'dnd' THEN 'Do Not Disturb'
    WHEN 'dnd_recheck' THEN 'Still DND' WHEN 'dnd_clear' THEN 'Sign removed' WHEN 'refuse' THEN 'Refuse Service'
    WHEN 'refuse_clear' THEN 'Service back on' WHEN 'return_later' THEN 'Return Later'
    WHEN 'return_later_clear' THEN 'Clear return later' WHEN 'inspect' THEN 'Inspected' WHEN 'send_back' THEN 'Send back'
    WHEN 'dirty' THEN 'Dirty' WHEN 'in_progress' THEN 'in progress' WHEN 'paused' THEN 'paused'
    WHEN 'cleaned' THEN 'cleaned' WHEN 'inspected' THEN 'inspected' WHEN 'dnd' THEN 'Do Not Disturb'
    WHEN 'refused' THEN 'refusing service' WHEN 'return_later' THEN 'waiting to return'
    ELSE p END;
$$;

CREATE OR REPLACE FUNCTION public.room_action(
  p_room_id uuid,
  p_action text,
  p_reason text DEFAULT NULL,
  p_until timestamptz DEFAULT NULL,
  p_request_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_uid uuid := auth.uid();
  r public.rooms%ROWTYPE;
  v_state text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_mine public.room_assignments%ROWTYPE;
  v_ra public.room_assignments%ROWTYPE;
  v_has_assignee_rule boolean;
  v_has_inspector_rule boolean;
  v_actor text;
  v_override boolean := false;
  v_undo integer;
  v_me text;
  v_them text;
  v_other text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;

  -- Idempotency: a repeated request id changes nothing and returns the room.
  IF p_request_id IS NOT NULL THEN
    INSERT INTO public.room_action_requests (request_id, room_id, user_id, action)
    VALUES (p_request_id, p_room_id, v_uid, p_action)
    ON CONFLICT (request_id) DO NOTHING;
    IF NOT FOUND THEN
      RETURN public._room_snapshot(p_room_id);
    END IF;
  END IF;

  -- Lock the room: two people acting at once resolve one after the other,
  -- and the second is judged against the state the first left.
  SELECT * INTO r FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND OR r.hotel_id IS DISTINCT FROM public.auth_hotel_id() THEN
    RAISE EXCEPTION 'Room not found.' USING ERRCODE = 'P0002';
  END IF;
  v_state := public._room_state(r.house_keeping_status, r.paused_at, r.refuse_service_at, r.refuse_service_reason, r.return_later_at);

  SELECT bool_or(actor = 'assignee'), bool_or(actor = 'inspector')
    INTO v_has_assignee_rule, v_has_inspector_rule
    FROM public.room_status_rules WHERE action = p_action AND from_state = v_state;

  IF NOT coalesce(v_has_assignee_rule, false) AND NOT coalesce(v_has_inspector_rule, false) THEN
    IF NOT EXISTS (SELECT 1 FROM public.room_status_rules WHERE action = p_action) THEN
      RAISE EXCEPTION 'Unknown room action "%".', p_action USING ERRCODE = '22023';
    END IF;
    RAISE EXCEPTION '% is not available while Room % is %. Refresh to see its current state.',
      public._room_action_label(p_action), r.room_number, public._room_action_label(v_state)
      USING ERRCODE = '40001';
  END IF;

  SELECT * INTO v_mine FROM public.room_assignments
   WHERE room_id = r.id AND user_id = v_uid
   ORDER BY updated_at DESC NULLS LAST LIMIT 1;

  -- Who is acting, and as what.
  IF coalesce(v_has_assignee_rule, false) AND v_mine.id IS NOT NULL
     AND public.auth_has_permission('rooms.status.update') THEN
    v_actor := 'assignee';
    v_ra := v_mine;
  ELSIF coalesce(v_has_inspector_rule, false) AND public.auth_has_permission('rooms.inspect') THEN
    v_actor := 'inspector';
    v_ra := public._current_room_assignment(r.id);
  ELSIF coalesce(v_has_assignee_rule, false) AND public.auth_has_permission('rooms.status.override') THEN
    v_ra := public._current_room_assignment(r.id);
    IF v_ra.id IS NULL THEN
      RAISE EXCEPTION 'Room % has no attendant. Assign one first.', r.room_number USING ERRCODE = '22023';
    END IF;
    IF v_reason IS NULL THEN
      RAISE EXCEPTION 'A reason is needed to act for the attendant.' USING ERRCODE = '22023';
    END IF;
    v_actor := 'assignee';
    v_override := true;
  ELSIF coalesce(v_has_assignee_rule, false) THEN
    RAISE EXCEPTION 'Only the attendant assigned to Room % can do that.', r.room_number USING ERRCODE = '42501';
  ELSE
    RAISE EXCEPTION 'Only a supervisor can do that.' USING ERRCODE = '42501';
  END IF;

  -- Action-specific checks.
  IF p_action = 'send_back' AND v_reason IS NULL THEN
    RAISE EXCEPTION 'Say why the room is going back.' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'refuse' AND v_reason IS NULL THEN
    RAISE EXCEPTION 'Choose why the guest refused service.' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'return_later' AND (p_until IS NULL OR p_until < now() - interval '2 minutes') THEN
    RAISE EXCEPTION 'Choose a return time later than now.' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'undo_start' THEN
    SELECT undo_start_seconds INTO v_undo FROM public.hotel_housekeeping_settings WHERE hotel_id = r.hotel_id;
    IF r.in_progress_started_at IS NULL
       OR now() > r.in_progress_started_at + make_interval(secs => coalesce(v_undo, 120)) THEN
      RAISE EXCEPTION 'Too late to undo. Pause the room instead.' USING ERRCODE = '22023';
    END IF;
  END IF;
  -- One room in progress at a time, per attendant.
  IF p_action IN ('start', 'resume') THEN
    SELECT ro.room_number INTO v_other
      FROM public.rooms ro
      JOIN public.room_assignments ra ON ra.room_id = ro.id AND ra.user_id = v_ra.user_id
     WHERE ro.id <> r.id AND ro.house_keeping_status = 'InProgress' AND ro.paused_at IS NULL
       AND ro.refuse_service_at IS NULL AND ro.return_later_at IS NULL
     LIMIT 1;
    IF v_other IS NOT NULL THEN
      RAISE EXCEPTION 'Room % is still in progress. Pause or finish it first.', v_other USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Apply. The rooms triggers derive the rest (clock, DND bookkeeping,
  -- clearing the other service states, notifications).
  PERFORM set_config('hestia.room_action', 'on', true);

  CASE p_action
    WHEN 'start' THEN
      UPDATE public.rooms SET house_keeping_status = 'InProgress', paused_at = NULL,
             in_progress_started_at = now(), started_notified_at = NULL
       WHERE id = r.id;
    WHEN 'undo_start' THEN
      UPDATE public.rooms SET house_keeping_status = 'Dirty', paused_at = NULL WHERE id = r.id;
      -- A separate write, after the clock trigger has banked: a mistap leaves no time behind.
      UPDATE public.rooms SET cleaning_elapsed_seconds = 0, cleaning_started_at = NULL,
             in_progress_started_at = NULL, started_notified_at = NULL
       WHERE id = r.id;
    WHEN 'pause' THEN
      UPDATE public.rooms SET paused_at = now() WHERE id = r.id;
    WHEN 'resume' THEN
      UPDATE public.rooms SET paused_at = NULL WHERE id = r.id;
    WHEN 'clean' THEN
      UPDATE public.rooms SET house_keeping_status = 'Cleaned', paused_at = NULL WHERE id = r.id;
    WHEN 'dnd' THEN
      UPDATE public.rooms SET refuse_service_at = now(), refuse_service_reason = 'Guest Has a Do Not Disturb Sign'
       WHERE id = r.id;
    WHEN 'dnd_recheck' THEN
      UPDATE public.rooms SET dnd_checked_at = now() WHERE id = r.id;
    WHEN 'dnd_clear', 'refuse_clear' THEN
      UPDATE public.rooms SET refuse_service_at = NULL, refuse_service_reason = NULL WHERE id = r.id;
    WHEN 'refuse' THEN
      UPDATE public.rooms SET refuse_service_at = now(), refuse_service_reason = v_reason WHERE id = r.id;
    WHEN 'return_later' THEN
      UPDATE public.rooms SET return_later_at = p_until, return_later_reason = v_reason WHERE id = r.id;
    WHEN 'return_later_clear' THEN
      UPDATE public.rooms SET return_later_at = NULL, return_later_reason = NULL WHERE id = r.id;
    WHEN 'inspect' THEN
      UPDATE public.rooms SET house_keeping_status = 'Inspected' WHERE id = r.id;
    WHEN 'send_back' THEN
      UPDATE public.rooms SET house_keeping_status = 'Dirty', paused_at = NULL WHERE id = r.id;
      UPDATE public.rooms SET cleaning_elapsed_seconds = 0, cleaning_started_at = NULL,
             in_progress_started_at = NULL, started_notified_at = NULL
       WHERE id = r.id;
  END CASE;

  -- The assignment's progress follows the room — this assignment only.
  IF v_ra.id IS NOT NULL THEN
    UPDATE public.room_assignments SET
      work_status = CASE p_action
        WHEN 'start' THEN 'in_progress' WHEN 'resume' THEN 'in_progress'
        WHEN 'pause' THEN 'paused' WHEN 'clean' THEN 'completed'
        WHEN 'inspect' THEN work_status
        ELSE NULL END,
      start_time = CASE
        WHEN p_action = 'start' THEN coalesce(start_time, now())
        WHEN p_action IN ('undo_start', 'send_back') THEN NULL
        ELSE start_time END,
      end_time = CASE
        WHEN p_action = 'clean' THEN now()
        WHEN p_action IN ('start', 'undo_start', 'send_back') THEN NULL
        ELSE end_time END
     WHERE id = v_ra.id;
  END IF;

  -- History for what needs a reason or changes hands.
  IF v_override OR p_action IN ('send_back', 'undo_start') THEN
    SELECT full_name INTO v_me FROM public.users WHERE id = v_uid;
    SELECT full_name INTO v_them FROM public.users WHERE id = v_ra.user_id;
    INSERT INTO public.room_history (room_id, hotel_id, user_id, event_type, description)
    VALUES (r.id, r.hotel_id, v_uid, 'housekeeping_status',
      CASE
        WHEN p_action = 'send_back' AND v_state = 'inspected' THEN format('Reopened the room: %s', v_reason)
        WHEN p_action = 'send_back' THEN format('Sent the room back to Dirty: %s', v_reason)
        WHEN p_action = 'undo_start' THEN 'Undid starting the room'
        ELSE format('%s for %s: %s', public._room_action_label(p_action), coalesce(v_them, 'the attendant'), v_reason)
      END);
    IF v_override AND v_ra.user_id IS NOT NULL AND v_ra.user_id <> v_uid THEN
      PERFORM public._notify_user(v_ra.user_id, r.hotel_id, 'room_status_override', 'Changed for you',
        format('%s set Room %s to %s for you: %s.', coalesce(v_me, 'A supervisor'), r.room_number,
          public._room_action_label(p_action), v_reason),
        jsonb_build_object('roomId', r.id));
    END IF;
    IF p_action = 'send_back' AND v_ra.user_id IS NOT NULL THEN
      -- `rooms_notify` has just sent its "sent back" notice in this same
      -- transaction (same now()); give it the reason rather than a second one.
      UPDATE public.notifications
         SET body = format('Room %s was sent back — please clean it again. Reason: %s.', r.room_number, v_reason)
       WHERE user_id = v_ra.user_id AND type = 'room_rejected' AND created_at = now();
    END IF;
  END IF;

  RETURN public._room_snapshot(r.id);
END;
$$;

REVOKE ALL ON FUNCTION public.room_action(uuid, text, text, timestamptz, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.room_action(uuid, text, text, timestamptz, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Reassigning a room that is being cleaned: transfer, never block
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._room_assignments_transfer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  ro public.rooms%ROWTYPE;
  v_state text;
  v_mins integer;
  v_new text;
BEGIN
  IF NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN
    RETURN NEW;
  END IF;
  SELECT * INTO ro FROM public.rooms WHERE id = NEW.room_id FOR UPDATE;
  v_state := public._room_state(ro.house_keeping_status, ro.paused_at, ro.refuse_service_at, ro.refuse_service_reason, ro.return_later_at);

  IF v_state IN ('in_progress', 'paused') THEN
    -- Stop the clock on the old attendant's time; the new one resumes it.
    IF v_state = 'in_progress' THEN
      PERFORM set_config('hestia.room_action', 'on', true);
      UPDATE public.rooms SET paused_at = now() WHERE id = ro.id;
      SELECT * INTO ro FROM public.rooms WHERE id = NEW.room_id;
    END IF;
    v_mins := round(coalesce(ro.cleaning_elapsed_seconds, 0) / 60.0);
    NEW.work_status := 'paused';
    SELECT full_name INTO v_new FROM public.users WHERE id = NEW.user_id;
    INSERT INTO public.room_history (room_id, hotel_id, user_id, event_type, description)
    VALUES (ro.id, ro.hotel_id, auth.uid(), 'assignment',
      format('Handed over to %s after %s min of cleaning', coalesce(v_new, 'another attendant'), v_mins));
    IF OLD.user_id IS NOT NULL THEN
      PERFORM public._notify_user(OLD.user_id, ro.hotel_id, 'room_assignment', 'Room handed over',
        format('Room %s was given to %s. Your %s min on it are kept.', ro.room_number, coalesce(v_new, 'another attendant'), v_mins),
        jsonb_build_object('roomId', ro.id));
    END IF;
  ELSE
    -- A new person starts fresh: no inherited progress.
    NEW.work_status := CASE WHEN v_state IN ('cleaned', 'inspected') THEN OLD.work_status ELSE NULL END;
    IF v_state NOT IN ('cleaned', 'inspected') THEN
      NEW.start_time := NULL;
      NEW.end_time := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS room_assignments_transfer ON public.room_assignments;
CREATE TRIGGER room_assignments_transfer
  BEFORE UPDATE OF user_id ON public.room_assignments
  FOR EACH ROW EXECUTE FUNCTION public._room_assignments_transfer();

-- ---------------------------------------------------------------------------
-- "Started cleaning" waits out the undo window
-- ---------------------------------------------------------------------------
-- Drop the immediate notice from the activity trigger (added in
-- 20261005000500); the timer job sends it once the undo window has passed.
DO $$
DECLARE
  v_def text;
  v_from int;
  v_to int;
BEGIN
  SELECT pg_get_functiondef('public._rooms_notify_activity()'::regprocedure) INTO v_def;
  v_from := position('  -- Started cleaning' IN v_def);
  v_to := position('  -- Promise time — as before' IN v_def);
  IF v_from > 0 AND v_to > v_from THEN
    EXECUTE substr(v_def, 1, v_from - 1) || substr(v_def, v_to);
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public._process_room_started_notices()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  r record;
  v_n integer := 0;
BEGIN
  FOR r IN
    SELECT ro.id, ro.hotel_id, ro.room_number, ra.user_id, ra.assigned_by_id, u.full_name
      FROM public.rooms ro
      JOIN public.hotel_housekeeping_settings hs ON hs.hotel_id = ro.hotel_id
      LEFT JOIN LATERAL (
        SELECT * FROM public.room_assignments a WHERE a.room_id = ro.id
         ORDER BY a.updated_at DESC NULLS LAST LIMIT 1) ra ON true
      LEFT JOIN public.users u ON u.id = ra.user_id
     WHERE ro.house_keeping_status = 'InProgress'
       AND ro.in_progress_started_at IS NOT NULL
       AND ro.started_notified_at IS NULL
       AND ro.in_progress_started_at <= now() - make_interval(secs => hs.undo_start_seconds)
     FOR UPDATE OF ro SKIP LOCKED
  LOOP
    IF r.assigned_by_id IS NOT NULL AND r.assigned_by_id IS DISTINCT FROM r.user_id THEN
      PERFORM public._notify_user(r.assigned_by_id, r.hotel_id, 'room_started', 'Cleaning started',
        format('%s started cleaning Room %s.', coalesce(r.full_name, 'Someone'), r.room_number),
        jsonb_build_object('roomId', r.id));
      v_n := v_n + 1;
    END IF;
    UPDATE public.rooms SET started_notified_at = now() WHERE id = r.id;
  END LOOP;
  RETURN v_n;
END;
$$;

-- ---------------------------------------------------------------------------
-- Shift end and the new service day
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._process_housekeeping_rollover()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  s record;
  a record;
  v_local timestamp;
  v_n integer := 0;
BEGIN
  -- Shift end: unfinished rooms nobody is cleaning go back to the pool.
  FOR s IN
    SELECT sh.id, sh.name, sh.hotel_id, sh.end_time, sh.last_end_processed_on, hs.shift_end_policy
      FROM public.shifts sh
      JOIN public.hotel_housekeeping_settings hs ON hs.hotel_id = sh.hotel_id
     WHERE sh.end_time IS NOT NULL
  LOOP
    v_local := public._hotel_local_now(s.hotel_id);
    CONTINUE WHEN v_local::time < s.end_time
              OR (s.last_end_processed_on IS NOT NULL AND s.last_end_processed_on >= v_local::date);
    IF s.shift_end_policy = 'carry_over' THEN
      FOR a IN
        WITH freed AS (
          DELETE FROM public.room_assignments ra
           USING public.rooms ro
           WHERE ra.room_id = ro.id AND ra.shift_id = s.id
             AND ro.house_keeping_status NOT IN ('Cleaned', 'Inspected')
             AND ro.house_keeping_status IS DISTINCT FROM 'InProgress'
          RETURNING ra.assigned_by_id
        )
        SELECT assigned_by_id, count(*) AS n FROM freed WHERE assigned_by_id IS NOT NULL GROUP BY assigned_by_id
      LOOP
        PERFORM public._notify_user(a.assigned_by_id, s.hotel_id, 'room_assignment', 'Rooms back in the pool',
          format('%s unfinished %s room%s from the %s shift %s unassigned.', a.n, s.name,
            CASE WHEN a.n = 1 THEN '' ELSE 's' END, s.name, CASE WHEN a.n = 1 THEN 'is now' ELSE 'are now' END),
          '{}'::jsonb);
        v_n := v_n + a.n;
      END LOOP;
    END IF;
    UPDATE public.shifts SET last_end_processed_on = v_local::date WHERE id = s.id;
  END LOOP;
  RETURN v_n;
END;
$$;

-- The overnight reset rides on the existing new-service-day block of
-- process_room_service_timers(): rooms a guest slept in go back to Dirty.
CREATE OR REPLACE FUNCTION public._housekeeping_new_day(p_hotel_id uuid, p_today date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_n integer;
BEGIN
  IF NOT coalesce((SELECT overnight_reset FROM public.hotel_housekeeping_settings WHERE hotel_id = p_hotel_id), false) THEN
    RETURN 0;
  END IF;
  WITH slept AS (
    SELECT DISTINCT room_id FROM public.reservations
     WHERE hotel_id = p_hotel_id AND arrival_date < p_today AND departure_date >= p_today
  ), reset AS (
    UPDATE public.rooms ro SET house_keeping_status = 'Dirty', paused_at = NULL,
           cleaning_elapsed_seconds = 0, cleaning_started_at = NULL,
           in_progress_started_at = NULL, started_notified_at = NULL
      FROM slept
     WHERE ro.id = slept.room_id AND ro.hotel_id = p_hotel_id
       AND ro.house_keeping_status IN ('Cleaned', 'Inspected')
    RETURNING ro.id
  )
  SELECT count(*) INTO v_n FROM reset;
  UPDATE public.room_assignments SET work_status = NULL, start_time = NULL, end_time = NULL
   WHERE hotel_id = p_hotel_id
     AND room_id IN (SELECT id FROM public.rooms WHERE hotel_id = p_hotel_id AND house_keeping_status = 'Dirty')
     AND work_status IS NOT NULL;
  RETURN v_n;
END;
$$;

DO $$
DECLARE
  v_def text;
  v_marker text := '      UPDATE hotels SET service_day_reset_on = v_local::date WHERE id = h.id;';
BEGIN
  SELECT pg_get_functiondef('public.process_room_service_timers()'::regprocedure) INTO v_def;
  IF position('_housekeeping_new_day' IN v_def) > 0 THEN
    RETURN;
  END IF;
  IF position(v_marker IN v_def) = 0 THEN
    RAISE EXCEPTION 'process_room_service_timers(): new-day marker not found';
  END IF;
  v_def := replace(v_def, v_marker,
    '      PERFORM public._housekeeping_new_day(h.id, v_local::date);' || chr(10) || v_marker);
  -- And the two new jobs, once a minute with the rest.
  v_def := replace(v_def, '  RETURN v_n;' || chr(10) || 'END;',
    '  v_n := v_n + public._process_room_started_notices();' || chr(10) ||
    '  v_n := v_n + public._process_housekeeping_rollover();' || chr(10) ||
    '  DELETE FROM public.room_action_requests WHERE created_at < now() - interval ''1 day'';' || chr(10) ||
    '  RETURN v_n;' || chr(10) || 'END;');
  EXECUTE v_def;
END
$$;
