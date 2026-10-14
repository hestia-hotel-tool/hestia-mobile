-- Send back / reopen: comment and photos, and the inspector is told.
--
-- 1. room_action takes p_photo_urls (optional, at most 8 web URLs). On a
--    send-back they are kept on the room-history entry and given to the
--    attendant's "sent back" notice (data.photoUrls, data.reason).
-- 2. Reopening an Inspected room also notifies the supervisor who passed the
--    inspection (from the audit log), with the reason, comment and photos.
--
-- The new parameter is last and defaulted, so callers that send five named
-- arguments (older app builds) keep working. The five-argument function is
-- dropped first: two overloads would make those calls ambiguous.

BEGIN;

DROP FUNCTION IF EXISTS public.room_action(uuid, text, text, timestamptz, uuid);

CREATE OR REPLACE FUNCTION public.room_action(p_room_id uuid, p_action text, p_reason text DEFAULT NULL::text, p_until timestamp with time zone DEFAULT NULL::timestamp with time zone, p_request_id uuid DEFAULT NULL::uuid, p_photo_urls text[] DEFAULT NULL::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

REVOKE ALL ON FUNCTION public.room_action(uuid, text, text, timestamptz, uuid, text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.room_action(uuid, text, text, timestamptz, uuid, text[]) TO authenticated, service_role;

COMMIT;
