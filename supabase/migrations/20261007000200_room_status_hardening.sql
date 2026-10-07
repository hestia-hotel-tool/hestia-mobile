-- Hardening after review of 20261006000100 (room status state machine).
--
-- 1. The internal helpers are SECURITY DEFINER and were callable through the
--    API by anyone with the publishable key — `_housekeeping_new_day` could
--    reset any hotel's rooms. Only the cron job and room_action call them.
-- 2. room_action: a repeated request id returned the snapshot of whatever room
--    id came with it, before the hotel check. Only the original request's own
--    room, in the caller's hotel, is returned now.
-- 3. The overnight reset (Cleaned/Inspected → Dirty by the system) was read by
--    `_rooms_notify` as a send-back, and every stayover's attendant was told
--    "Room sent back — please clean it again" at the start of the day.
-- 4. A handover paused the room through `_rooms_notify_activity`, so the old
--    attendant got "X paused Room" on top of "Room handed over".
-- 5. Handing a room to someone on the *other* shift inserts a second
--    assignment (the app upserts per room and shift), so the transfer never
--    ran and the old attendant's clock kept going. A new assignment on a room
--    being cleaned by someone else now pauses it and tells them.

-- 1 -------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public._housekeeping_new_day(uuid, date) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public._room_snapshot(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public._process_housekeeping_rollover() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public._process_room_started_notices() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public._room_assignments_transfer() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public._room_state(text, timestamptz, timestamptz, text, timestamptz) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public._room_action_label(text) FROM public, anon, authenticated;

-- 2 -------------------------------------------------------------------------
DO $$
DECLARE
  v_def text;
  v_old text := '    IF NOT FOUND THEN
      RETURN public._room_snapshot(p_room_id);
    END IF;';
  v_new text := '    IF NOT FOUND THEN
      -- A retry: answer only for the original request''s room, in this hotel.
      IF EXISTS (
        SELECT 1 FROM public.room_action_requests q JOIN public.rooms ro ON ro.id = q.room_id
         WHERE q.request_id = p_request_id AND q.room_id = p_room_id AND q.user_id = v_uid
           AND ro.hotel_id = public.auth_hotel_id()
      ) THEN
        RETURN public._room_snapshot(p_room_id);
      END IF;
      RAISE EXCEPTION ''Room not found.'' USING ERRCODE = ''P0002'';
    END IF;';
BEGIN
  SELECT pg_get_functiondef('public.room_action(uuid, text, text, timestamptz, uuid)'::regprocedure) INTO v_def;
  IF position('A retry: answer only' IN v_def) = 0 THEN
    IF position(v_old IN v_def) = 0 THEN RAISE EXCEPTION 'room_action: idempotency block not found'; END IF;
    EXECUTE replace(v_def, v_old, v_new);
  END IF;
END $$;

-- 3 -------------------------------------------------------------------------
DO $$
DECLARE
  v_def text;
  v_old text := 'IF v_new_status = ''dirty'' AND v_old_status IN (''cleaned'', ''inspected'') THEN';
BEGIN
  SELECT pg_get_functiondef('public._rooms_notify()'::regprocedure) INTO v_def;
  IF position('AND auth.uid() IS NOT NULL THEN' IN v_def) = 0 THEN
    IF position(v_old IN v_def) = 0 THEN RAISE EXCEPTION '_rooms_notify: send-back block not found'; END IF;
    -- A person sent it back; the new-day reset is not a send-back.
    EXECUTE replace(v_def, v_old,
      'IF v_new_status = ''dirty'' AND v_old_status IN (''cleaned'', ''inspected'') AND auth.uid() IS NOT NULL THEN');
  END IF;
END $$;

-- 4 -------------------------------------------------------------------------
DO $$
DECLARE
  v_def text;
  v_old text := '  IF NEW.paused_at IS NOT NULL AND OLD.paused_at IS NULL AND ra.id IS NOT NULL THEN';
BEGIN
  SELECT pg_get_functiondef('public._rooms_notify_activity()'::regprocedure) INTO v_def;
  IF position('hestia.handover' IN v_def) = 0 THEN
    IF position(v_old IN v_def) = 0 THEN RAISE EXCEPTION '_rooms_notify_activity: pause block not found'; END IF;
    EXECUTE replace(v_def, v_old,
      '  IF NEW.paused_at IS NOT NULL AND OLD.paused_at IS NULL AND ra.id IS NOT NULL' || chr(10) ||
      '     AND coalesce(current_setting(''hestia.handover'', true), '''') <> ''on'' THEN');
  END IF;
END $$;

DO $$
DECLARE
  v_def text;
  v_old text := '      PERFORM set_config(''hestia.room_action'', ''on'', true);
      UPDATE public.rooms SET paused_at = now() WHERE id = ro.id;';
BEGIN
  SELECT pg_get_functiondef('public._room_assignments_transfer()'::regprocedure) INTO v_def;
  IF position('hestia.handover' IN v_def) = 0 THEN
    IF position(v_old IN v_def) = 0 THEN RAISE EXCEPTION '_room_assignments_transfer: pause block not found'; END IF;
    EXECUTE replace(v_def, v_old,
      '      PERFORM set_config(''hestia.room_action'', ''on'', true);
      PERFORM set_config(''hestia.handover'', ''on'', true);
      UPDATE public.rooms SET paused_at = now() WHERE id = ro.id;
      PERFORM set_config(''hestia.handover'', '''', true);');
  END IF;
END $$;

-- 5 -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._room_assignments_transfer_on_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  ro public.rooms%ROWTYPE;
  v_old_user uuid;
  v_mins integer;
  v_new text;
BEGIN
  SELECT * INTO ro FROM public.rooms WHERE id = NEW.room_id FOR UPDATE;
  -- Only a room someone else is cleaning right now is handed over.
  IF ro.house_keeping_status IS DISTINCT FROM 'InProgress' OR ro.paused_at IS NOT NULL
     OR ro.refuse_service_at IS NOT NULL OR ro.return_later_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT ra.user_id INTO v_old_user FROM public.room_assignments ra
   WHERE ra.room_id = NEW.room_id AND ra.user_id IS DISTINCT FROM NEW.user_id
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
   WHERE room_id = ro.id AND user_id = v_old_user;
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
REVOKE ALL ON FUNCTION public._room_assignments_transfer_on_insert() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS room_assignments_transfer_on_insert ON public.room_assignments;
CREATE TRIGGER room_assignments_transfer_on_insert
  BEFORE INSERT ON public.room_assignments
  FOR EACH ROW EXECUTE FUNCTION public._room_assignments_transfer_on_insert();
