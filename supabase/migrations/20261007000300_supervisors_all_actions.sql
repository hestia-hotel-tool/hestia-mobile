-- Managers and supervisors may take every room status step themselves.
--
-- 20261006000100 kept the cleaning steps (start, pause, resume, cleaned, DND,
-- refuse, return later…) for the room's attendant, with supervisors acting
-- only "for" them with a reason. The hotel wants managers and supervisors
-- (rooms.inspect) to do them directly. Each attendant step gets the same row
-- for the inspector; room_action() already lets an inspector take any step
-- that has one, without asking for a reason.
--
-- Unchanged: steps still follow the order (no Dirty → Cleaned), a room still
-- needs an attendant assigned before it can be started, the attendant's
-- one-room-in-progress rule still applies to them, and inspecting / sending
-- back stay supervisor steps.
INSERT INTO public.room_status_rules (action, from_state, actor)
SELECT action, from_state, 'inspector'
  FROM public.room_status_rules
 WHERE actor = 'assignee'
ON CONFLICT DO NOTHING;

-- The refusal message names who can do it now.
DO $$
DECLARE
  v_def text;
  v_old text := '''Only the attendant assigned to Room % can do that.''';
BEGIN
  SELECT pg_get_functiondef('public.room_action(uuid, text, text, timestamptz, uuid)'::regprocedure) INTO v_def;
  IF position(v_old IN v_def) > 0 THEN
    EXECUTE replace(v_def, v_old, '''Only Room %''''s attendant or a supervisor can do that.''');
  END IF;
END $$;
