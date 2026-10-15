-- Back office B4: guests and reservations (docs/04-backend-changes.md §B4, Step 3.1).
--
-- 1. reservations: reference, source, stay_status (+ timestamps), special
--    requests, created_by_id; hotel_id defaults to the caller's hotel.
-- 2. reservation_status stays mobile's display label, kept in step with
--    stay_status by a trigger. Mapping chosen from mobile's actual reads
--    (it only compares 'Vacant' and 'Occupied'; Home is case-sensitive; the
--    am/pm Stayover↔Turndown jobs act on 'Occupied'):
--      confirmed → 'Due in', checked_in → 'Occupied', checked_out → 'Checked out',
--      cancelled → 'Cancelled', no_show → 'No show'.
--    Existing labels are left as they are (the backfill runs before the trigger).
-- 3. front_office_status limited to the seven values mobile understands
--    (anything else silently becomes 'Stayover' on phones).
-- 4. guests: phone, preferences, created_by_id; the unique (hotel, full_name)
--    index becomes a plain one (two guests may share a name; the back office
--    warns instead).
-- 5. Writes tightened: guests need guests.manage (except image_url, which
--    mobile may update); reservations and reservation_guests need
--    reservations.manage. Reads stay hotel-wide.
-- 6. RPCs: upsert_guest, upsert_reservation, reservation_transition,
--    reservation_move_room, room_availability.
-- 7. Cancelled and no-show stays never count as a room's current stay
--    (_room_current_stay: minibar charges) or for the overnight reset.
-- 8. reservations joins the supabase_realtime publication.
--
-- Mobile impact: mobile only reads these tables. It must not show cancelled
-- or no-show stays: its reservation reads filter stay_status (same change).

-- ===========================================================================
-- 1. reservations: new columns
-- ===========================================================================

CREATE SEQUENCE IF NOT EXISTS public.reservation_ref_seq START 100001;

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS reference text NOT NULL DEFAULT ('R' || lpad(nextval('public.reservation_ref_seq')::text, 6, '0')),
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'pms', 'api')),
  ADD COLUMN IF NOT EXISTS stay_status text NOT NULL DEFAULT 'confirmed'
    CHECK (stay_status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  ADD COLUMN IF NOT EXISTS special_requests text CHECK (char_length(special_requests) <= 2000),
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES public.users (id) ON DELETE SET NULL DEFAULT auth.uid();

ALTER TABLE public.reservations ALTER COLUMN hotel_id SET DEFAULT public.auth_hotel_id();
CREATE UNIQUE INDEX IF NOT EXISTS reservations_hotel_reference_unique ON public.reservations (hotel_id, reference);
CREATE INDEX IF NOT EXISTS reservations_room_dates_idx ON public.reservations (room_id, arrival_date, departure_date);

-- Existing rows came from a PMS: their stay from the label they carry.
UPDATE public.reservations SET source = 'pms' WHERE created_at < now() - interval '1 minute';
UPDATE public.reservations
   SET stay_status = CASE
     WHEN lower(coalesce(reservation_status, '')) LIKE 'checked out%' THEN 'checked_out'
     WHEN lower(coalesce(reservation_status, '')) IN ('checked in', 'occupied')
       OR lower(coalesce(reservation_status, '')) LIKE 'due out%' THEN 'checked_in'
     ELSE 'confirmed'
   END;

COMMENT ON COLUMN public.reservations.stay_status IS
  'The stay''s state (confirmed, checked_in, checked_out, cancelled, no_show). reservation_status is mobile''s label for it, kept in step by trigger.';
COMMENT ON COLUMN public.reservations.reservation_status IS
  'Display label read by mobile (it compares Vacant / Occupied). Set from stay_status by _reservations_status_label.';

-- ===========================================================================
-- 2. reservation_status follows stay_status
-- ===========================================================================

CREATE OR REPLACE FUNCTION public._reservation_label(p_stay text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_stay
    WHEN 'confirmed' THEN 'Due in'
    WHEN 'checked_in' THEN 'Occupied'
    WHEN 'checked_out' THEN 'Checked out'
    WHEN 'cancelled' THEN 'Cancelled'
    WHEN 'no_show' THEN 'No show'
  END;
$$;

CREATE OR REPLACE FUNCTION public._reservations_status_label()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- A new stay without a label (the back office) gets one; a PMS row keeps its own.
  IF TG_OP = 'INSERT' THEN
    IF NEW.reservation_status IS NULL THEN
      NEW.reservation_status := public._reservation_label(NEW.stay_status);
    END IF;
  ELSIF NEW.stay_status IS DISTINCT FROM OLD.stay_status THEN
    NEW.reservation_status := public._reservation_label(NEW.stay_status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservations_status_label ON public.reservations;
CREATE TRIGGER reservations_status_label
  BEFORE INSERT OR UPDATE OF stay_status ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public._reservations_status_label();

-- ===========================================================================
-- 3. front_office_status: only what mobile understands
-- ===========================================================================

ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_front_office_status_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_front_office_status_check
  CHECK (front_office_status IS NULL OR front_office_status IN
    ('Arrival', 'Departure', 'Arrival/Departure', 'Stayover', 'Turndown', 'No Task', 'Refresh'));

-- ===========================================================================
-- 4. guests
-- ===========================================================================

ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS phone text CHECK (char_length(phone) <= 40),
  ADD COLUMN IF NOT EXISTS preferences text CHECK (char_length(preferences) <= 2000),
  ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES public.users (id) ON DELETE SET NULL DEFAULT auth.uid();
ALTER TABLE public.guests ALTER COLUMN hotel_id SET DEFAULT public.auth_hotel_id();
ALTER TABLE public.reservation_guests ALTER COLUMN hotel_id SET DEFAULT public.auth_hotel_id();

DROP INDEX IF EXISTS public.idx_guests_hotel_id_full_name_unique;
CREATE INDEX IF NOT EXISTS guests_hotel_name_idx ON public.guests (hotel_id, lower(full_name));

DROP TRIGGER IF EXISTS update_guests_updated_at ON public.guests;
CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================================================
-- 5. Writes
-- ===========================================================================

DROP POLICY IF EXISTS "Hotel users can manage guests" ON public.guests;
DROP POLICY IF EXISTS guests_select ON public.guests;
DROP POLICY IF EXISTS guests_insert ON public.guests;
DROP POLICY IF EXISTS guests_update ON public.guests;
DROP POLICY IF EXISTS guests_delete ON public.guests;
CREATE POLICY guests_select ON public.guests FOR SELECT TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()));
CREATE POLICY guests_insert ON public.guests FOR INSERT TO authenticated
  WITH CHECK (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('guests.manage'));
-- Mobile may update image_url; the trigger below checks every other column.
CREATE POLICY guests_update ON public.guests FOR UPDATE TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()))
  WITH CHECK (hotel_id = (SELECT public.auth_hotel_id()));
