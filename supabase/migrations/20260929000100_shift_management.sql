-- Shift management (Settings › Shifts), for whoever manages staff.
--
-- Two operations, as functions rather than open UPDATE policies, so neither
-- can be used for more than it is meant for:
--
--   update_shift_hours(shift, start, end)  a shift's hours; its name stays —
--                                          the app finds shifts by "AM" / "PM"
--   set_staff_shift(users[], shift|null)   who is rostered on a shift
--                                          (users.shift_id); null = none
--
-- Both need `staff.manage` and only touch the caller's hotel.

CREATE OR REPLACE FUNCTION public.update_shift_hours(p_shift_id uuid, p_start time, p_end time)
RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.auth_has_permission('staff.manage') THEN
    RAISE EXCEPTION 'Only a manager can change shift hours.' USING ERRCODE = '42501';
  END IF;
  IF p_start IS NULL OR p_end IS NULL THEN
    RAISE EXCEPTION 'A shift needs a start and an end time.' USING ERRCODE = '22023';
  END IF;
  IF p_start = p_end THEN
    RAISE EXCEPTION 'A shift cannot start and end at the same time.' USING ERRCODE = '22023';
  END IF;
  UPDATE shifts SET start_time = p_start, end_time = p_end
   WHERE id = p_shift_id AND hotel_id = public.auth_hotel_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That shift was not found.' USING ERRCODE = 'P0002';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_staff_shift(p_user_ids uuid[], p_shift_id uuid)
RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_count integer;
BEGIN
  IF NOT public.auth_has_permission('staff.manage') THEN
    RAISE EXCEPTION 'Only a manager can change who works a shift.' USING ERRCODE = '42501';
  END IF;
  IF p_shift_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM shifts WHERE id = p_shift_id AND hotel_id = v_hotel) THEN
    RAISE EXCEPTION 'That shift was not found.' USING ERRCODE = 'P0002';
  END IF;
  UPDATE users SET shift_id = p_shift_id
   WHERE id = ANY (coalesce(p_user_ids, '{}')) AND hotel_id = v_hotel
     AND shift_id IS DISTINCT FROM p_shift_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.update_shift_hours(uuid, time, time) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_staff_shift(uuid[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_shift_hours(uuid, time, time) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_staff_shift(uuid[], uuid) TO authenticated;
