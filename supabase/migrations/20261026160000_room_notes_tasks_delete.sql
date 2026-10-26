-- Room notes and tasks: saved, and deletable (client request, 2026-10-26).
--
-- Who may delete:
--   the author, always — their own note or task;
--   anyone with rooms.notes.manage (supervisors and managers: full_access,
--   ops_senior) — anyone's, to keep a room's instructions correct.
-- Every deletion is recorded in the room's History (activity_logs, which the
-- Room Detail timeline reads), with who removed it: notes by their existing
-- audit trigger, tasks by room_task_delete().
--
-- Tasks were never saved: Room Detail kept an added task in screen state (a
-- "persist the added task" TODO), so it vanished when the room was reopened.
-- They now live in room_tasks. The standing task a room type shows when it has
-- none ("Deep clean bathroom…") is derived in the app, not a row, and stays
-- undeletable.

BEGIN;

-- 1. Permission -------------------------------------------------------------------
INSERT INTO public.permissions (name, description)
VALUES ('rooms.notes.manage', 'Delete anyone''s notes and tasks on a room')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.roles r JOIN public.permissions p ON p.name = 'rooms.notes.manage'
 WHERE r.key IN ('full_access', 'ops_senior')
ON CONFLICT DO NOTHING;

-- 2. Tasks --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_tasks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id       uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id        uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  text           text NOT NULL CHECK (char_length(btrim(text)) BETWEEN 1 AND 1000),
  created_by_id  uuid REFERENCES public.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS room_tasks_room_idx ON public.room_tasks (room_id, created_at);

ALTER TABLE public.room_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Hotel users read room tasks" ON public.room_tasks;
CREATE POLICY "Hotel users read room tasks" ON public.room_tasks
  FOR SELECT TO authenticated USING (hotel_id = (SELECT public.auth_hotel_id()));
DROP POLICY IF EXISTS "Staff add room tasks" ON public.room_tasks;
CREATE POLICY "Staff add room tasks" ON public.room_tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    hotel_id = (SELECT public.auth_hotel_id())
    AND created_by_id = (SELECT auth.uid())
    AND public.auth_has_permission('rooms.notes.create')
  );
-- No UPDATE / DELETE policy: deletion goes through room_task_delete().
REVOKE ALL ON public.room_tasks FROM anon;

-- 3. Delete a note --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.room_note_delete(p_note_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_note public.room_notes%ROWTYPE;
BEGIN
  SELECT * INTO v_note FROM public.room_notes WHERE id = p_note_id AND hotel_id = public.auth_hotel_id();
  IF v_uid IS NULL OR v_note.id IS NULL THEN
    RAISE EXCEPTION 'Note not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_note.created_by_id IS DISTINCT FROM v_uid AND NOT public.auth_has_permission('rooms.notes.manage') THEN
    RAISE EXCEPTION 'Only the person who wrote this note or a supervisor can delete it.' USING ERRCODE = '42501';
  END IF;
  -- The room_notes audit trigger records it in History ("Deleted a note"); a
  -- second entry here would show the deletion twice.
  DELETE FROM public.room_notes WHERE id = v_note.id;
END;
$$;
REVOKE ALL ON FUNCTION public.room_note_delete(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.room_note_delete(uuid) TO authenticated;

-- 4. Delete a task ----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.room_task_delete(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_task public.room_tasks%ROWTYPE;
BEGIN
  SELECT * INTO v_task FROM public.room_tasks WHERE id = p_task_id AND hotel_id = public.auth_hotel_id();
  IF v_uid IS NULL OR v_task.id IS NULL THEN
    RAISE EXCEPTION 'Task not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_task.created_by_id IS DISTINCT FROM v_uid AND NOT public.auth_has_permission('rooms.notes.manage') THEN
    RAISE EXCEPTION 'Only the person who added this task or a supervisor can delete it.' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.room_tasks WHERE id = v_task.id;
  INSERT INTO public.activity_logs (user_id, hotel_id, action, table_name, record_id, room_id, operation)
  VALUES (v_uid, v_task.hotel_id, format('Deleted a task: "%s"', left(v_task.text, 120)), 'room_tasks', v_task.id, v_task.room_id, 'DELETE');
END;
$$;
REVOKE ALL ON FUNCTION public.room_task_delete(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.room_task_delete(uuid) TO authenticated;

COMMIT;