CREATE POLICY guests_delete ON public.guests FOR DELETE TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('guests.manage'));

CREATE OR REPLACE FUNCTION public._guests_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.auth_has_permission('guests.manage') THEN
    RETURN NEW;
  END IF;
  IF (NEW.full_name, NEW.vip_code, NEW.address, NEW.company, NEW.primary_email, NEW.dob, NEW.phone,
      NEW.preferences, NEW.hotel_id, NEW.created_by_id, NEW.created_at)
     IS DISTINCT FROM
     (OLD.full_name, OLD.vip_code, OLD.address, OLD.company, OLD.primary_email, OLD.dob, OLD.phone,
      OLD.preferences, OLD.hotel_id, OLD.created_by_id, OLD.created_at) THEN
    RAISE EXCEPTION 'Only front office managers can edit guest details.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guests_guard ON public.guests;
CREATE TRIGGER guests_guard BEFORE UPDATE ON public.guests FOR EACH ROW EXECUTE FUNCTION public._guests_guard();

DROP POLICY IF EXISTS "Hotel users can manage reservations" ON public.reservations;
DROP POLICY IF EXISTS reservations_select ON public.reservations;
DROP POLICY IF EXISTS reservations_write ON public.reservations;
CREATE POLICY reservations_select ON public.reservations FOR SELECT TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()));
CREATE POLICY reservations_write ON public.reservations FOR ALL TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('reservations.manage'))
  WITH CHECK (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('reservations.manage'));

DROP POLICY IF EXISTS "Hotel users can manage reservation_guests" ON public.reservation_guests;
DROP POLICY IF EXISTS reservation_guests_select ON public.reservation_guests;
DROP POLICY IF EXISTS reservation_guests_write ON public.reservation_guests;
CREATE POLICY reservation_guests_select ON public.reservation_guests FOR SELECT TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()));
CREATE POLICY reservation_guests_write ON public.reservation_guests FOR ALL TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('reservations.manage'))
  WITH CHECK (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('reservations.manage'));

