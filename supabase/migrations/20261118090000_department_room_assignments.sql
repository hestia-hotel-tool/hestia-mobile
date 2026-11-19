-- Room assignments by department: housekeeping and engineering on the same rooms.
--
-- One room record, one assignment layer per department (the model hotel
-- operations systems use): a room can have its room attendant AND its
-- technician on the same shift. Each department keeps its own workflow —
-- housekeeping's cleaning state machine is untouched and only ever sees
-- housekeeping assignments.
--
--   1. Helpers: _department_id(key), _assign_permission(department).
--   2. RBAC: `rooms.engineering.assign`; the `engineering_lead` role (Director,
--      Supervisor) beside `engineering` (technicians); the Engineering
--      Supervisor title restored. Mirrors scripts/rbac/parse-spec.py and the
--      regenerated 20260902000100_rbac_seed.sql.
--   3. room_assignments.department_id (existing rows: housekeeping, the
--      default), unique per room + shift + department.
--   4. Every function that reads assignments as "the room attendant" is scoped
--      to housekeeping (bodies taken from the live database, only the scoping
--      added). Engineering assignments are cleared at each shift's end.
--   5. assign_rooms(..., p_department) — defaults to housekeeping, so existing
--      callers are unchanged; engineering needs rooms.engineering.assign and an
--      assignee from the Engineering department.

BEGIN;

