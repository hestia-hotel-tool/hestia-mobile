-- Property for the back office: floors, room types, room setup, and the
-- start of housekeeping history (hestia-backoffice Step 1.1; docs/04-backend-
-- changes.md B0.2, B3, B0.3 in that repo).
--
-- 1. public_areas: readable only by the hotel's own staff (was every hotel);
--    writes need rooms.manage.
-- 2. floors and room_types, hotel-scoped; writes need rooms.manage.
-- 3. New room columns: floor, section, type, custom credit, active, out of
--    order (dates and reason), and a sort key for room numbers.
-- 4. Triggers that keep what mobile reads correct: a room's type sets its
--    `category` and, unless its credit is custom, its `credit`. A credit set
--    any other way (mobile's set_category_credit) marks the room custom when
--    it differs from the type's default.
-- 5. A write guard: setup columns need rooms.manage; credit needs rooms.manage
--    or rooms.credits.manage. Mobile writes neither.
-- 6. Backfill: one room type per existing category, floors from 3- and
--    4-digit room numbers.
-- 7. rooms RLS split: anyone in the hotel reads and updates (the guards above
--    protect what matters); creating and deleting rooms needs rooms.manage.
-- 8. RPCs: create_room_range, set_room_type_credit, delete_room,
--    reorder_floors, reorder_public_areas.
-- 9. housekeeping_sessions, written by a trigger when a room's state changes,
--    so report history starts building now.
--
-- Mobile impact: mobile keeps reading category and credit, and only updates
-- status, flags, priority, notes, promise and service exceptions, which none of
-- this restricts. Mobile must hide inactive rooms and show out-of-order ones
-- (done in the app in the same change).

-- ===========================================================================
-- 1. public_areas (B0.2)
-- ===========================================================================

DROP POLICY IF EXISTS "Authenticated users can read public_areas" ON public.public_areas;

CREATE POLICY public_areas_select ON public.public_areas
  FOR SELECT TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()));

CREATE POLICY public_areas_insert ON public.public_areas
  FOR INSERT TO authenticated
  WITH CHECK (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('rooms.manage'));

CREATE POLICY public_areas_update ON public.public_areas
  FOR UPDATE TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('rooms.manage'))
  WITH CHECK (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('rooms.manage'));

CREATE POLICY public_areas_delete ON public.public_areas
  FOR DELETE TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('rooms.manage'));

ALTER TABLE public.public_areas ALTER COLUMN hotel_id SET DEFAULT public.auth_hotel_id();

-- ===========================================================================
-- 2. floors and room_types (B3)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.floors (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL DEFAULT public.auth_hotel_id() REFERENCES public.hotels (id),
  name        text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 40),
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, name)
);

CREATE TABLE IF NOT EXISTS public.room_types (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        uuid NOT NULL DEFAULT public.auth_hotel_id() REFERENCES public.hotels (id),
  code            text NOT NULL CHECK (code ~ '^[A-Z0-9]{1,10}$'),
  name            text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 60),
  beds            text CHECK (char_length(beds) <= 60),
  default_credit  integer NOT NULL DEFAULT 30 CHECK (default_credit BETWEEN 5 AND 600),
  default_linen   text NOT NULL DEFAULT 'with_linen' CHECK (default_linen IN ('with_linen', 'no_linen')),
  description     text CHECK (char_length(description) <= 500),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, code)
);

COMMENT ON TABLE public.floors IS 'Floors of a hotel, in display order (sort_order).';
COMMENT ON TABLE public.room_types IS
  'Room types: a room''s type sets rooms.category (= code) and, unless the room''s credit is custom, rooms.credit (= default_credit, minutes).';

DROP TRIGGER IF EXISTS update_floors_updated_at ON public.floors;
CREATE TRIGGER update_floors_updated_at BEFORE UPDATE ON public.floors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS update_room_types_updated_at ON public.room_types;
CREATE TRIGGER update_room_types_updated_at BEFORE UPDATE ON public.room_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS floors_audit_trg ON public.floors;
CREATE TRIGGER floors_audit_trg AFTER INSERT OR UPDATE OR DELETE ON public.floors
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();
DROP TRIGGER IF EXISTS room_types_audit_trg ON public.room_types;
CREATE TRIGGER room_types_audit_trg AFTER INSERT OR UPDATE OR DELETE ON public.room_types
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY floors_select ON public.floors FOR SELECT TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()));
CREATE POLICY floors_insert ON public.floors FOR INSERT TO authenticated
  WITH CHECK (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('rooms.manage'));
