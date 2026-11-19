-- Each department's own work state on a room — engineering's daily round.
--
-- Housekeeping's state lives on `rooms` (house_keeping_status, the cleaning
-- clock) and moves only through room_action(). Engineering gets the same idea
-- in its own layer, never touching housekeeping's fields:
--
--   Unchecked → In Progress ⇄ Paused → Checked   (+ its own Priority flag)
--
-- One row per room per department (created on first use), changed only by
-- room_department_action(). The same rules as housekeeping (user, 2026-11-18):
-- the assigned technician starts, pauses and checks; a room needs a technician
-- before In Progress; one room in progress per technician; an engineering lead
-- (rooms.engineering.assign) may act for the technician with a reason, and the
-- technician is told. Priority is engineering's own, set by the leads. Every
-- new service day, Checked rooms go back to Unchecked.
--
-- Generic over departments (department_id), so another department's round is
-- a row of rules, not a new table.

BEGIN;

-- 1. The state ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.room_department_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE RESTRICT,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'unchecked'
    CHECK (status IN ('unchecked', 'in_progress', 'paused', 'checked')),
  priority boolean NOT NULL DEFAULT false,
  -- When the current check started (kept across pauses).
  started_at timestamptz,
  -- Running since (null while paused or not started).
  resumed_at timestamptz,
  paused_at timestamptz,
  -- Seconds worked before the current run.
  elapsed_seconds integer NOT NULL DEFAULT 0,
  checked_at timestamptz,
  checked_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE (room_id, department_id)
);

CREATE INDEX IF NOT EXISTS idx_room_department_states_hotel_dept
  ON public.room_department_states (hotel_id, department_id);

ALTER TABLE public.room_department_states ENABLE ROW LEVEL SECURITY;

-- Read in your hotel; written only through room_department_action().
DROP POLICY IF EXISTS room_department_states_select ON public.room_department_states;
CREATE POLICY room_department_states_select ON public.room_department_states
  FOR SELECT USING (hotel_id = (SELECT public.auth_hotel_id()));

GRANT SELECT ON public.room_department_states TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'room_department_states'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_department_states;
  END IF;
END $$;

-- 2. The actions -------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.room_department_action(
  p_room_id uuid,
  p_department text,
  p_action text,
  p_reason text DEFAULT NULL
) RETURNS public.room_department_states
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hotel uuid := public.auth_hotel_id();
  v_dept uuid;
  v_room public.rooms%ROWTYPE;
  v_state public.room_department_states%ROWTYPE;
  v_assignee uuid;
  v_is_lead boolean;
  v_override boolean := false;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_other text;
  v_label text;
  v_me text;