-- 1. Helpers ---------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._department_id(p_key text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.departments WHERE key = p_key;
$$;

-- Who may assign a department's rooms.
CREATE OR REPLACE FUNCTION public._assign_permission(p_department uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE (SELECT key FROM public.departments WHERE id = p_department)
           WHEN 'engineering' THEN 'rooms.engineering.assign'
           ELSE 'rooms.reassign'
         END;
$$;

-- 2. RBAC ------------------------------------------------------------------

INSERT INTO public.permissions (name, description) VALUES
  ('rooms.engineering.assign', 'Assign and reassign rooms to engineering technicians')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.roles (key, name, description) VALUES
  ('engineering_lead', 'Engineering Lead', 'Engineering leadership (Director, Supervisor). Assigns rooms to technicians.')
ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

UPDATE public.roles
   SET description = 'Engineering technicians. Work their assigned rooms and tickets.'
 WHERE key = 'engineering';

-- engineering_lead holds everything engineering does, plus assigning.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT lead.id, rp.permission_id
  FROM public.roles lead
  CROSS JOIN public.roles eng
  JOIN public.role_permissions rp ON rp.role_id = eng.id
 WHERE lead.key = 'engineering_lead' AND eng.key = 'engineering'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.roles r
  JOIN public.permissions p ON p.name = 'rooms.engineering.assign'
 WHERE r.key = 'engineering_lead'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- The Engineering Supervisor title, back (Director > Supervisor > Technician).
INSERT INTO public.job_titles (key, name, department_id, role_id, home_variant, rooms_variant, is_department_lead)
SELECT 'engineering_supervisor', 'Engineering Supervisor', d.id, r.id, 'engineering', 'default', true
  FROM public.departments d, public.roles r
 WHERE d.key = 'engineering' AND r.key = 'engineering_lead'
ON CONFLICT (key) DO UPDATE
  SET role_id = EXCLUDED.role_id, department_id = EXCLUDED.department_id,
      home_variant = EXCLUDED.home_variant, is_department_lead = EXCLUDED.is_department_lead;

UPDATE public.job_titles jt
   SET role_id = r.id
  FROM public.roles r
 WHERE r.key = 'engineering_lead'
   AND jt.key IN ('director_of_engineering', 'assistant_director_of_engineering', 'engineering_supervisor')
   AND jt.role_id IS DISTINCT FROM r.id;

-- 3. The department on each assignment ----------------------------------------

ALTER TABLE public.room_assignments
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.departments(id) ON DELETE RESTRICT;

UPDATE public.room_assignments
   SET department_id = public._department_id('housekeeping')
 WHERE department_id IS NULL;

ALTER TABLE public.room_assignments
  ALTER COLUMN department_id SET DEFAULT public._department_id('housekeeping'),
  ALTER COLUMN department_id SET NOT NULL;

DROP INDEX IF EXISTS public.idx_room_assignments_room_shift;
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_assignments_room_shift_department
  ON public.room_assignments (room_id, shift_id, department_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_department
  ON public.room_assignments (department_id);

-- 4. Housekeeping's readers see housekeeping's assignments ---------------------

-- _current_room_assignment
CREATE OR REPLACE FUNCTION "public"."_current_room_assignment"("p_room_id" "uuid") RETURNS "public"."room_assignments"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT ra.*
    FROM public.room_assignments ra
   WHERE ra.room_id = p_room_id
     AND ra.department_id = public._department_id('housekeeping')
   ORDER BY (ra.user_id = auth.uid()) DESC NULLS LAST,
            ra.updated_at DESC NULLS LAST,
            ra.created_at DESC NULLS LAST
   LIMIT 1;
$$;

-- _housekeeping_new_day
CREATE OR REPLACE FUNCTION "public"."_housekeeping_new_day"("p_hotel_id" "uuid", "p_today" "date") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_n integer;
BEGIN
  IF NOT coalesce((SELECT overnight_reset FROM public.hotel_housekeeping_settings WHERE hotel_id = p_hotel_id), false) THEN
    RETURN 0;
  END IF;
  WITH slept AS (
    SELECT DISTINCT room_id FROM public.reservations
     WHERE hotel_id = p_hotel_id AND arrival_date < p_today AND departure_date >= p_today
       AND stay_status NOT IN ('cancelled', 'no_show')
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
     AND department_id = public._department_id('housekeeping')
     AND room_id IN (SELECT id FROM public.rooms WHERE hotel_id = p_hotel_id AND house_keeping_status = 'Dirty')
     AND work_status IS NOT NULL;
  RETURN v_n;
END;
$$;

-- _process_housekeeping_rollover
CREATE OR REPLACE FUNCTION "public"."_process_housekeeping_rollover"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
             AND ra.department_id = public._department_id('housekeeping')
             AND ro.house_keeping_status NOT IN ('Cleaned', 'Inspected')
             AND ro.house_keeping_status IS DISTINCT FROM 'InProgress'
          RETURNING ra.assigned_by_id, ra.room_id
        )
        SELECT assigned_by_id, count(*) AS n, array_agg(room_id) AS room_ids FROM freed WHERE assigned_by_id IS NOT NULL GROUP BY assigned_by_id
      LOOP
        PERFORM public._notify_user(a.assigned_by_id, s.hotel_id, 'room_pool', 'Rooms back in the pool',
          format('%s unfinished %s room%s from the %s shift %s unassigned.', a.n, s.name,
            CASE WHEN a.n = 1 THEN '' ELSE 's' END, s.name, CASE WHEN a.n = 1 THEN 'is now' ELSE 'are now' END),
          jsonb_build_object('shift', s.name, 'roomIds', to_jsonb(a.room_ids)));
        v_n := v_n + a.n;
      END LOOP;
    END IF;
    -- Engineering: technicians start every shift unassigned (2026-11-18).
    DELETE FROM public.room_assignments
     WHERE shift_id = s.id AND department_id = public._department_id('engineering');
    UPDATE public.shifts SET last_end_processed_on = v_local::date WHERE id = s.id;
  END LOOP;
  RETURN v_n;
END;
$$;

-- _process_room_started_notices
CREATE OR REPLACE FUNCTION "public"."_process_room_started_notices"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  r record;
  v_n integer := 0;
BEGIN
  FOR r IN
    SELECT ro.id, ro.hotel_id, ro.room_number, ra.user_id, ra.assigned_by_id, u.full_name
      FROM public.rooms ro
      JOIN public.hotel_housekeeping_settings hs ON hs.hotel_id = ro.hotel_id
      LEFT JOIN LATERAL (
        SELECT * FROM public.room_assignments a WHERE a.room_id = ro.id AND a.department_id = public._department_id('housekeeping')
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

-- _rooms_require_attendant_for_in_progress
CREATE OR REPLACE FUNCTION "public"."_rooms_require_attendant_for_in_progress"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF lower(replace(replace(coalesce(NEW.house_keeping_status, ''), '_', ''), ' ', '')) = 'inprogress'
     AND lower(replace(replace(coalesce(OLD.house_keeping_status, ''), '_', ''), ' ', '')) <> 'inprogress'
     AND NOT EXISTS (SELECT 1 FROM public.room_assignments ra WHERE ra.room_id = NEW.id AND ra.department_id = public._department_id('housekeeping')) THEN
    RAISE EXCEPTION 'Assign a room attendant to Room % before starting to clean it.', NEW.room_number
      USING ERRCODE = 'P0001', HINT = 'Assign the room, then set it In Progress.';
  END IF;
  RETURN NEW;
END;
$$;

-- _room_assignments_require_reassign
CREATE OR REPLACE FUNCTION "public"."_room_assignments_require_reassign"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR public.auth_has_permission(public._assign_permission(
       CASE WHEN TG_OP = 'DELETE' THEN OLD.department_id ELSE NEW.department_id END)) THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
     AND NEW.room_id IS NOT DISTINCT FROM OLD.room_id
     AND NEW.shift_id IS NOT DISTINCT FROM OLD.shift_id
     AND NEW.department_id IS NOT DISTINCT FROM OLD.department_id THEN
    RETURN NEW; -- progress on the attendant's own room, not a reassignment
  END IF;

  RAISE EXCEPTION 'You are not allowed to assign rooms' USING ERRCODE = '42501';
END;
$$;

-- _room_assignments_transfer
CREATE OR REPLACE FUNCTION "public"."_room_assignments_transfer"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  ro public.rooms%ROWTYPE;
  v_state text;
  v_mins integer;
  v_new text;
BEGIN
  IF NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN
    RETURN NEW;
  END IF;
  -- Cleaning handover is housekeeping's; other departments' rows pass.
  IF NEW.department_id IS DISTINCT FROM public._department_id('housekeeping') THEN
    RETURN NEW;
  END IF;
  SELECT * INTO ro FROM public.rooms WHERE id = NEW.room_id FOR UPDATE;
  v_state := public._room_state(ro.house_keeping_status, ro.paused_at, ro.refuse_service_at, ro.refuse_service_reason, ro.return_later_at);

  IF v_state IN ('in_progress', 'paused') THEN
    -- Stop the clock on the old attendant's time; the new one resumes it.
    IF v_state = 'in_progress' THEN
      PERFORM set_config('hestia.room_action', 'on', true);
      PERFORM set_config('hestia.handover', 'on', true);
      UPDATE public.rooms SET paused_at = now() WHERE id = ro.id;
      PERFORM set_config('hestia.handover', '', true);
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
    -- Not started yet: still tell the person it was taken from, or the room
    -- simply vanishes from their list (tester feedback, 2026-10-26).
    IF OLD.user_id IS NOT NULL AND v_state NOT IN ('cleaned', 'inspected') THEN
      SELECT full_name INTO v_new FROM public.users WHERE id = NEW.user_id;
      PERFORM public._notify_user(OLD.user_id, ro.hotel_id, 'room_unassigned', 'Room reassigned',
        format('Room %s was given to %s.', ro.room_number, coalesce(v_new, 'another attendant')),
        jsonb_build_object('roomId', ro.id));
    END IF;
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

-- _room_assignments_transfer_on_insert
CREATE OR REPLACE FUNCTION "public"."_room_assignments_transfer_on_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  ro public.rooms%ROWTYPE;
  v_old_user uuid;
  v_mins integer;
  v_new text;
BEGIN
  -- Cleaning handover is housekeeping's; other departments' rows pass.
  IF NEW.department_id IS DISTINCT FROM public._department_id('housekeeping') THEN
    RETURN NEW;
  END IF;
  SELECT * INTO ro FROM public.rooms WHERE id = NEW.room_id FOR UPDATE;
  -- Only a room someone else is cleaning right now is handed over.
  IF ro.house_keeping_status IS DISTINCT FROM 'InProgress' OR ro.paused_at IS NOT NULL
     OR ro.refuse_service_at IS NOT NULL OR ro.return_later_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT ra.user_id INTO v_old_user FROM public.room_assignments ra
   WHERE ra.room_id = NEW.room_id AND ra.user_id IS DISTINCT FROM NEW.user_id
     AND ra.department_id = public._department_id('housekeeping')
     AND ra.work_status = 'in_progress'
   ORDER BY ra.updated_at DESC NULLS LAST LIMIT 1;
  IF v_old_user IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('hestia.room_action', 'on', true);
  PERFORM set_config('hestia.handover', 'on', true);
  UPDATE public.rooms SET paused_at = now() WHERE id = ro.id;
  PERFORM set_config('hestia.handover', '', true);
  UPDATE public.room_assignments SET work_status = 'paused'
   WHERE room_id = ro.id AND user_id = v_old_user AND department_id = public._department_id('housekeeping');
  SELECT * INTO ro FROM public.rooms WHERE id = NEW.room_id;
  NEW.work_status := 'paused';

  v_mins := round(coalesce(ro.cleaning_elapsed_seconds, 0) / 60.0);
  SELECT full_name INTO v_new FROM public.users WHERE id = NEW.user_id;
  INSERT INTO public.room_history (room_id, hotel_id, user_id, event_type, description)
  VALUES (ro.id, ro.hotel_id, auth.uid(), 'assignment',
    format('Handed over to %s after %s min of cleaning', coalesce(v_new, 'another attendant'), v_mins));
  PERFORM public._notify_user(v_old_user, ro.hotel_id, 'room_assignment', 'Room handed over',
    format('Room %s was given to %s. Your %s min on it are kept.', ro.room_number, coalesce(v_new, 'another attendant'), v_mins),
    jsonb_build_object('roomId', ro.id));
  RETURN NEW;
END;
$$;

-- room_action
CREATE OR REPLACE FUNCTION "public"."room_action"("p_room_id" "uuid", "p_action" "text", "p_reason" "text" DEFAULT NULL::"text", "p_until" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_request_id" "uuid" DEFAULT NULL::"uuid", "p_photo_urls" "text"[] DEFAULT NULL::"text"[]) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
  -- Photos sent with a send-back: web URLs only, at most 8.
  v_photos text[] := ARRAY(
    SELECT u FROM unnest(coalesce(p_photo_urls, '{}'::text[])) AS u
     WHERE u ~ '^https?://' LIMIT 8);
  v_inspector uuid;
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
      -- A retry: answer only for the original request's room, in this hotel.
      IF EXISTS (
        SELECT 1 FROM public.room_action_requests q JOIN public.rooms ro ON ro.id = q.room_id
         WHERE q.request_id = p_request_id AND q.room_id = p_room_id AND q.user_id = v_uid
           AND ro.hotel_id = public.auth_hotel_id()
      ) THEN
        RETURN public._room_snapshot(p_room_id);
      END IF;
      RAISE EXCEPTION 'Room not found.' USING ERRCODE = 'P0002';
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
   WHERE room_id = r.id AND user_id = v_uid AND department_id = public._department_id('housekeeping')
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
    RAISE EXCEPTION 'Only Room %''s attendant or a supervisor can do that.', r.room_number USING ERRCODE = '42501';
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
                                      AND ra.department_id = public._department_id('housekeeping')
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
      UPDATE public.rooms SET house_keeping_status = 'Inspected', paused_at = NULL WHERE id = r.id;
    WHEN 'reset' THEN
      UPDATE public.rooms SET house_keeping_status = 'Dirty', paused_at = NULL WHERE id = r.id;
      UPDATE public.rooms SET cleaning_elapsed_seconds = 0, cleaning_started_at = NULL,
             in_progress_started_at = NULL, started_notified_at = NULL
       WHERE id = r.id;
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
        WHEN 'inspect' THEN 'completed'
        ELSE NULL END,
      start_time = CASE
        WHEN p_action = 'start' THEN coalesce(start_time, now())
        WHEN p_action IN ('undo_start', 'send_back', 'reset') THEN NULL
        ELSE start_time END,
      end_time = CASE
        WHEN p_action = 'clean' THEN now()
        WHEN p_action = 'inspect' THEN coalesce(end_time, now())
        WHEN p_action IN ('start', 'undo_start', 'send_back', 'reset') THEN NULL
        ELSE end_time END
     WHERE id = v_ra.id;
  END IF;

  -- History for what needs a reason or changes hands.
  IF v_override OR p_action IN ('send_back', 'undo_start') THEN
    SELECT full_name INTO v_me FROM public.users WHERE id = v_uid;
    SELECT full_name INTO v_them FROM public.users WHERE id = v_ra.user_id;
    INSERT INTO public.room_history (room_id, hotel_id, user_id, event_type, description, attachments)
    VALUES (r.id, r.hotel_id, v_uid, 'housekeeping_status',
      CASE
        WHEN p_action = 'send_back' AND v_state = 'inspected' THEN format('Reopened the room: %s', v_reason)
        WHEN p_action = 'send_back' THEN format('Sent the room back to Dirty: %s', v_reason)
        WHEN p_action = 'undo_start' THEN 'Undid starting the room'
        ELSE format('%s for %s: %s', public._room_action_label(p_action), coalesce(v_them, 'the attendant'), v_reason)
      END,
      to_jsonb(CASE WHEN p_action = 'send_back' THEN v_photos ELSE '{}'::text[] END));
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
         SET body = CASE WHEN v_state = 'inspected'
                     THEN format('Room %s was reopened after inspection — please clean it again. Reason: %s.', r.room_number, v_reason)
                     ELSE format('Room %s was sent back — please clean it again. Reason: %s.', r.room_number, v_reason) END,
             data = coalesce(data, '{}'::jsonb) || jsonb_build_object('reason', v_reason, 'photoUrls', to_jsonb(v_photos))
       WHERE user_id = v_ra.user_id AND type = 'room_rejected' AND created_at = now();
    END IF;
    -- Reopening an Inspected room: the supervisor who passed it is told why
    -- it failed (with the comment and photos), unless that is the person
    -- reopening it or the attendant, who has just been told above.
    IF p_action = 'send_back' AND v_state = 'inspected' THEN
      SELECT a.user_id INTO v_inspector
        FROM public.activity_logs a
       WHERE a.table_name = 'rooms' AND a.record_id = r.id
         AND a.new_data->>'house_keeping_status' = 'Inspected'
         AND coalesce(a.old_data->>'house_keeping_status', '') <> 'Inspected'
         AND a.user_id IS NOT NULL
       ORDER BY a.created_at DESC
       LIMIT 1;
      IF v_inspector IS NOT NULL AND v_inspector <> v_uid AND v_inspector IS DISTINCT FROM v_ra.user_id THEN
        PERFORM public._notify_user(v_inspector, r.hotel_id, 'room_rejected', 'Failed inspection',
          format('%s reopened Room %s after your inspection. Reason: %s.', coalesce(v_me, 'A manager'), r.room_number, v_reason),
          jsonb_build_object('roomId', r.id, 'reason', v_reason, 'photoUrls', to_jsonb(v_photos)));
      END IF;
    END IF;
  END IF;

  RETURN public._room_snapshot(r.id);
END;
$$;

-- attention_items
CREATE OR REPLACE FUNCTION "public"."attention_items"("p_limit" integer DEFAULT 50) RETURNS TABLE("kind" "text", "room_id" "uuid", "room_number" "text", "since" timestamp with time zone, "detail" "text", "owner_id" "uuid", "owner_name" "text", "ref_id" "uuid")
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_zone text := coalesce((SELECT timezone FROM public.hotels WHERE id = public.auth_hotel_id()), 'UTC');
  v_day_start timestamptz := (SELECT (public.hotel_service_day(h.id) + h.service_day_starts) AT TIME ZONE coalesce(h.timezone, 'UTC')
                                FROM public.hotels h WHERE h.id = public.auth_hotel_id());
BEGIN
  IF NOT public.auth_has_permission('rooms.read') THEN
    RAISE EXCEPTION 'You can''t see the rooms.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH owner AS (
    SELECT DISTINCT ON (ra.room_id) ra.room_id, ra.user_id, u.full_name
      FROM public.room_assignments ra JOIN public.users u ON u.id = ra.user_id
     WHERE ra.hotel_id = v_hotel AND ra.shift_id = public._hotel_current_shift(v_hotel)
       AND ra.department_id = public._department_id('housekeeping')
     ORDER BY ra.room_id, ra.updated_at DESC NULLS LAST
  ), items AS (
    -- Cleaning past its credit.
    SELECT 'overdue'::text k, r.id rid, r.room_number rn,
           now() - make_interval(secs => public._room_cleaned_seconds(r.cleaning_elapsed_seconds, r.cleaning_started_at) - r.credit * 60) at_time,
           format('%s min over its %s min', (public._room_cleaned_seconds(r.cleaning_elapsed_seconds, r.cleaning_started_at) - r.credit * 60) / 60, r.credit) txt,
           NULL::uuid ref
      FROM public.rooms r
     WHERE r.hotel_id = v_hotel AND r.active AND r.house_keeping_status = 'InProgress' AND coalesce(r.credit, 0) > 0
       AND public._room_cleaned_seconds(r.cleaning_elapsed_seconds, r.cleaning_started_at) > r.credit * 60
    UNION ALL
    -- Promised within the hour (or already late) and not ready.
    SELECT 'promise_due', r.id, r.room_number, r.promise_time_at,
           format('Promised for %s', to_char(r.promise_time_at AT TIME ZONE v_zone, 'HH24:MI')), NULL
      FROM public.rooms r
     WHERE r.hotel_id = v_hotel AND r.active AND r.promise_time_at IS NOT NULL AND r.promise_time_at <= now() + interval '60 minutes'
       AND coalesce(r.house_keeping_status, 'Dirty') NOT IN ('Cleaned', 'Inspected')
    UNION ALL
    -- A DND sign due another look.
    SELECT 'dnd_recheck', r.id, r.room_number, r.dnd_next_check_at,
           format('DND since %s (%s %s)', to_char(r.dnd_at AT TIME ZONE v_zone, 'HH24:MI'), r.dnd_check_count,
                  CASE WHEN r.dnd_check_count = 1 THEN 'check' ELSE 'checks' END), NULL
      FROM public.rooms r
     WHERE r.hotel_id = v_hotel AND r.active AND r.dnd_at IS NOT NULL AND r.dnd_next_check_at <= now()
    UNION ALL
    -- The guest's "come back later" time has come.
    SELECT 'return_due', r.id, r.room_number, r.return_later_at,
           format('Guest asked for service at %s', to_char(r.return_later_at AT TIME ZONE v_zone, 'HH24:MI')), NULL
      FROM public.rooms r
     WHERE r.hotel_id = v_hotel AND r.active AND r.return_later_at IS NOT NULL AND r.return_later_at <= now()
    UNION ALL
    -- Sent back (or reopened) this service day and not clean again yet.
    (SELECT DISTINCT ON (r.id) 'sent_back', r.id, r.room_number, h.created_at, h.description, NULL::uuid
       FROM public.room_history h JOIN public.rooms r ON r.id = h.room_id
      WHERE h.hotel_id = v_hotel AND h.created_at >= v_day_start
        AND (h.description LIKE 'Sent the room back to Dirty%' OR h.description LIKE 'Reopened the room%')
        AND coalesce(r.house_keeping_status, 'Dirty') NOT IN ('Cleaned', 'Inspected')
      ORDER BY r.id, h.created_at DESC)
    UNION ALL
    -- Open urgent tickets.
    SELECT 'urgent_ticket', t.room_id, r.room_number, t.created_at, t.title, t.id
      FROM public.tickets t LEFT JOIN public.rooms r ON r.id = t.room_id
     WHERE t.hotel_id = v_hotel AND t.status <> 'done' AND t.priority = 'urgent'
  )
  SELECT i.k, i.rid, i.rn, i.at_time, i.txt,
         CASE WHEN i.k = 'urgent_ticket' THEN t.assigned_to_id ELSE o.user_id END,
         CASE WHEN i.k = 'urgent_ticket' THEN tu.full_name ELSE o.full_name END,
         i.ref
    FROM items i
    LEFT JOIN owner o ON o.room_id = i.rid
    LEFT JOIN public.tickets t ON t.id = i.ref
    LEFT JOIN public.users tu ON tu.id = t.assigned_to_id
   ORDER BY i.at_time ASC NULLS LAST
   LIMIT greatest(1, least(coalesce(p_limit, 50), 200));
END;
$$;

-- room_board
CREATE OR REPLACE FUNCTION "public"."room_board"("p_shift_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_shift uuid := coalesce(p_shift_id, public._hotel_current_shift(public.auth_hotel_id()));
  v_day date := public.hotel_service_day(public.auth_hotel_id());
BEGIN
  IF NOT public.auth_has_permission('rooms.read') THEN
    RAISE EXCEPTION 'You can''t see the rooms.' USING ERRCODE = '42501';
  END IF;
  IF p_shift_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.shifts WHERE id = p_shift_id AND hotel_id = v_hotel) THEN
    RAISE EXCEPTION 'That shift was not found.' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'service_day', v_day,
    'shift_id', v_shift,
    'rooms', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'room_number', r.room_number,
        'room_number_sort', r.room_number_sort,
        'floor', CASE WHEN f.id IS NULL THEN NULL ELSE jsonb_build_object('id', f.id, 'name', f.name, 'sort_order', f.sort_order) END,
        'section', r.section,
        'type', CASE WHEN rt.id IS NULL THEN NULL ELSE jsonb_build_object('code', rt.code, 'name', rt.name) END,
        'credit', r.credit,
        'linen_status', r.linen_status,
        'state', public._room_state(r.house_keeping_status, r.paused_at, r.refuse_service_at, r.refuse_service_reason, r.return_later_at),
        'house_keeping_status', r.house_keeping_status,
        'priority', r.priority,
        'flagged', r.flagged,
        'flag_reason', r.flag_reason,
        'promise_time_at', r.promise_time_at,
        'paused_at', r.paused_at,
        'dnd_at', r.dnd_at,
        'dnd_next_check_at', r.dnd_next_check_at,
        'refuse_service_at', r.refuse_service_at,
        'refuse_service_reason', r.refuse_service_reason,
        'return_later_at', r.return_later_at,
        'return_later_reason', r.return_later_reason,
        'in_progress_started_at', r.in_progress_started_at,
        'cleaning_started_at', r.cleaning_started_at,
        'cleaning_elapsed_seconds', r.cleaning_elapsed_seconds,
        'out_of_order', r.out_of_order_from IS NOT NULL AND r.out_of_order_from <= v_day AND v_day <= r.out_of_order_to,
        'out_of_order_reason', r.out_of_order_reason,
        'assignment', (
          SELECT jsonb_build_object('user_id', ra.user_id, 'full_name', u.full_name, 'avatar_url', u.avatar_url, 'work_status', ra.work_status)
            FROM public.room_assignments ra LEFT JOIN public.users u ON u.id = ra.user_id
           WHERE ra.room_id = r.id AND ra.shift_id = v_shift
             AND ra.department_id = public._department_id('housekeeping')
           LIMIT 1),
        'reservations', coalesce((
          SELECT jsonb_agg(jsonb_build_object(
                   'id', s.id, 'reference', s.reference, 'arrival_date', s.arrival_date, 'departure_date', s.departure_date,
                   'eta', s.eta, 'adults', s.adults, 'kids', s.kids, 'stay_status', s.stay_status,
                   'front_office_status', s.front_office_status, 'reservation_status', s.reservation_status,
                   'guests', coalesce((
                     SELECT jsonb_agg(jsonb_build_object('full_name', g.full_name, 'vip_code', g.vip_code) ORDER BY rg.guest_order)
                       FROM public.reservation_guests rg JOIN public.guests g ON g.id = rg.guest_id
                      WHERE rg.reservation_id = s.id), '[]'::jsonb))
                 ORDER BY s.arrival_date)
            FROM public.reservations s
           WHERE s.room_id = r.id
             AND s.stay_status NOT IN ('cancelled', 'no_show')
             AND s.arrival_date <= v_day AND v_day <= s.departure_date), '[]'::jsonb),
        'notes_count', (SELECT count(*) FROM public.room_notes n WHERE n.room_id = r.id)
      ) ORDER BY f.sort_order NULLS LAST, r.room_number_sort, r.room_number)
        FROM public.rooms r
        LEFT JOIN public.floors f ON f.id = r.floor_id
        LEFT JOIN public.room_types rt ON rt.id = r.room_type_id
       WHERE r.hotel_id = v_hotel AND r.active), '[]'::jsonb)
  );