CREATE POLICY floors_update ON public.floors FOR UPDATE TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('rooms.manage'))
  WITH CHECK (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('rooms.manage'));
CREATE POLICY floors_delete ON public.floors FOR DELETE TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('rooms.manage'));

CREATE POLICY room_types_select ON public.room_types FOR SELECT TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()));
CREATE POLICY room_types_insert ON public.room_types FOR INSERT TO authenticated
  WITH CHECK (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('rooms.manage'));
CREATE POLICY room_types_update ON public.room_types FOR UPDATE TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('rooms.manage'))
  WITH CHECK (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('rooms.manage'));
CREATE POLICY room_types_delete ON public.room_types FOR DELETE TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('rooms.manage'));

-- ===========================================================================
-- 3. New room columns (B3)
-- ===========================================================================

ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS floor_id            uuid REFERENCES public.floors (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS section             text CHECK (char_length(section) <= 40),
  ADD COLUMN IF NOT EXISTS room_type_id        uuid REFERENCES public.room_types (id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS credit_is_custom    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active              boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS out_of_order_from   date,
  ADD COLUMN IF NOT EXISTS out_of_order_to     date,
  ADD COLUMN IF NOT EXISTS out_of_order_reason text CHECK (char_length(out_of_order_reason) <= 200),
  ADD COLUMN IF NOT EXISTS room_number_sort    text
    GENERATED ALWAYS AS (lpad(regexp_replace(room_number, '\D', '', 'g'), 6, '0') || room_number) STORED;

ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_out_of_order_dates;
ALTER TABLE public.rooms ADD CONSTRAINT rooms_out_of_order_dates CHECK (
  (out_of_order_from IS NULL AND out_of_order_to IS NULL)
  OR (out_of_order_from IS NOT NULL AND out_of_order_to IS NOT NULL AND out_of_order_from <= out_of_order_to)
);

COMMENT ON COLUMN public.rooms.active IS 'false: the room is hidden everywhere (board, lists, pickers) but keeps its history.';
COMMENT ON COLUMN public.rooms.credit_is_custom IS 'true: credit is this room''s own; false: it follows room_types.default_credit.';
COMMENT ON COLUMN public.rooms.out_of_order_from IS 'Out of order from this date to out_of_order_to (inclusive), in the hotel''s calendar.';

CREATE INDEX IF NOT EXISTS rooms_hotel_sort_idx ON public.rooms (hotel_id, room_number_sort);
CREATE INDEX IF NOT EXISTS rooms_floor_idx ON public.rooms (floor_id);
CREATE INDEX IF NOT EXISTS rooms_room_type_idx ON public.rooms (room_type_id);

-- ===========================================================================
-- 4. Type defaults, and 5. the setup guard (B3)
-- ===========================================================================

-- Runs after rooms_00_require_room_action (status changes) and before the
-- type defaults, so it sees only what the caller asked to change.
CREATE OR REPLACE FUNCTION public._rooms_setup_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- System jobs, migrations and the room-type sync pass.
  IF auth.uid() IS NULL OR coalesce(current_setting('hestia.type_sync', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF (NEW.room_number, NEW.floor_id, NEW.section, NEW.room_type_id, NEW.active,
      NEW.out_of_order_from, NEW.out_of_order_to, NEW.out_of_order_reason, NEW.hotel_id)
     IS DISTINCT FROM
     (OLD.room_number, OLD.floor_id, OLD.section, OLD.room_type_id, OLD.active,
      OLD.out_of_order_from, OLD.out_of_order_to, OLD.out_of_order_reason, OLD.hotel_id)
     AND NOT public.auth_has_permission('rooms.manage') THEN
    RAISE EXCEPTION 'Only a manager can change how rooms are set up.' USING ERRCODE = '42501';
  END IF;
  IF (NEW.credit IS DISTINCT FROM OLD.credit OR NEW.credit_is_custom IS DISTINCT FROM OLD.credit_is_custom)
     AND NOT (public.auth_has_permission('rooms.manage') OR public.auth_has_permission('rooms.credits.manage')) THEN
    RAISE EXCEPTION 'Only a manager can change cleaning credits.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public._rooms_type_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t public.room_types;
BEGIN
  -- A room's floor and type must be its own hotel's.
  IF NEW.floor_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.floors f WHERE f.id = NEW.floor_id AND f.hotel_id = NEW.hotel_id) THEN
    RAISE EXCEPTION 'That floor belongs to another hotel.' USING ERRCODE = '23503';
  END IF;
  IF NEW.room_type_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO t FROM public.room_types WHERE id = NEW.room_type_id;
  IF t.hotel_id IS DISTINCT FROM NEW.hotel_id THEN
    RAISE EXCEPTION 'That room type belongs to another hotel.' USING ERRCODE = '23503';
  END IF;

  IF TG_OP = 'INSERT' OR NEW.room_type_id IS DISTINCT FROM OLD.room_type_id THEN
    NEW.category := t.code;
    IF NOT NEW.credit_is_custom OR NEW.credit IS NULL THEN
      NEW.credit := t.default_credit;
      NEW.credit_is_custom := false;
    END IF;
    IF TG_OP = 'INSERT' AND NEW.linen_status IS NULL THEN
      NEW.linen_status := t.default_linen;
    END IF;
  ELSIF NEW.credit_is_custom IS DISTINCT FROM OLD.credit_is_custom AND NOT NEW.credit_is_custom THEN
    -- "Use the type's credit" again.
    NEW.credit := t.default_credit;
  ELSIF NEW.credit IS DISTINCT FROM OLD.credit
        AND coalesce(current_setting('hestia.type_sync', true), '') <> 'on' THEN
    -- A credit set directly (room form, mobile's set_category_credit).
    NEW.credit_is_custom := NEW.credit IS DISTINCT FROM t.default_credit;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rooms_00b_setup_guard ON public.rooms;
CREATE TRIGGER rooms_00b_setup_guard BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public._rooms_setup_guard();

DROP TRIGGER IF EXISTS rooms_00c_type_defaults ON public.rooms;
CREATE TRIGGER rooms_00c_type_defaults BEFORE INSERT OR UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public._rooms_type_defaults();

-- A type's code and default credit flow to its rooms (category for mobile).
CREATE OR REPLACE FUNCTION public._room_types_sync_rooms()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('hestia.type_sync', 'on', true);
  UPDATE public.rooms
     SET category = NEW.code,
         credit = CASE WHEN credit_is_custom THEN credit ELSE NEW.default_credit END
   WHERE room_type_id = NEW.id
     AND (category IS DISTINCT FROM NEW.code
          OR (NOT credit_is_custom AND credit IS DISTINCT FROM NEW.default_credit));
  PERFORM set_config('hestia.type_sync', 'off', true);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS room_types_sync_rooms ON public.room_types;
CREATE TRIGGER room_types_sync_rooms AFTER UPDATE OF code, default_credit ON public.room_types
  FOR EACH ROW EXECUTE FUNCTION public._room_types_sync_rooms();

-- ===========================================================================
-- 6. Backfill (B3)
-- ===========================================================================

-- One type per hotel and category. Codes keep letters and digits only, upper
-- case, at most 10; the default credit is the category's most common credit.
WITH cats AS (
  SELECT hotel_id,
         left(upper(regexp_replace(category, '[^A-Za-z0-9]', '', 'g')), 10) AS code,
         min(category) AS name,
         mode() WITHIN GROUP (ORDER BY credit) AS credit
    FROM public.rooms
   WHERE category IS NOT NULL
   GROUP BY 1, 2
)
INSERT INTO public.room_types (hotel_id, code, name, default_credit)
SELECT hotel_id, code, name, greatest(5, least(600, coalesce(credit, 30)))
  FROM cats
 WHERE code <> ''
ON CONFLICT (hotel_id, code) DO NOTHING;

UPDATE public.rooms r
   SET room_type_id = t.id,
       credit_is_custom = r.credit IS DISTINCT FROM t.default_credit
  FROM public.room_types t
 WHERE r.room_type_id IS NULL
   AND t.hotel_id = r.hotel_id
   AND t.code = left(upper(regexp_replace(r.category, '[^A-Za-z0-9]', '', 'g')), 10);

-- Floors, best effort: 3-digit room numbers → the first digit, 4-digit → the
-- first two. Others stay without a floor for the admin to set.
WITH guess AS (
  SELECT id, hotel_id,
         CASE
           WHEN room_number ~ '^[0-9]{3}$' THEN left(room_number, 1)::int
           WHEN room_number ~ '^[0-9]{4}$' THEN left(room_number, 2)::int
         END AS floor_no
    FROM public.rooms
   WHERE floor_id IS NULL
), made AS (
  INSERT INTO public.floors (hotel_id, name, sort_order)
  SELECT DISTINCT hotel_id, 'Floor ' || floor_no, floor_no
    FROM guess WHERE floor_no IS NOT NULL
  ON CONFLICT (hotel_id, name) DO NOTHING
  RETURNING id
)
SELECT count(*) FROM made;

UPDATE public.rooms r
   SET floor_id = f.id
  FROM public.floors f
 WHERE r.floor_id IS NULL
   AND f.hotel_id = r.hotel_id
   AND f.name = 'Floor ' || CASE
         WHEN r.room_number ~ '^[0-9]{3}$' THEN left(r.room_number, 1)::int
         WHEN r.room_number ~ '^[0-9]{4}$' THEN left(r.room_number, 2)::int
       END;

-- ===========================================================================
-- 7. rooms RLS (B3)
-- ===========================================================================

DROP POLICY IF EXISTS "Hotel users can manage rooms" ON public.rooms;

CREATE POLICY rooms_select ON public.rooms FOR SELECT TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()));
-- Status, flags and notes stay open to the hotel (mobile); the guard triggers
-- protect status (room_action), setup columns and credit.
CREATE POLICY rooms_update ON public.rooms FOR UPDATE TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()))
  WITH CHECK (hotel_id = (SELECT public.auth_hotel_id()));