BEGIN
  IF p_department <> 'engineering' THEN
    RAISE EXCEPTION 'Only Engineering keeps a room round.' USING ERRCODE = '22023';
  END IF;
  IF p_action NOT IN ('start', 'pause', 'resume', 'check', 'uncheck', 'priority_on', 'priority_off') THEN
    RAISE EXCEPTION 'Unknown action %.', p_action USING ERRCODE = '22023';
  END IF;
  v_dept := public._department_id(p_department);
  v_is_lead := public.auth_has_permission('rooms.engineering.assign');

  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id AND hotel_id = v_hotel;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found.' USING ERRCODE = 'P0002';
  END IF;
  -- Engineering staff only (leads and technicians alike).
  IF NOT EXISTS (
    SELECT 1 FROM public.users u JOIN public.job_titles jt ON jt.id = u.job_title_id
     WHERE u.id = v_uid AND jt.department_id = v_dept
  ) AND NOT public.auth_has_permission('rooms.manage') THEN
    RAISE EXCEPTION 'Only Engineering can change this.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.room_department_states (hotel_id, room_id, department_id)
  VALUES (v_hotel, p_room_id, v_dept)
  ON CONFLICT (room_id, department_id) DO NOTHING;
  SELECT * INTO v_state FROM public.room_department_states
   WHERE room_id = p_room_id AND department_id = v_dept FOR UPDATE;

  -- Priority: the leads' call.
  IF p_action IN ('priority_on', 'priority_off') THEN
    IF NOT v_is_lead THEN
      RAISE EXCEPTION 'Only the Director or a Supervisor can set priority.' USING ERRCODE = '42501';
    END IF;
    UPDATE public.room_department_states
       SET priority = (p_action = 'priority_on'), updated_at = now(), updated_by = v_uid
     WHERE id = v_state.id
    RETURNING * INTO v_state;
    INSERT INTO public.room_history (room_id, hotel_id, user_id, event_type, description)
    VALUES (p_room_id, v_hotel, v_uid, 'engineering',
            CASE WHEN p_action = 'priority_on' THEN 'Marked an engineering priority' ELSE 'Engineering priority removed' END);
    RETURN v_state;
  END IF;

  -- The technician holding the room this shift.
  SELECT ra.user_id INTO v_assignee FROM public.room_assignments ra
   WHERE ra.room_id = p_room_id AND ra.department_id = v_dept
     AND ra.shift_id = public._hotel_current_shift(v_hotel)
   ORDER BY ra.updated_at DESC NULLS LAST LIMIT 1;

  IF p_action = 'start' AND v_assignee IS NULL THEN
    RAISE EXCEPTION 'Assign a technician to Room % before starting it.', v_room.room_number
      USING ERRCODE = 'P0001', HINT = 'Assign the room, then start.';
  END IF;
  IF v_assignee IS DISTINCT FROM v_uid THEN
    IF NOT v_is_lead THEN
      RAISE EXCEPTION 'Room % is another technician''s.', v_room.room_number USING ERRCODE = '42501';
    END IF;
    IF v_reason IS NULL THEN
      RAISE EXCEPTION 'Say why you are changing it for the technician.' USING ERRCODE = '22023';
    END IF;
    v_override := true;
  END IF;

  -- The moves.
  IF p_action = 'start' THEN
    IF v_state.status NOT IN ('unchecked', 'checked') THEN
      RAISE EXCEPTION 'Room % is already being checked.', v_room.room_number USING ERRCODE = 'P0001';
    END IF;
    SELECT r.room_number INTO v_other
      FROM public.room_department_states s
      JOIN public.rooms r ON r.id = s.room_id
      JOIN public.room_assignments ra ON ra.room_id = s.room_id AND ra.department_id = v_dept
                                     AND ra.shift_id = public._hotel_current_shift(v_hotel)
     WHERE s.department_id = v_dept AND s.status = 'in_progress' AND s.room_id <> p_room_id
       AND ra.user_id = v_assignee
     LIMIT 1;
    IF v_other IS NOT NULL THEN
      RAISE EXCEPTION 'Room % is still in progress — pause or check it first.', v_other USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.room_department_states
       SET status = 'in_progress', started_at = now(), resumed_at = now(), paused_at = NULL,
           elapsed_seconds = 0, checked_at = NULL, checked_by = NULL, updated_at = now(), updated_by = v_uid
     WHERE id = v_state.id RETURNING * INTO v_state;
    v_label := 'Started the engineering check';
  ELSIF p_action = 'pause' THEN
    IF v_state.status <> 'in_progress' THEN
      RAISE EXCEPTION 'Room % is not in progress.', v_room.room_number USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.room_department_states
       SET status = 'paused', paused_at = now(), resumed_at = NULL,
           elapsed_seconds = elapsed_seconds + greatest(0, extract(epoch FROM now() - coalesce(resumed_at, now()))::int),
           updated_at = now(), updated_by = v_uid
     WHERE id = v_state.id RETURNING * INTO v_state;
    v_label := 'Paused the engineering check';
  ELSIF p_action = 'resume' THEN
    IF v_state.status <> 'paused' THEN
      RAISE EXCEPTION 'Room % is not paused.', v_room.room_number USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.room_department_states
       SET status = 'in_progress', resumed_at = now(), paused_at = NULL, updated_at = now(), updated_by = v_uid
     WHERE id = v_state.id RETURNING * INTO v_state;
    v_label := 'Resumed the engineering check';
  ELSIF p_action = 'check' THEN
    IF v_state.status NOT IN ('in_progress', 'paused') THEN
      RAISE EXCEPTION 'Start Room % before marking it checked.', v_room.room_number USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.room_department_states
       SET status = 'checked', checked_at = now(), checked_by = v_uid, paused_at = NULL, resumed_at = NULL,
           elapsed_seconds = elapsed_seconds + CASE WHEN status = 'in_progress'
             THEN greatest(0, extract(epoch FROM now() - coalesce(resumed_at, now()))::int) ELSE 0 END,
           updated_at = now(), updated_by = v_uid
     WHERE id = v_state.id RETURNING * INTO v_state;
    v_label := 'Marked the room checked';
  ELSE -- uncheck
    UPDATE public.room_department_states
       SET status = 'unchecked', started_at = NULL, resumed_at = NULL, paused_at = NULL,
           elapsed_seconds = 0, checked_at = NULL, checked_by = NULL, updated_at = now(), updated_by = v_uid
     WHERE id = v_state.id RETURNING * INTO v_state;
    v_label := 'Set the room back to unchecked';
  END IF;

  INSERT INTO public.room_history (room_id, hotel_id, user_id, event_type, description)
  VALUES (p_room_id, v_hotel, v_uid, 'engineering',
          v_label || CASE WHEN v_override THEN format(' (for the technician: %s)', v_reason) ELSE '' END);

  IF v_override AND v_assignee IS NOT NULL THEN
    SELECT full_name INTO v_me FROM public.users WHERE id = v_uid;
    PERFORM public._notify_user(v_assignee, v_hotel, 'room_status_override', 'Changed for you',
      format('%s: Room %s — %s. %s', coalesce(v_me, 'A supervisor'), v_room.room_number, lower(v_label), v_reason),
      jsonb_build_object('roomId', p_room_id));
  END IF;

  RETURN v_state;
