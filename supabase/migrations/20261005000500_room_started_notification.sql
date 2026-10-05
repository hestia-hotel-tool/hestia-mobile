-- "Maria started cleaning 202" — Figma 4378:174.
--
-- The Tasks list has a row for an attendant starting a room, and nothing ever
-- sent one. This adds it to `_rooms_notify_activity()`: when a room goes into
-- In Progress, whoever assigned it hears about it, as they already do for a
-- pause. Not on a resume — coming back from a pause is the same cleaning, and
-- the pause row already told them it stopped.
--
-- Spliced into the live definition just above the Promise time block, so the
-- rest of the function stays exactly what is deployed.
DO $$
DECLARE
  v_def text;
  v_marker text := '  -- Promise time — as before: the attendant.';
BEGIN
  SELECT pg_get_functiondef('public._rooms_notify_activity()'::regprocedure) INTO v_def;
  IF position('room_started' IN v_def) > 0 THEN
    RETURN; -- already applied
  END IF;
  IF position(v_marker IN v_def) = 0 THEN
    RAISE EXCEPTION '_rooms_notify_activity(): Promise time marker not found';
  END IF;
  v_def := replace(v_def, v_marker,
'  -- Started cleaning — the assigner, unless they started it themselves.
  IF NEW.house_keeping_status = ''InProgress'' AND OLD.house_keeping_status IS DISTINCT FROM ''InProgress''
     AND OLD.paused_at IS NULL AND ra.id IS NOT NULL
     AND ra.assigned_by_id IS DISTINCT FROM auth.uid() THEN
    PERFORM public._notify_user(ra.assigned_by_id, NEW.hotel_id, ''room_started'', ''Cleaning started'',
      format(''%s started cleaning Room %s.'', coalesce(v_actor, ''Someone''), NEW.room_number), v_data);
  END IF;

' || v_marker);
  EXECUTE v_def;
END
$$;