CREATE POLICY rooms_insert ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('rooms.manage'));
CREATE POLICY rooms_delete ON public.rooms FOR DELETE TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('rooms.manage'));

ALTER TABLE public.rooms ALTER COLUMN hotel_id SET DEFAULT public.auth_hotel_id();

-- ===========================================================================
-- 8. RPCs (B3)
-- ===========================================================================

-- "Add rooms 201 to 240": skips numbers that already exist.
CREATE OR REPLACE FUNCTION public.create_room_range(
  p_from integer,
  p_to integer,
  p_prefix text DEFAULT '',
  p_suffix text DEFAULT '',
  p_floor_id uuid DEFAULT NULL,
  p_room_type_id uuid DEFAULT NULL,
  p_section text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_number text;
  v_created integer := 0;
  v_skipped text[] := '{}';
BEGIN
  IF NOT public.auth_has_permission('rooms.manage') THEN
    RAISE EXCEPTION 'Only a manager can add rooms.' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from < 0 OR p_to < p_from THEN
    RAISE EXCEPTION 'Enter a range where the first number is not after the last.' USING ERRCODE = '22023';
  END IF;
  IF p_to - p_from + 1 > 500 THEN
    RAISE EXCEPTION 'Add at most 500 rooms at a time.' USING ERRCODE = '22023';
  END IF;
  IF p_room_type_id IS NULL THEN
    RAISE EXCEPTION 'Choose a room type.' USING ERRCODE = '22023';
  END IF;

  FOR i IN p_from..p_to LOOP
    v_number := coalesce(p_prefix, '') || i::text || coalesce(p_suffix, '');
    IF EXISTS (SELECT 1 FROM public.rooms WHERE hotel_id = v_hotel AND room_number = v_number) THEN
      v_skipped := v_skipped || v_number;
    ELSE
      INSERT INTO public.rooms (hotel_id, room_number, floor_id, room_type_id, section, house_keeping_status)
      VALUES (v_hotel, v_number, p_floor_id, p_room_type_id, nullif(btrim(p_section), ''), 'Dirty');
      v_created := v_created + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('created', v_created, 'skipped', to_jsonb(v_skipped));
END;
$$;

-- A type's credit, for its rooms that follow it (and, if asked, the custom ones too).
CREATE OR REPLACE FUNCTION public.set_room_type_credit(
  p_room_type_id uuid,
  p_minutes integer,
  p_overwrite_custom boolean DEFAULT false
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT (public.auth_has_permission('rooms.manage') OR public.auth_has_permission('rooms.credits.manage')) THEN
    RAISE EXCEPTION 'Only a manager can change cleaning credits.' USING ERRCODE = '42501';
  END IF;
  IF p_minutes IS NULL OR p_minutes NOT BETWEEN 5 AND 600 THEN
    RAISE EXCEPTION 'A cleaning credit is between 5 minutes and 10 hours.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.room_types WHERE id = p_room_type_id AND hotel_id = public.auth_hotel_id()) THEN
    RAISE EXCEPTION 'That room type no longer exists.' USING ERRCODE = 'P0002';
  END IF;

  -- The type's default moves its following rooms (trigger _room_types_sync_rooms).
  UPDATE public.room_types SET default_credit = p_minutes WHERE id = p_room_type_id;

  IF p_overwrite_custom THEN
    UPDATE public.rooms
       SET credit = p_minutes, credit_is_custom = false
     WHERE room_type_id = p_room_type_id AND credit_is_custom;
  END IF;

  SELECT count(*) INTO v_count FROM public.rooms WHERE room_type_id = p_room_type_id AND credit = p_minutes;
  RETURN v_count;
END;
$$;

-- Deleting a room would delete its stays, history and reports (cascades), so
-- a room with any is deactivated instead.
CREATE OR REPLACE FUNCTION public.delete_room(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.auth_has_permission('rooms.manage') THEN
    RAISE EXCEPTION 'Only a manager can delete rooms.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = p_room_id AND hotel_id = public.auth_hotel_id()) THEN
    RAISE EXCEPTION 'That room no longer exists.' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reservations WHERE room_id = p_room_id)
     OR EXISTS (SELECT 1 FROM public.room_history WHERE room_id = p_room_id)
     OR EXISTS (SELECT 1 FROM public.room_cleaning_reports WHERE room_id = p_room_id)
     OR EXISTS (SELECT 1 FROM public.room_notes WHERE room_id = p_room_id)
     OR EXISTS (SELECT 1 FROM public.consumptions WHERE room_id = p_room_id)
     OR EXISTS (SELECT 1 FROM public.tickets WHERE room_id = p_room_id)
     OR EXISTS (SELECT 1 FROM public.lost_and_found_items WHERE room_id = p_room_id)
     OR EXISTS (SELECT 1 FROM public.housekeeping_sessions WHERE room_id = p_room_id) THEN
    RAISE EXCEPTION 'This room has stays, history or reports. Deactivate it instead.' USING ERRCODE = 'P0001';
  END IF;
  DELETE FROM public.rooms WHERE id = p_room_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_floors(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.auth_has_permission('rooms.manage') THEN
    RAISE EXCEPTION 'Only a manager can reorder floors.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.floors f
     SET sort_order = o.pos
    FROM unnest(p_ids) WITH ORDINALITY AS o(id, pos)
   WHERE f.id = o.id AND f.hotel_id = public.auth_hotel_id();
END;
$$;

CREATE OR REPLACE FUNCTION public.reorder_public_areas(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.auth_has_permission('rooms.manage') THEN
    RAISE EXCEPTION 'Only a manager can reorder public areas.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.public_areas a
     SET sort_order = o.pos
    FROM unnest(p_ids) WITH ORDINALITY AS o(id, pos)
   WHERE a.id = o.id AND a.hotel_id = public.auth_hotel_id();
END;
$$;

-- ===========================================================================
-- 9. Housekeeping history (B0.3)
-- ===========================================================================

-- The hotel's service day at a moment: its local date, minus service_day_starts
-- (a clean at 02:00 with a 04:00 start belongs to the day before).
CREATE OR REPLACE FUNCTION public.hotel_service_day(p_hotel_id uuid, p_at timestamptz DEFAULT now())
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT ((p_at AT TIME ZONE coalesce(h.timezone, 'UTC')) - coalesce(h.service_day_starts, '00:00')::interval)::date
    FROM public.hotels h WHERE h.id = p_hotel_id;
$$;

CREATE TABLE IF NOT EXISTS public.housekeeping_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id         uuid NOT NULL REFERENCES public.hotels (id),
  room_id          uuid NOT NULL REFERENCES public.rooms (id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  shift_id         uuid REFERENCES public.shifts (id) ON DELETE SET NULL,
  service_day      date NOT NULL,
  started_at       timestamptz,
  cleaned_at       timestamptz,
  inspected_at     timestamptz,
  elapsed_seconds  integer NOT NULL DEFAULT 0,
  credit_minutes   integer NOT NULL DEFAULT 0,
  sent_back_count  integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, service_day, user_id)
);

COMMENT ON TABLE public.housekeeping_sessions IS
  'One row per room, attendant and service day: started, cleaned, inspected, time and credit. Written by trigger; read by reports.';

CREATE INDEX IF NOT EXISTS housekeeping_sessions_hotel_day_idx ON public.housekeeping_sessions (hotel_id, service_day);

ALTER TABLE public.housekeeping_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY housekeeping_sessions_select ON public.housekeeping_sessions FOR SELECT TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('reports.view'));
-- No client writes: the trigger below is the only writer.

CREATE OR REPLACE FUNCTION public._rooms_record_session()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old text := public._room_state(OLD.house_keeping_status, OLD.paused_at, OLD.refuse_service_at, OLD.refuse_service_reason, OLD.return_later_at);
  v_new text := public._room_state(NEW.house_keeping_status, NEW.paused_at, NEW.refuse_service_at, NEW.refuse_service_reason, NEW.return_later_at);
  ra public.room_assignments;
  v_user uuid;
  v_day date;
BEGIN
  IF v_old = v_new THEN
    RETURN NULL;
  END IF;
  ra := public._current_room_assignment(NEW.id);
  v_user := coalesce(ra.user_id, auth.uid());
  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;
  v_day := public.hotel_service_day(NEW.hotel_id, now());

  IF v_new = 'in_progress' AND v_old <> 'paused' THEN
    INSERT INTO public.housekeeping_sessions (hotel_id, room_id, user_id, shift_id, service_day, started_at, credit_minutes)
    VALUES (NEW.hotel_id, NEW.id, v_user, ra.shift_id, v_day, now(), coalesce(NEW.credit, 0))
    ON CONFLICT (room_id, service_day, user_id)
      DO UPDATE SET started_at = coalesce(public.housekeeping_sessions.started_at, EXCLUDED.started_at);
  ELSIF v_new = 'cleaned' THEN
    INSERT INTO public.housekeeping_sessions (hotel_id, room_id, user_id, shift_id, service_day, cleaned_at, elapsed_seconds, credit_minutes)
    VALUES (NEW.hotel_id, NEW.id, v_user, ra.shift_id, v_day, now(), coalesce(NEW.cleaning_elapsed_seconds, 0), coalesce(NEW.credit, 0))
    ON CONFLICT (room_id, service_day, user_id)
      DO UPDATE SET cleaned_at = EXCLUDED.cleaned_at, elapsed_seconds = EXCLUDED.elapsed_seconds;
  ELSIF v_new = 'inspected' THEN
    UPDATE public.housekeeping_sessions SET inspected_at = now()
     WHERE room_id = NEW.id AND service_day = v_day;
  ELSIF v_old IN ('cleaned', 'inspected') THEN
    -- Sent back (or reopened) after cleaning.
    UPDATE public.housekeeping_sessions SET sent_back_count = sent_back_count + 1
     WHERE room_id = NEW.id AND service_day = v_day;
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  -- History must never block housekeeping: log and let the room change through.
  RAISE WARNING 'housekeeping_sessions not recorded for room %: %', NEW.id, SQLERRM;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS rooms_record_session ON public.rooms;
CREATE TRIGGER rooms_record_session
  AFTER UPDATE OF house_keeping_status, paused_at, refuse_service_at, refuse_service_reason, return_later_at ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public._rooms_record_session();

-- ===========================================================================
-- Grants
-- ===========================================================================

REVOKE ALL ON FUNCTION public.create_room_range(integer, integer, text, text, uuid, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_room_range(integer, integer, text, text, uuid, uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.set_room_type_credit(uuid, integer, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.set_room_type_credit(uuid, integer, boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.delete_room(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_room(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.reorder_floors(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reorder_floors(uuid[]) TO authenticated;
REVOKE ALL ON FUNCTION public.reorder_public_areas(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reorder_public_areas(uuid[]) TO authenticated;
REVOKE ALL ON FUNCTION public.hotel_service_day(uuid, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.hotel_service_day(uuid, timestamptz) TO authenticated;
