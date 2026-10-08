-- "Rooms back in the pool" notices say which rooms and which shift.
--
-- The shift-end rollover told the assigner "3 unfinished PM rooms from the PM
-- shift are now unassigned." with no data, so the Task screen had nothing to
-- open. The notice now has its own type, `room_pool`, and carries the shift
-- and the freed room ids; the app shows "View Rooms", opening the Rooms list
-- on that shift filtered to unassigned rooms.
DO $$
DECLARE
  v_def text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef('public._process_housekeeping_rollover()'::regprocedure) INTO v_def;
  IF position('room_pool' IN v_def) > 0 THEN
    RETURN;
  END IF;
  v_new := replace(v_def, 'RETURNING ra.assigned_by_id', 'RETURNING ra.assigned_by_id, ra.room_id');
  v_new := replace(v_new,
    'SELECT assigned_by_id, count(*) AS n FROM freed WHERE assigned_by_id IS NOT NULL GROUP BY assigned_by_id',
    'SELECT assigned_by_id, count(*) AS n, array_agg(room_id) AS room_ids FROM freed WHERE assigned_by_id IS NOT NULL GROUP BY assigned_by_id');
  v_new := replace(v_new,
    'PERFORM public._notify_user(a.assigned_by_id, s.hotel_id, ''room_assignment'', ''Rooms back in the pool'',',
    'PERFORM public._notify_user(a.assigned_by_id, s.hotel_id, ''room_pool'', ''Rooms back in the pool'',');
  v_new := replace(v_new,
    '          ''{}''::jsonb);',
    '          jsonb_build_object(''shift'', s.name, ''roomIds'', to_jsonb(a.room_ids)));');
  IF position('room_pool' IN v_new) = 0 OR position('roomIds' IN v_new) = 0 OR position('ra.room_id' IN v_new) = 0 THEN
    RAISE EXCEPTION '_process_housekeeping_rollover: a patch point was not found';
  END IF;
  EXECUTE v_new;
END $$;

REVOKE ALL ON FUNCTION public._process_housekeeping_rollover() FROM public, anon, authenticated;

-- Last night's notices (sent before this) become the new type, with the
-- shift read from their text, so they get the button too.
UPDATE public.notifications
   SET type = 'room_pool',
       data = coalesce(data, '{}'::jsonb)
              || jsonb_build_object('shift', substring(body FROM 'from the (\w+) shift'))
 WHERE type = 'room_assignment' AND title = 'Rooms back in the pool';