END;
$$;

-- 5. assign_rooms, per department ---------------------------------------------

DROP FUNCTION IF EXISTS public.assign_rooms(uuid[], uuid, uuid);

CREATE OR REPLACE FUNCTION public.assign_rooms(
  p_room_ids uuid[],
  p_user_id uuid,
  p_shift_id uuid,
  p_department text DEFAULT 'housekeeping'
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_dept uuid;
  v_ids uuid[];
  v_room record;
  v_changed uuid[] := '{}';
  v_name text;
  v_active boolean;
  v_user_dept uuid;
  v_n int;
BEGIN
  IF p_department NOT IN ('housekeeping', 'engineering') THEN
    RAISE EXCEPTION 'Rooms are assigned by Housekeeping or Engineering.' USING ERRCODE = '22023';
  END IF;
  v_dept := public._department_id(p_department);
  IF NOT public.auth_has_permission(public._assign_permission(v_dept)) THEN
    RAISE EXCEPTION 'Only supervisors can assign rooms.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shifts WHERE id = p_shift_id AND hotel_id = v_hotel) THEN
    RAISE EXCEPTION 'That shift was not found.' USING ERRCODE = 'P0002';
  END IF;
  SELECT array_agg(DISTINCT x) INTO v_ids FROM unnest(coalesce(p_room_ids, '{}')) x;
  v_n := coalesce(array_length(v_ids, 1), 0);
  IF v_n = 0 THEN
    RAISE EXCEPTION 'Pick at least one room.' USING ERRCODE = '22023';
  END IF;
  IF v_n > 500 THEN
    RAISE EXCEPTION 'Assign up to 500 rooms at a time.' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM public.rooms WHERE id = ANY (v_ids) AND hotel_id = v_hotel AND active) <> v_n THEN
    RAISE EXCEPTION 'Some of those rooms no longer exist or are inactive.' USING ERRCODE = 'P0002';
  END IF;
  IF p_user_id IS NOT NULL THEN
    SELECT u.full_name, u.active, jt.department_id INTO v_name, v_active, v_user_dept
      FROM public.users u
      LEFT JOIN public.job_titles jt ON jt.id = u.job_title_id
     WHERE u.id = p_user_id AND u.hotel_id = v_hotel;
    IF NOT FOUND OR p_user_id = ANY (public.platform_team_ids()) THEN
      RAISE EXCEPTION 'That person isn''t on this hotel''s staff.' USING ERRCODE = 'P0002';
    END IF;
    IF NOT v_active THEN
      RAISE EXCEPTION '%''s account is disabled.', v_name USING ERRCODE = 'P0001';
    END IF;
    -- A technician is someone in Engineering (housekeeping keeps its old rule).
    IF p_department = 'engineering' AND v_user_dept IS DISTINCT FROM v_dept THEN
      RAISE EXCEPTION '% isn''t in Engineering.', v_name USING ERRCODE = 'P0001';
    END IF;
  END IF;

  PERFORM set_config('hestia.bulk_assign', 'on', true);
  FOR v_room IN SELECT id FROM public.rooms WHERE id = ANY (v_ids) ORDER BY room_number_sort, room_number LOOP
    IF p_user_id IS NULL THEN
      DELETE FROM public.room_assignments
       WHERE room_id = v_room.id AND shift_id = p_shift_id AND department_id = v_dept;
      IF FOUND THEN v_changed := v_changed || v_room.id; END IF;
    ELSIF NOT EXISTS (
      SELECT 1 FROM public.room_assignments
       WHERE room_id = v_room.id AND shift_id = p_shift_id AND department_id = v_dept AND user_id = p_user_id
    ) THEN
      INSERT INTO public.room_assignments (hotel_id, room_id, shift_id, user_id, department_id)
      VALUES (v_hotel, v_room.id, p_shift_id, p_user_id, v_dept)
      ON CONFLICT (room_id, shift_id, department_id) DO UPDATE SET user_id = EXCLUDED.user_id;
      v_changed := v_changed || v_room.id;
    END IF;
  END LOOP;
  PERFORM set_config('hestia.bulk_assign', '', true);

  IF p_user_id IS NOT NULL THEN
    PERFORM public._room_assignment_notice(p_user_id, v_hotel, v_changed, p_shift_id);
  END IF;
  RETURN coalesce(array_length(v_changed, 1), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.assign_rooms(uuid[], uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_rooms(uuid[], uuid, uuid, text) TO authenticated, service_role;

COMMIT;
