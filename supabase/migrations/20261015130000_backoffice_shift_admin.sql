-- Back office: add, rename and delete shifts (Step 2.4, after review).
--
-- Apps can only read `shifts`; hours change through update_shift_hours.
-- These functions add the rest, with the guards mobile needs:
--
-- * AM and PM are core: mobile's room lists find them by name
--   (ilike('name', 'AM' | 'PM')). Their hours can change; they can't be
--   renamed or deleted. Other shifts (Night, or new ones) only feed "which
--   shift is it now" by time of day, so they can be.
-- * Names are unique per hotel ignoring case, as mobile matches them so.
-- * Deleting a shift would cascade to its room_assignments (FK ON DELETE
--   CASCADE) and wipe a room plan silently: refused while it has any.
--   Its break definitions go with it (break history keeps its rows:
--   staff_breaks.shift_break_id is SET NULL), and people who usually
--   work it end up with no usual shift (users.shift_id SET NULL).
--
-- Mobile impact: none. New shifts appear in mobile's shift lists as they
-- are read from the table; AM and PM are untouched.

CREATE UNIQUE INDEX IF NOT EXISTS shifts_hotel_name_unique ON public.shifts (hotel_id, lower(btrim(name)));

CREATE OR REPLACE FUNCTION public._shift_is_core(p_name text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$ SELECT upper(btrim(coalesce(p_name, ''))) IN ('AM', 'PM') $$;

CREATE OR REPLACE FUNCTION public._shift_name_check(p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text := btrim(coalesce(p_name, ''));
BEGIN
  IF char_length(v) NOT BETWEEN 1 AND 20 THEN
    RAISE EXCEPTION 'Give the shift a name of up to 20 characters.' USING ERRCODE = '22023';
  END IF;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_shift(p_name text, p_start time, p_end time)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_name text := public._shift_name_check(p_name);
  v_id uuid;
BEGIN
  IF NOT public.auth_has_permission('staff.manage') THEN
    RAISE EXCEPTION 'Only a manager can add shifts.' USING ERRCODE = '42501';
  END IF;
  IF p_start IS NULL OR p_end IS NULL THEN
    RAISE EXCEPTION 'A shift needs a start and an end time.' USING ERRCODE = '22023';
  END IF;
  IF p_start = p_end THEN
    RAISE EXCEPTION 'A shift cannot start and end at the same time.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.shifts WHERE hotel_id = v_hotel AND lower(btrim(name)) = lower(v_name)) THEN
    RAISE EXCEPTION 'There is already a shift called %.', v_name USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.shifts (hotel_id, name, start_time, end_time) VALUES (v_hotel, v_name, p_start, p_end) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.rename_shift(p_shift_id uuid, p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_name text := public._shift_name_check(p_name);
  v_old text;
BEGIN
  IF NOT public.auth_has_permission('staff.manage') THEN
    RAISE EXCEPTION 'Only a manager can rename shifts.' USING ERRCODE = '42501';
  END IF;
  SELECT name INTO v_old FROM public.shifts WHERE id = p_shift_id AND hotel_id = v_hotel;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That shift was not found.' USING ERRCODE = 'P0002';
  END IF;
  IF public._shift_is_core(v_old) OR public._shift_is_core(v_name) THEN
    RAISE EXCEPTION 'AM and PM keep their names: the mobile room lists use them.' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM public.shifts WHERE hotel_id = v_hotel AND id <> p_shift_id AND lower(btrim(name)) = lower(v_name)) THEN
    RAISE EXCEPTION 'There is already a shift called %.', v_name USING ERRCODE = '23505';
  END IF;
  UPDATE public.shifts SET name = v_name WHERE id = p_shift_id;
END;
$$;

-- Returns how many people no longer have a usual shift.
CREATE OR REPLACE FUNCTION public.delete_shift(p_shift_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_name text;
  v_rooms integer;
  v_people integer;
BEGIN
  IF NOT public.auth_has_permission('staff.manage') THEN
    RAISE EXCEPTION 'Only a manager can delete shifts.' USING ERRCODE = '42501';
  END IF;
  SELECT name INTO v_name FROM public.shifts WHERE id = p_shift_id AND hotel_id = v_hotel;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That shift was not found.' USING ERRCODE = 'P0002';
  END IF;
  IF public._shift_is_core(v_name) THEN
    RAISE EXCEPTION 'AM and PM can''t be deleted: the mobile room lists use them.' USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO v_rooms FROM public.room_assignments WHERE shift_id = p_shift_id;
  IF v_rooms > 0 THEN
    RAISE EXCEPTION '% has % room %. Reassign or clear them first.', v_name, v_rooms,
      CASE WHEN v_rooms = 1 THEN 'assignment' ELSE 'assignments' END USING ERRCODE = 'P0001';
  END IF;
  SELECT count(*) INTO v_people FROM public.users WHERE shift_id = p_shift_id;
  DELETE FROM public.shifts WHERE id = p_shift_id;
  RETURN v_people;
END;
$$;

REVOKE ALL ON FUNCTION public.create_shift(text, time, time) FROM public, anon;
REVOKE ALL ON FUNCTION public.rename_shift(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.delete_shift(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_shift(text, time, time) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_shift(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_shift(uuid) TO authenticated;
