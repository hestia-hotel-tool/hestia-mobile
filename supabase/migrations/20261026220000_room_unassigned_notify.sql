-- Tell attendants when a room is taken off them (tester feedback, 2026-10-26:
-- "Stella unassigned a room Mei was working in. Mei did not receive any
-- notification, inside or outside the app").
--
-- Assigning notified ("You have been assigned to Room …"); taking a room away
-- did not:
--   unassigned (row deleted)       nothing at all;
--   reassigned to someone else     only when cleaning had started
--                                  ("Room handed over"), so a room not yet
--                                  started silently left the list.
-- Now both send 'room_unassigned' to the person removed — push and in-app.
-- Several rooms taken in one go are one notification. The automatic
-- end-of-shift release (no signed-in actor) does not notify: the shift is
-- over, and the leaders already get 'room_pool'. As everywhere, nobody is
-- notified of their own action (_notify_user).

BEGIN;

-- 1. Unassigned --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._room_assignments_unassigned_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  g record;
  v_actor text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT full_name INTO v_actor FROM public.users WHERE id = auth.uid();
  FOR g IN
    SELECT o.user_id, o.hotel_id,
           array_agg(o.room_id ORDER BY r.room_number) AS room_ids,
           string_agg(r.room_number, ', ' ORDER BY r.room_number) AS numbers,
           count(*) AS n,
           min(s.name) AS shift
      FROM old_rows o
      JOIN public.rooms r ON r.id = o.room_id
      LEFT JOIN public.shifts s ON s.id = o.shift_id
     WHERE o.user_id IS NOT NULL
     GROUP BY o.user_id, o.hotel_id
  LOOP
    PERFORM public._notify_user(
      g.user_id, g.hotel_id, 'room_unassigned', 'Room unassigned',
      format('You are no longer assigned to %s %s%s.%s',
        CASE WHEN g.n = 1 THEN 'Room' ELSE 'Rooms' END, g.numbers,
        CASE WHEN g.shift IS NOT NULL THEN format(' (%s shift)', g.shift) ELSE '' END,
        CASE WHEN v_actor IS NOT NULL THEN format(' %s took you off %s.', v_actor, CASE WHEN g.n = 1 THEN 'it' ELSE 'them' END) ELSE '' END),
      CASE WHEN g.n = 1 THEN jsonb_build_object('roomId', g.room_ids[1])
           ELSE jsonb_build_object('roomIds', to_jsonb(g.room_ids)) END
    );
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS room_assignments_unassigned_notify ON public.room_assignments;
CREATE TRIGGER room_assignments_unassigned_notify
  AFTER DELETE ON public.room_assignments
  REFERENCING OLD TABLE AS old_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public._room_assignments_unassigned_notify();

-- 2. Reassigned before cleaning started --------------------------------------------
CREATE OR REPLACE FUNCTION public._room_assignments_transfer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

COMMIT;