END;
$$;

REVOKE ALL ON FUNCTION public.room_department_action(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.room_department_action(uuid, text, text, text) TO authenticated;

-- 3. The daily round ---------------------------------------------------------

-- A new service day: checked rooms start Unchecked again. A check still running
-- carries on; Priority stays until a lead clears it.
CREATE OR REPLACE FUNCTION public._department_states_new_day(p_hotel_id uuid, p_today date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_n integer;
BEGIN
  UPDATE public.room_department_states
     SET status = 'unchecked', started_at = NULL, resumed_at = NULL, paused_at = NULL,
         elapsed_seconds = 0, checked_at = NULL, checked_by = NULL, updated_at = now(), updated_by = NULL
   WHERE hotel_id = p_hotel_id AND status = 'checked';
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE ALL ON FUNCTION public._department_states_new_day(uuid, date) FROM PUBLIC;

-- The service-day job, unchanged except for that one call.
CREATE OR REPLACE FUNCTION "public"."process_room_service_timers"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
      -- A Do Not Disturb refusal carries on (the sign may still be up); others end.
      UPDATE rooms SET refuse_service_at = NULL, refuse_service_reason = NULL
       WHERE hotel_id = h.id AND refuse_service_at IS NOT NULL AND dnd_at IS NULL;
      UPDATE rooms SET return_later_at = NULL, return_later_reason = NULL
       WHERE hotel_id = h.id AND return_later_at IS NOT NULL;
      UPDATE rooms SET dnd_escalated_at = NULL WHERE hotel_id = h.id AND dnd_at IS NOT NULL;
      PERFORM public._housekeeping_new_day(h.id, v_local::date);
      -- Engineering's daily round: checked rooms start the day Unchecked (2026-11-18).
      PERFORM public._department_states_new_day(h.id, v_local::date);
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

  v_n := v_n + public._process_room_started_notices();
  v_n := v_n + public._process_housekeeping_rollover();
  DELETE FROM public.room_action_requests WHERE created_at < now() - interval '1 day';
  RETURN v_n;
END;
$$;
COMMIT;