-- consumptions are already read-only for apps (written by submit_room_checklist).

-- ===========================================================================
-- 6. RPCs
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.upsert_guest(
  p_id uuid, p_full_name text, p_vip_code text, p_email text, p_phone text,
  p_company text, p_address text, p_dob date, p_preferences text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_name text := btrim(coalesce(p_full_name, ''));
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  v_id uuid;
BEGIN
  IF NOT public.auth_has_permission('guests.manage') THEN
    RAISE EXCEPTION 'Only front office managers can edit guests.' USING ERRCODE = '42501';
  END IF;
  IF char_length(v_name) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Enter the guest''s name (up to 120 characters).' USING ERRCODE = '22023';
  END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Enter a valid email address.' USING ERRCODE = '22023';
  END IF;
  IF p_dob IS NOT NULL AND (p_dob > current_date OR p_dob < date '1900-01-01') THEN
    RAISE EXCEPTION 'Enter a real date of birth.' USING ERRCODE = '22023';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.guests (hotel_id, full_name, vip_code, primary_email, phone, company, address, dob, preferences)
    VALUES (v_hotel, v_name, nullif(btrim(coalesce(p_vip_code, '')), ''), v_email, nullif(btrim(coalesce(p_phone, '')), ''),
            nullif(btrim(coalesce(p_company, '')), ''), nullif(btrim(coalesce(p_address, '')), ''), p_dob,
            nullif(btrim(coalesce(p_preferences, '')), ''))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.guests
       SET full_name = v_name, vip_code = nullif(btrim(coalesce(p_vip_code, '')), ''), primary_email = v_email,
           phone = nullif(btrim(coalesce(p_phone, '')), ''), company = nullif(btrim(coalesce(p_company, '')), ''),
           address = nullif(btrim(coalesce(p_address, '')), ''), dob = p_dob,
           preferences = nullif(btrim(coalesce(p_preferences, '')), '')
     WHERE id = p_id AND hotel_id = v_hotel
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'That guest no longer exists.' USING ERRCODE = 'P0002';
    END IF;
  END IF;
  RETURN v_id;
END;
$$;

-- The first live stay overlapping [from, to) on a room, if any (cancelled, no-show and checked-out stays don't hold it).
CREATE OR REPLACE FUNCTION public._room_conflict(p_room_id uuid, p_from date, p_to date, p_exclude uuid)
RETURNS public.reservations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.reservations
   WHERE room_id = p_room_id
     AND id IS DISTINCT FROM p_exclude
     AND stay_status IN ('confirmed', 'checked_in')
     AND arrival_date < p_to AND p_from < departure_date
   ORDER BY arrival_date
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public._room_conflict(uuid, date, date, uuid) FROM public, anon, authenticated;

-- Raises the user-facing reason a room can't take [from, to): inactive, out of order, or booked.
CREATE OR REPLACE FUNCTION public._room_bookable(p_room_id uuid, p_from date, p_to date, p_exclude uuid)
RETURNS public.rooms
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.rooms%ROWTYPE;
  c public.reservations%ROWTYPE;
BEGIN
  SELECT * INTO r FROM public.rooms WHERE id = p_room_id AND hotel_id = public.auth_hotel_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That room was not found.' USING ERRCODE = 'P0002';
  END IF;
  IF NOT r.active THEN
    RAISE EXCEPTION 'Room % is inactive.', r.room_number USING ERRCODE = 'P0001';
  END IF;
  IF r.out_of_order_from IS NOT NULL AND r.out_of_order_from < p_to AND p_from <= r.out_of_order_to THEN
    RAISE EXCEPTION 'Room % is out of order %–%.', r.room_number, to_char(r.out_of_order_from, 'DD Mon'), to_char(r.out_of_order_to, 'DD Mon')
      USING ERRCODE = 'P0001';
  END IF;
  c := public._room_conflict(p_room_id, p_from, p_to, p_exclude);
  IF c.id IS NOT NULL THEN
    RAISE EXCEPTION 'Room % is booked %–% (%).', r.room_number, to_char(c.arrival_date, 'DD Mon'), to_char(c.departure_date, 'DD Mon'), c.reference
      USING ERRCODE = 'P0001';
  END IF;
  RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public._room_bookable(uuid, date, date, uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.upsert_reservation(
  p_id uuid, p_room_id uuid, p_arrival date, p_departure date, p_eta time,
  p_adults int, p_kids int, p_guest_ids uuid[], p_front_office_status text,
  p_promised_time time, p_special_requests text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_id uuid;
  v_stay text;
  v_guest uuid;
  v_i int := 0;
BEGIN
  IF NOT public.auth_has_permission('reservations.manage') THEN
    RAISE EXCEPTION 'Only front office managers can edit reservations.' USING ERRCODE = '42501';
  END IF;
  IF p_arrival IS NULL OR p_departure IS NULL OR p_departure <= p_arrival THEN
    RAISE EXCEPTION 'The departure must be after the arrival.' USING ERRCODE = '22023';
  END IF;
  IF coalesce(p_adults, 0) < 1 OR coalesce(p_kids, 0) < 0 THEN
    RAISE EXCEPTION 'A stay needs at least one adult.' USING ERRCODE = '22023';
  END IF;
  IF coalesce(array_length(p_guest_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Add at least one guest.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_guest_ids) g(id) WHERE NOT EXISTS (SELECT 1 FROM public.guests WHERE id = g.id AND hotel_id = v_hotel)) THEN
    RAISE EXCEPTION 'A guest on this stay no longer exists.' USING ERRCODE = 'P0002';
  END IF;
  IF p_special_requests IS NOT NULL AND char_length(p_special_requests) > 2000 THEN
    RAISE EXCEPTION 'Special requests: up to 2000 characters.' USING ERRCODE = '22023';
  END IF;

  IF p_id IS NOT NULL THEN
    SELECT stay_status INTO v_stay FROM public.reservations WHERE id = p_id AND hotel_id = v_hotel;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That reservation no longer exists.' USING ERRCODE = 'P0002';
    END IF;
    IF v_stay IN ('checked_out', 'cancelled', 'no_show') THEN
      RAISE EXCEPTION 'A closed stay can''t be changed.' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  PERFORM public._room_bookable(p_room_id, p_arrival, p_departure, p_id);

  IF p_id IS NULL THEN
    INSERT INTO public.reservations (hotel_id, room_id, arrival_date, departure_date, eta, adults, kids,
                                     front_office_status, promised_time, special_requests, source)
    VALUES (v_hotel, p_room_id, p_arrival, p_departure, p_eta, p_adults, coalesce(p_kids, 0),
            nullif(btrim(coalesce(p_front_office_status, '')), ''), p_promised_time,
            nullif(btrim(coalesce(p_special_requests, '')), ''), 'manual')
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.reservations
       SET room_id = p_room_id, arrival_date = p_arrival, departure_date = p_departure, eta = p_eta,
           adults = p_adults, kids = coalesce(p_kids, 0),
           front_office_status = nullif(btrim(coalesce(p_front_office_status, '')), ''),
           promised_time = p_promised_time, special_requests = nullif(btrim(coalesce(p_special_requests, '')), '')
     WHERE id = p_id
    RETURNING id INTO v_id;
  END IF;

  DELETE FROM public.reservation_guests WHERE reservation_id = v_id;
  FOREACH v_guest IN ARRAY p_guest_ids LOOP
    INSERT INTO public.reservation_guests (hotel_id, reservation_id, guest_id, guest_order)
    VALUES (v_hotel, v_id, v_guest, v_i)
    ON CONFLICT DO NOTHING;
    v_i := v_i + 1;
  END LOOP;
  RETURN v_id;
END;
$$;

-- confirmed → checked_in | cancelled | no_show; checked_in → checked_out.
-- Checking out sets a Cleaned / Inspected room back to Dirty (vacant dirty),
-- as the overnight reset does. Every step is written to room_history.
CREATE OR REPLACE FUNCTION public.reservation_transition(p_id uuid, p_to text, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  res public.reservations%ROWTYPE;
  v_room public.rooms%ROWTYPE;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_guest uuid;
  v_dirty boolean := false;
  v_text text;
BEGIN
  IF NOT public.auth_has_permission('reservations.manage') THEN
    RAISE EXCEPTION 'Only front office managers can check guests in or out.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO res FROM public.reservations WHERE id = p_id AND hotel_id = v_hotel FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That reservation no longer exists.' USING ERRCODE = 'P0002';
  END IF;
  IF NOT ((res.stay_status = 'confirmed' AND p_to IN ('checked_in', 'cancelled', 'no_show'))
       OR (res.stay_status = 'checked_in' AND p_to = 'checked_out')) THEN
    RAISE EXCEPTION 'A % stay can''t become %.', replace(res.stay_status, '_', ' '), replace(coalesce(p_to, ''), '_', ' ')
      USING ERRCODE = 'P0001';
  END IF;
  IF p_to IN ('cancelled', 'no_show') AND v_reason IS NULL THEN
    RAISE EXCEPTION 'Give a reason.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_room FROM public.rooms WHERE id = res.room_id;

  UPDATE public.reservations
     SET stay_status = p_to,
         checked_in_at = CASE WHEN p_to = 'checked_in' THEN now() ELSE checked_in_at END,
         checked_out_at = CASE WHEN p_to = 'checked_out' THEN now() ELSE checked_out_at END,
         cancelled_at = CASE WHEN p_to IN ('cancelled', 'no_show') THEN now() ELSE cancelled_at END
   WHERE id = p_id
  RETURNING * INTO res;

  IF p_to = 'checked_out' AND v_room.house_keeping_status IN ('Cleaned', 'Inspected') THEN
    -- The status guard admits trusted functions through this flag (room_action does the same).
    PERFORM set_config('hestia.room_action', 'on', true);
    UPDATE public.rooms
       SET house_keeping_status = 'Dirty', paused_at = NULL, cleaning_elapsed_seconds = 0,
           cleaning_started_at = NULL, in_progress_started_at = NULL, started_notified_at = NULL
     WHERE id = v_room.id;
    PERFORM set_config('hestia.room_action', '', true);
    v_dirty := true;
  END IF;

  SELECT guest_id INTO v_guest FROM public.reservation_guests WHERE reservation_id = p_id ORDER BY guest_order LIMIT 1;
  v_text := CASE p_to
    WHEN 'checked_in' THEN 'Checked in (' || res.reference || ')'
    WHEN 'checked_out' THEN 'Checked out (' || res.reference || ')' || CASE WHEN v_dirty THEN '; room set to Dirty' ELSE '' END
    WHEN 'cancelled' THEN 'Reservation ' || res.reference || ' cancelled: ' || v_reason
    WHEN 'no_show' THEN 'Reservation ' || res.reference || ' marked no-show: ' || v_reason
  END;
  INSERT INTO public.room_history (hotel_id, room_id, reservation_id, guest_id, user_id, event_type, description)
  VALUES (v_hotel, res.room_id, res.id, v_guest, auth.uid(), 'reservation', v_text);

  RETURN jsonb_build_object('id', res.id, 'stay_status', res.stay_status, 'reservation_status', res.reservation_status, 'room_set_dirty', v_dirty);
END;
$$;

CREATE OR REPLACE FUNCTION public.reservation_move_room(p_id uuid, p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  res public.reservations%ROWTYPE;
  v_from public.rooms%ROWTYPE;
  v_to public.rooms%ROWTYPE;
  v_guest uuid;
BEGIN
  IF NOT public.auth_has_permission('reservations.manage') THEN
    RAISE EXCEPTION 'Only front office managers can move a stay.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO res FROM public.reservations WHERE id = p_id AND hotel_id = v_hotel FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That reservation no longer exists.' USING ERRCODE = 'P0002';
  END IF;
  IF res.stay_status NOT IN ('confirmed', 'checked_in') THEN
    RAISE EXCEPTION 'Only an upcoming or in-house stay can move.' USING ERRCODE = 'P0001';
  END IF;
  IF res.room_id = p_room_id THEN
    RETURN;
  END IF;
  SELECT * INTO v_from FROM public.rooms WHERE id = res.room_id;
  v_to := public._room_bookable(p_room_id, res.arrival_date, res.departure_date, p_id);
  UPDATE public.reservations SET room_id = p_room_id WHERE id = p_id;

  SELECT guest_id INTO v_guest FROM public.reservation_guests WHERE reservation_id = p_id ORDER BY guest_order LIMIT 1;
  INSERT INTO public.room_history (hotel_id, room_id, reservation_id, guest_id, user_id, event_type, description) VALUES
    (v_hotel, v_from.id, p_id, v_guest, auth.uid(), 'reservation', 'Stay ' || res.reference || ' moved to room ' || v_to.room_number),
    (v_hotel, v_to.id, p_id, v_guest, auth.uid(), 'reservation', 'Stay ' || res.reference || ' moved here from room ' || v_from.room_number);
END;
$$;

-- Every active room of the hotel for [from, to), with whether it's free and, if not, the stay in the way.
CREATE OR REPLACE FUNCTION public.room_availability(p_from date, p_to date, p_room_type_id uuid DEFAULT NULL, p_exclude_reservation uuid DEFAULT NULL)
RETURNS TABLE (room_id uuid, room_number text, type_code text, floor text, state text, free boolean, conflict_reference text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.auth_has_permission('reservations.manage') THEN
    RAISE EXCEPTION 'Only front office managers can check availability.' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to <= p_from THEN
    RAISE EXCEPTION 'The departure must be after the arrival.' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
    SELECT r.id, r.room_number, rt.code, f.name,
           CASE WHEN r.out_of_order_from IS NOT NULL AND r.out_of_order_from < p_to AND p_from <= r.out_of_order_to
                THEN 'out_of_order' ELSE coalesce(r.house_keeping_status, 'Dirty') END,
           (c.id IS NULL AND NOT (r.out_of_order_from IS NOT NULL AND r.out_of_order_from < p_to AND p_from <= r.out_of_order_to)),
           c.reference
      FROM public.rooms r
      LEFT JOIN public.room_types rt ON rt.id = r.room_type_id
      LEFT JOIN public.floors f ON f.id = r.floor_id
      LEFT JOIN LATERAL (SELECT (public._room_conflict(r.id, p_from, p_to, p_exclude_reservation)).*) c ON true
     WHERE r.hotel_id = public.auth_hotel_id()
       AND r.active
       AND (p_room_type_id IS NULL OR r.room_type_id = p_room_type_id)
     ORDER BY r.room_number_sort;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_guest(uuid, text, text, text, text, text, text, date, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.upsert_reservation(uuid, uuid, date, date, time, int, int, uuid[], text, time, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.reservation_transition(uuid, text, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.reservation_move_room(uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.room_availability(date, date, uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.upsert_guest(uuid, text, text, text, text, text, text, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_reservation(uuid, uuid, date, date, time, int, int, uuid[], text, time, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reservation_transition(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reservation_move_room(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.room_availability(date, date, uuid, uuid) TO authenticated;

-- ===========================================================================
-- 7. Cancelled and no-show stays don't count as a room's stay
-- ===========================================================================

CREATE OR REPLACE FUNCTION public._room_current_stay(p_room_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT res.id
    FROM public.reservations res
    JOIN public.rooms r ON r.id = res.room_id
    JOIN public.hotels h ON h.id = r.hotel_id
   WHERE res.room_id = p_room_id
     AND res.stay_status NOT IN ('cancelled', 'no_show')
     AND res.arrival_date <= (now() AT TIME ZONE h.timezone)::date
     AND res.departure_date >= (now() AT TIME ZONE h.timezone)::date
   ORDER BY res.arrival_date ASC, res.departure_date ASC
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public._room_current_stay(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public._housekeeping_new_day(p_hotel_id uuid, p_today date)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_n integer;
BEGIN
  IF NOT coalesce((SELECT overnight_reset FROM public.hotel_housekeeping_settings WHERE hotel_id = p_hotel_id), false) THEN
    RETURN 0;
  END IF;
  WITH slept AS (
    SELECT DISTINCT room_id FROM public.reservations
     WHERE hotel_id = p_hotel_id AND arrival_date < p_today AND departure_date >= p_today
       AND stay_status NOT IN ('cancelled', 'no_show')
  ), reset AS (
    UPDATE public.rooms ro SET house_keeping_status = 'Dirty', paused_at = NULL,
           cleaning_elapsed_seconds = 0, cleaning_started_at = NULL,
           in_progress_started_at = NULL, started_notified_at = NULL
      FROM slept
     WHERE ro.id = slept.room_id AND ro.hotel_id = p_hotel_id
       AND ro.house_keeping_status IN ('Cleaned', 'Inspected')
    RETURNING ro.id
  )
  SELECT count(*) INTO v_n FROM reset;
  UPDATE public.room_assignments SET work_status = NULL, start_time = NULL, end_time = NULL
   WHERE hotel_id = p_hotel_id
     AND room_id IN (SELECT id FROM public.rooms WHERE hotel_id = p_hotel_id AND house_keeping_status = 'Dirty')
     AND work_status IS NOT NULL;
  RETURN v_n;
END;
$$;

-- ===========================================================================
-- 8. Realtime
-- ===========================================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'reservations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;
  END IF;
END $$;
