-- Engineering fixes (client feedback, 2026-11-20):
--
-- 1. "As director of engineering I cannot complete the checklist — it says
--    assign room first; it still does not work after I assign the room."
-- 4. "Cannot change status in engineering (Rooms)."
--    Both: the round and the checklist looked for the room's technician on the
--    hotel's *current* shift only, while the app assigns on the shift picked
--    in its AM/PM toggle. Rooms assigned on AM after 14:00 had "no
--    technician". Now the technician is found as housekeeping finds the
--    attendant (_current_room_assignment): any shift, the caller's own row
--    first, else the newest. Engineering rows are cleared at every shift end,
--    so this is today's assignment.
--    And a Director / Supervisor ticking the checklist starts (or resumes) the
--    round for the technician — recorded as done for them, and they are told —
--    instead of "start it from the status menu first".
-- 3. "Task notifications in engineering do not work." The round sent nothing
--    but "Changed for you". Now the leads hear when a technician starts,
--    pauses or checks a room (eng_room_started / _paused / _checked), and the
--    technician hears when a lead makes their room a priority
--    (eng_room_priority). Nobody is told of their own action (_notify_user).

BEGIN;

-- The room's assignment in one department: the caller's own first, else the newest.
CREATE OR REPLACE FUNCTION public._department_room_assignment(p_room_id uuid, p_department_id uuid)
RETURNS public.room_assignments
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ra.*
    FROM public.room_assignments ra
   WHERE ra.room_id = p_room_id
     AND ra.department_id = p_department_id
   ORDER BY (ra.user_id = auth.uid()) DESC NULLS LAST,
            ra.updated_at DESC NULLS LAST,
            ra.created_at DESC NULLS LAST
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public._department_room_assignment(uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._room_inspection_for_write(p_room_id uuid, p_department text, OUT inspection_id uuid, OUT assignee uuid, OUT is_lead boolean, OUT room_number text)
 RETURNS record
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_hotel uuid := public.auth_hotel_id();
  v_dept uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;
  IF p_department <> 'engineering' THEN
    RAISE EXCEPTION 'Only Engineering keeps a room inspection.' USING ERRCODE = '22023';
  END IF;
  v_dept := public._department_id(p_department);

  SELECT r.room_number INTO room_number FROM public.rooms r WHERE r.id = p_room_id AND r.hotel_id = v_hotel;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found.' USING ERRCODE = 'P0002';
  END IF;

  is_lead := public.auth_has_permission(public._assign_permission(v_dept));
  assignee := (public._department_room_assignment(p_room_id, v_dept)).user_id;

  IF assignee IS DISTINCT FROM v_uid AND NOT is_lead THEN
    IF assignee IS NULL THEN
      RAISE EXCEPTION 'Room % has no technician this shift.', room_number USING ERRCODE = '42501';
    END IF;
    RAISE EXCEPTION 'Room % is another technician''s.', room_number USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.room_inspections (hotel_id, room_id, department_id, service_day)
  VALUES (v_hotel, p_room_id, v_dept, public._hotel_service_day(v_hotel))
  ON CONFLICT (room_id, department_id, service_day) DO UPDATE SET updated_at = now()
  RETURNING id INTO inspection_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.room_department_action(p_room_id uuid, p_department text, p_action text, p_reason text DEFAULT NULL::text)
 RETURNS room_department_states
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    -- The room's technician hears it is now (or no longer) a priority.
    v_assignee := (public._department_room_assignment(p_room_id, v_dept)).user_id;
    IF v_assignee IS NOT NULL THEN
      PERFORM public._notify_user(v_assignee, v_hotel, 'eng_room_priority',
        CASE WHEN p_action = 'priority_on' THEN 'Priority room' ELSE 'Priority removed' END,
        CASE WHEN p_action = 'priority_on'
          THEN format('Room %s is an engineering priority.', v_room.room_number)
          ELSE format('Room %s is no longer an engineering priority.', v_room.room_number) END,
        jsonb_build_object('roomId', p_room_id));
    END IF;
    RETURN v_state;
  END IF;

  -- The technician holding the room this shift.
  v_assignee := (public._department_room_assignment(p_room_id, v_dept)).user_id;

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

  -- The technician's own moves, to the leads (Tasks): started, paused, checked.
  IF NOT v_override AND p_action IN ('start', 'pause', 'check') THEN
    SELECT full_name INTO v_me FROM public.users WHERE id = v_uid;
    PERFORM public._notify_user(
      l.id, v_hotel,
      CASE p_action WHEN 'start' THEN 'eng_room_started' WHEN 'pause' THEN 'eng_room_paused' ELSE 'eng_room_checked' END,
      CASE p_action WHEN 'start' THEN 'Check started' WHEN 'pause' THEN 'Check paused' ELSE 'Room checked' END,
      format('%s %s Room %s.', coalesce(v_me, 'A technician'),
        CASE p_action WHEN 'start' THEN 'started checking' WHEN 'pause' THEN 'paused the check of' ELSE 'finished checking' END,
        v_room.room_number),
      jsonb_build_object('roomId', p_room_id))
      FROM public._engineering_lead_ids(v_hotel) AS l(id);
  END IF;

  IF v_override AND v_assignee IS NOT NULL THEN
    SELECT full_name INTO v_me FROM public.users WHERE id = v_uid;
    PERFORM public._notify_user(v_assignee, v_hotel, 'room_status_override', 'Changed for you',
      format('%s: Room %s — %s. %s', coalesce(v_me, 'A supervisor'), v_room.room_number, lower(v_label), v_reason),
      jsonb_build_object('roomId', p_room_id));
  END IF;

  RETURN v_state;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_room_inspection_result(p_room_id uuid, p_department text, p_item_id uuid, p_result text, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  w record;
  v_status text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
BEGIN
  IF p_result IS NOT NULL AND p_result NOT IN ('good', 'issue') THEN
    RAISE EXCEPTION 'Unknown result %.', p_result USING ERRCODE = '22023';
  END IF;
  w := public._room_inspection_for_write(p_room_id, p_department);

  IF NOT EXISTS (
    SELECT 1 FROM public.inspection_items
     WHERE id = p_item_id AND hotel_id = public.auth_hotel_id()
       AND department_id = public._department_id(p_department) AND active
  ) THEN
    RAISE EXCEPTION 'Checklist item not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Doing the checklist is doing the check: the first mark starts or resumes
  -- the round.
  SELECT status INTO v_status FROM public.room_department_states
   WHERE room_id = p_room_id AND department_id = public._department_id(p_department);
  v_status := coalesce(v_status, 'unchecked');
  -- A lead doing the checklist does it for the room's technician (who is
  -- told); with no technician, room_department_action asks for one.
  IF v_status = 'unchecked' THEN
    PERFORM public.room_department_action(p_room_id, p_department, 'start',
      CASE WHEN w.assignee IS DISTINCT FROM v_uid THEN 'Checklist done by a supervisor' END);
  ELSIF v_status = 'paused' THEN
    PERFORM public.room_department_action(p_room_id, p_department, 'resume',
      CASE WHEN w.assignee IS DISTINCT FROM v_uid THEN 'Checklist done by a supervisor' END);
  END IF;

  IF p_result IS NULL THEN
    DELETE FROM public.room_inspection_results
     WHERE inspection_id = w.inspection_id AND item_id = p_item_id;
  ELSE
    INSERT INTO public.room_inspection_results (inspection_id, item_id, result, note, updated_by)
    VALUES (w.inspection_id, p_item_id, p_result, CASE WHEN p_result = 'issue' THEN v_note END, v_uid)
    ON CONFLICT (inspection_id, item_id) DO UPDATE
      SET result = EXCLUDED.result,
          note = EXCLUDED.note,
          -- A ticket already raised stays linked while the item is still an issue.
          ticket_id = CASE WHEN EXCLUDED.result = 'issue' THEN room_inspection_results.ticket_id END,
          updated_by = v_uid,
          updated_at = now();
  END IF;
END;
$function$;

COMMIT;
