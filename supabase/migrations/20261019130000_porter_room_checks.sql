-- Porter rounds: a porter checks each room (rubbish, items left behind) and
-- marks it Checked — Figma 3859:1041.
--
-- This is the porter's own state for a room, separate from the room's
-- cleaning status: a porter marking 301 Checked must not touch the
-- attendant's Dirty / Cleaned, and the attendant's work must not clear the
-- porter's mark. So it has its own table:
--
--   one row per room, shift and service day; no row = UnChecked (the default).
--   status: in_progress | paused | checked
--
-- A new service day (or shift) starts UnChecked by itself — nothing to reset.
-- Writes go only through porter_check_action(), gated by rooms.porter.check
-- (porters; leadership may correct a mark).

BEGIN;

-- 1. Permission ---------------------------------------------------------------
INSERT INTO public.permissions (name, description)
VALUES ('rooms.porter.check', 'Mark a room checked on the porter round')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.roles r
  JOIN public.permissions p ON p.name = 'rooms.porter.check'
 WHERE r.key IN ('hk_houseman', 'full_access')
ON CONFLICT DO NOTHING;

-- 2. Table ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.porter_room_checks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id       uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  shift_id      uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  service_day   date NOT NULL,
  status        text NOT NULL CHECK (status IN ('in_progress', 'paused', 'checked')),
  user_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  started_at    timestamptz,
  paused_at     timestamptz,
  checked_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, shift_id, service_day)
);
CREATE INDEX IF NOT EXISTS porter_room_checks_hotel_day_idx
  ON public.porter_room_checks (hotel_id, service_day, shift_id);

ALTER TABLE public.porter_room_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Hotel users can read porter checks" ON public.porter_room_checks;
CREATE POLICY "Hotel users can read porter checks" ON public.porter_room_checks
  FOR SELECT USING (hotel_id = (SELECT public.auth_hotel_id()));
-- No write policies: porter_check_action() is the only way in.

-- Realtime, so porters and supervisors see each other's marks at once.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'porter_room_checks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.porter_room_checks;
  END IF;
END $$;
ALTER TABLE public.porter_room_checks REPLICA IDENTITY FULL;

-- 3. The action ----------------------------------------------------------------
-- p_action:  start  (UnChecked / Paused -> In Progress)
--            pause  (In Progress -> Paused)
--            resume (Paused -> In Progress)
--            check  (any -> Checked)
--            uncheck(any -> UnChecked: the row is removed)
-- p_shift:   'AM' | 'PM' — the shift being worked (the screen's shift).
-- Returns the room's porter state: {room_id, status, user_id, checked_at, …}
-- or {room_id, status: 'unchecked'}.
CREATE OR REPLACE FUNCTION public.porter_check_action(p_room_id uuid, p_action text, p_shift text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_hotel uuid := public.auth_hotel_id();
  v_room  public.rooms%ROWTYPE;
  v_shift uuid;
  v_day   date;
  v_row   public.porter_room_checks%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.auth_has_permission('rooms.porter.check') THEN
    RAISE EXCEPTION 'Only porters can check rooms.' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('start', 'pause', 'resume', 'check', 'uncheck') THEN
    RAISE EXCEPTION 'Unknown action.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id AND hotel_id = v_hotel;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT id INTO v_shift FROM public.shifts
   WHERE hotel_id = v_hotel AND upper(btrim(name)) = upper(btrim(coalesce(p_shift, '')))
   LIMIT 1;
  IF v_shift IS NULL THEN
    RAISE EXCEPTION 'Unknown shift.' USING ERRCODE = '22023';
  END IF;

  v_day := public.hotel_service_day(v_hotel, now());

  SELECT * INTO v_row FROM public.porter_room_checks
   WHERE room_id = v_room.id AND shift_id = v_shift AND service_day = v_day
   FOR UPDATE;

  IF p_action = 'uncheck' THEN
    DELETE FROM public.porter_room_checks WHERE id = v_row.id;
    RETURN jsonb_build_object('room_id', v_room.id, 'status', 'unchecked');
  END IF;

  IF p_action = 'pause' AND coalesce(v_row.status, '') <> 'in_progress' THEN
    RAISE EXCEPTION 'Room % is not in progress.', v_room.room_number USING ERRCODE = '22023';
  END IF;
  IF p_action = 'resume' AND coalesce(v_row.status, '') <> 'paused' THEN
    RAISE EXCEPTION 'Room % is not paused.', v_room.room_number USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.porter_room_checks AS c
    (hotel_id, room_id, shift_id, service_day, status, user_id, started_at, paused_at, checked_at)
  VALUES (
    v_hotel, v_room.id, v_shift, v_day,
    CASE p_action WHEN 'pause' THEN 'paused' WHEN 'check' THEN 'checked' ELSE 'in_progress' END,
    v_uid,
    CASE WHEN p_action IN ('start', 'resume') THEN now() END,
    CASE WHEN p_action = 'pause' THEN now() END,
    CASE WHEN p_action = 'check' THEN now() END
  )
  ON CONFLICT (room_id, shift_id, service_day) DO UPDATE SET
    status     = EXCLUDED.status,
    user_id    = v_uid,
    started_at = coalesce(c.started_at, EXCLUDED.started_at),
    paused_at  = CASE WHEN p_action = 'pause' THEN now() ELSE NULL END,
    checked_at = CASE WHEN p_action = 'check' THEN now() ELSE NULL END,
    updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.room_history (room_id, hotel_id, user_id, event_type, description)
  VALUES (v_room.id, v_hotel, v_uid, 'housekeeping_status',
          CASE p_action
            WHEN 'check'  THEN 'Porter checked the room'
            WHEN 'pause'  THEN 'Porter paused the room check'
            WHEN 'resume' THEN 'Porter resumed the room check'
            ELSE 'Porter started checking the room'
          END);

  RETURN jsonb_build_object(
    'room_id', v_row.room_id, 'status', v_row.status, 'user_id', v_row.user_id,
    'started_at', v_row.started_at, 'paused_at', v_row.paused_at, 'checked_at', v_row.checked_at);
END;
$$;

REVOKE ALL ON FUNCTION public.porter_check_action(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.porter_check_action(uuid, text, text) TO authenticated;

COMMIT;
