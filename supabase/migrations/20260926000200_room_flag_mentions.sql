-- @mentions in a room's flag reason.
--
-- The Flag Room reason/note can tag staff ("@Stella Kitou", Figma 406-1783).
-- The ids tagged are stored beside the reason, and each newly tagged person
-- gets a `room_flagged` task — so a mention reaches someone rather than being
-- decoration in the text.
--
-- Also restructures `_rooms_notify`: it used to return straight away when
-- nobody was assigned to the room, which would have silently dropped mentions
-- on an unassigned room. Now only the assignee-directed notices need an
-- assignment.

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS flag_mention_ids uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.rooms.flag_mention_ids IS
  'Staff @mentioned in flag_reason. Each newly added id is notified (room_flagged).';

CREATE OR REPLACE FUNCTION public._rooms_notify()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  ra public.room_assignments;
  v_attendant text;
  v_actor text;
  v_old_status text := lower(replace(coalesce(OLD.house_keeping_status, ''), '_', ''));
  v_new_status text := lower(replace(coalesce(NEW.house_keeping_status, ''), '_', ''));
  v_reason text := nullif(btrim(coalesce(NEW.flag_reason, '')), '');
  v_data jsonb := jsonb_build_object('roomId', NEW.id);
  v_newly_flagged boolean := coalesce(NEW.flagged, false) AND NOT coalesce(OLD.flagged, false);
  v_mentioned uuid;
BEGIN
  ra := public._current_room_assignment(NEW.id);

  -- Attendant-directed notices: only when someone is on the room.
  IF ra.id IS NOT NULL THEN
    IF v_newly_flagged THEN
      PERFORM public._notify_user(ra.user_id, NEW.hotel_id, 'room_flagged', 'Room flagged',
        CASE WHEN v_reason IS NOT NULL
          THEN format('Room %s has been flagged: %s', NEW.room_number, v_reason)
          ELSE format('Room %s has been flagged.', NEW.room_number)
        END,
        v_data || jsonb_build_object('reason', v_reason));
    END IF;

    IF lower(coalesce(NEW.priority, '')) = 'high' AND lower(coalesce(OLD.priority, '')) <> 'high' THEN
      PERFORM public._notify_user(ra.user_id, NEW.hotel_id, 'room_priority', 'Priority room',
        format('Room %s is now a priority.', NEW.room_number), v_data);
    END IF;

    IF v_new_status = 'cleaned' AND v_old_status <> 'cleaned' THEN
      SELECT full_name INTO v_attendant FROM public.users WHERE id = ra.user_id;
      PERFORM public._notify_user(ra.assigned_by_id, NEW.hotel_id, 'room_cleaned', 'Room cleaned',
        format('%s cleaned Room %s.', coalesce(v_attendant, 'The attendant'), NEW.room_number),
        v_data || jsonb_build_object('attendantId', ra.user_id));
    END IF;

    IF v_new_status = 'dirty' AND v_old_status IN ('cleaned', 'inspected') THEN
      PERFORM public._notify_user(ra.user_id, NEW.hotel_id, 'room_rejected', 'Room sent back',
        format('Room %s was sent back — please clean it again.', NEW.room_number), v_data);
    END IF;
  END IF;

  -- Newly @mentioned staff on a flagged room: those not already tagged, and
  -- not the attendant (who has just been told above).
  IF coalesce(NEW.flagged, false) AND cardinality(NEW.flag_mention_ids) > 0 THEN
    SELECT full_name INTO v_actor FROM public.users WHERE id = auth.uid();
    FOR v_mentioned IN
      SELECT DISTINCT m FROM unnest(NEW.flag_mention_ids) AS m
       WHERE NOT (m = ANY (CASE WHEN coalesce(OLD.flagged, false) THEN OLD.flag_mention_ids ELSE '{}'::uuid[] END))
         AND (ra.id IS NULL OR NOT (v_newly_flagged AND m = ra.user_id))
    LOOP
      PERFORM public._notify_user(v_mentioned, NEW.hotel_id, 'room_flagged', 'Tagged on a flagged room',
        format('%s tagged you on Room %s%s', coalesce(v_actor, 'Someone'), NEW.room_number,
          CASE WHEN v_reason IS NOT NULL THEN ': ' || v_reason ELSE '.' END),
        v_data || jsonb_build_object('reason', v_reason, 'mention', true));
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rooms_notify ON public.rooms;
CREATE TRIGGER rooms_notify
  AFTER UPDATE OF flagged, flag_reason, flag_mention_ids, priority, house_keeping_status ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public._rooms_notify();
