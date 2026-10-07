-- Managers and supervisors switch a room to any state; only they set promise times.
--
-- 1. Any state, any order, for rooms.inspect holders (managers, supervisors):
--    In Progress, Cleaned and Inspected from every other state — Dirty →
--    Inspected included — and Dirty from every state (a new `reset` takes an
--    in-progress or paused room back with its clock cleared; Cleaned and
--    Inspected still go back through `send_back`, with a reason). The guest
--    situations (DND, Refuse, Return Later) widen to every state that still
--    needs service; a Cleaned or Inspected room keeps refusing them
--    ("nothing left to service today", 20260929000400).
--    Attendants are unchanged: their steps, in order.
-- 2. Inspected without a Cleaned first now completes the assignment, and
--    clears a pause the room was left in.
-- 3. Promise time: set or removed only by rooms.inspect holders. Front Office
--    and attendants no longer change it; the system still clears it when a
--    room is finished.

-- 1 -------------------------------------------------------------------------
INSERT INTO public.room_status_rules (action, from_state, actor) VALUES
  ('start', 'cleaned', 'inspector'),
  ('start', 'inspected', 'inspector'),
  ('start', 'dnd', 'inspector'),
  ('start', 'refused', 'inspector'),
  ('clean', 'dirty', 'inspector'),
  ('clean', 'paused', 'inspector'),
  ('clean', 'inspected', 'inspector'),
  ('clean', 'dnd', 'inspector'),
  ('clean', 'refused', 'inspector'),
  ('clean', 'return_later', 'inspector'),
  ('inspect', 'dirty', 'inspector'),
  ('inspect', 'in_progress', 'inspector'),
  ('inspect', 'paused', 'inspector'),
  ('inspect', 'dnd', 'inspector'),
  ('inspect', 'refused', 'inspector'),
  ('inspect', 'return_later', 'inspector'),
  ('reset', 'in_progress', 'inspector'),
  ('reset', 'paused', 'inspector'),
  ('dnd', 'in_progress', 'inspector'),
  ('dnd', 'paused', 'inspector'),
  ('dnd', 'refused', 'inspector'),
  ('refuse', 'paused', 'inspector'),
  ('refuse', 'return_later', 'inspector'),
  ('return_later', 'dnd', 'inspector'),
  ('return_later', 'refused', 'inspector')
ON CONFLICT DO NOTHING;

-- 1–2: room_action effects, patched in place on the live definition.
DO $$
DECLARE
  v_def text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef('public.room_action(uuid, text, text, timestamptz, uuid)'::regprocedure) INTO v_def;
  IF position('WHEN ''reset'' THEN' IN v_def) > 0 THEN
    RETURN;
  END IF;
  v_new := replace(v_def,
'    WHEN ''inspect'' THEN
      UPDATE public.rooms SET house_keeping_status = ''Inspected'' WHERE id = r.id;
    WHEN ''send_back'' THEN',
'    WHEN ''inspect'' THEN
      UPDATE public.rooms SET house_keeping_status = ''Inspected'', paused_at = NULL WHERE id = r.id;
    WHEN ''reset'' THEN
      UPDATE public.rooms SET house_keeping_status = ''Dirty'', paused_at = NULL WHERE id = r.id;
      UPDATE public.rooms SET cleaning_elapsed_seconds = 0, cleaning_started_at = NULL,
             in_progress_started_at = NULL, started_notified_at = NULL
       WHERE id = r.id;
    WHEN ''send_back'' THEN');
  v_new := replace(v_new, '        WHEN ''inspect'' THEN work_status', '        WHEN ''inspect'' THEN ''completed''');
  v_new := replace(v_new, 'WHEN p_action IN (''undo_start'', ''send_back'') THEN NULL',
                          'WHEN p_action IN (''undo_start'', ''send_back'', ''reset'') THEN NULL');
  v_new := replace(v_new,
'        WHEN p_action = ''clean'' THEN now()
        WHEN p_action IN (''start'', ''undo_start'', ''send_back'') THEN NULL',
'        WHEN p_action = ''clean'' THEN now()
        WHEN p_action = ''inspect'' THEN coalesce(end_time, now())
        WHEN p_action IN (''start'', ''undo_start'', ''send_back'', ''reset'') THEN NULL');
  IF v_new = v_def OR position('WHEN ''reset'' THEN' IN v_new) = 0
     OR position('WHEN ''inspect'' THEN ''completed''' IN v_new) = 0 THEN
    RAISE EXCEPTION 'room_action: a patch point was not found';
  END IF;
  EXECUTE v_new;
END $$;

DO $$
DECLARE v_def text;
BEGIN
  SELECT pg_get_functiondef('public._room_action_label(text)'::regprocedure) INTO v_def;
  IF position('''reset''' IN v_def) = 0 THEN
    EXECUTE replace(v_def, 'WHEN ''send_back'' THEN ''Send back''',
                           'WHEN ''send_back'' THEN ''Send back'' WHEN ''reset'' THEN ''Dirty''');
  END IF;
END $$;

-- 3 -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._rooms_promise_requires_supervisor()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  -- System jobs and the clearing on Cleaned/Inspected (later trigger) pass.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.promise_time_at IS DISTINCT FROM OLD.promise_time_at
     AND NOT public.auth_has_permission('rooms.inspect') THEN
    RAISE EXCEPTION 'Only a manager or supervisor can set or remove a promise time.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._rooms_promise_requires_supervisor() FROM public, anon, authenticated;
DROP TRIGGER IF EXISTS rooms_02_promise_requires_supervisor ON public.rooms;
CREATE TRIGGER rooms_02_promise_requires_supervisor
  BEFORE UPDATE OF promise_time_at ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public._rooms_promise_requires_supervisor();
