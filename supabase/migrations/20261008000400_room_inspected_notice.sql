-- "Room Inspected" — Figma 4443:375: a notice when a room is inspected,
-- "Marty Inspected Room 202", to the attendant whose work it was and to the
-- person who assigned the room — never to whoever inspected it. Raised by the
-- rooms trigger, so it fires however the room got to Inspected.
DO $$
DECLARE
  v_def text;
  v_anchor text := '    IF v_new_status = ''dirty'' AND v_old_status IN (''cleaned'', ''inspected'') AND auth.uid() IS NOT NULL THEN';
  v_block text := '    IF v_new_status = ''inspected'' AND v_old_status <> ''inspected'' AND auth.uid() IS NOT NULL THEN
      SELECT full_name INTO v_actor FROM public.users WHERE id = auth.uid();
      IF ra.user_id IS DISTINCT FROM auth.uid() THEN
        PERFORM public._notify_user(ra.user_id, NEW.hotel_id, ''room_inspected'', ''Room Inspected'',
          format(''%s Inspected Room %s'', coalesce(v_actor, ''A supervisor''), NEW.room_number),
          v_data || jsonb_build_object(''inspectorId'', auth.uid()));
      END IF;
      IF ra.assigned_by_id IS DISTINCT FROM auth.uid() AND ra.assigned_by_id IS DISTINCT FROM ra.user_id THEN
        PERFORM public._notify_user(ra.assigned_by_id, NEW.hotel_id, ''room_inspected'', ''Room Inspected'',
          format(''%s Inspected Room %s'', coalesce(v_actor, ''A supervisor''), NEW.room_number),
          v_data || jsonb_build_object(''inspectorId'', auth.uid(), ''attendantId'', ra.user_id));
      END IF;
    END IF;

';
BEGIN
  SELECT pg_get_functiondef('public._rooms_notify()'::regprocedure) INTO v_def;
  IF position('room_inspected' IN v_def) > 0 THEN
    RETURN;
  END IF;
  IF position(v_anchor IN v_def) = 0 THEN
    RAISE EXCEPTION '_rooms_notify: send-back block not found';
  END IF;
  EXECUTE replace(v_def, v_anchor, v_block || v_anchor);
END $$;
