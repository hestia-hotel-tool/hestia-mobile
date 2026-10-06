-- Hotel settings (Settings › Hotel) and cleaning credits (Settings › Cleaning
-- credits), for managers.
--
--   update_hotel_settings(name, timezone)   `settings.manage`
--       The time zone is what server-written times use — "Return at 14:30" in
--       notifications (_hotel_local_time_label, 20260926000400) — so it is
--       checked against Postgres's own list: a typo would otherwise break
--       every notification that formats a time.
--
--   set_category_credit(category, minutes)  `rooms.credits.manage`
--       Sets the cleaning credit (minutes) of every room of one category, the
--       countdown an In Progress room runs against.
--
-- Both touch only the caller's hotel.

CREATE OR REPLACE FUNCTION public.update_hotel_settings(p_name text, p_timezone text)
RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_name text := btrim(coalesce(p_name, ''));
BEGIN
  IF NOT public.auth_has_permission('settings.manage') THEN
    RAISE EXCEPTION 'Only a manager can change hotel settings.' USING ERRCODE = '42501';
  END IF;
  IF length(v_name) NOT BETWEEN 1 AND 80 THEN
    RAISE EXCEPTION 'The hotel name must be 1 to 80 characters.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN
    RAISE EXCEPTION 'Unknown time zone: %', p_timezone USING ERRCODE = '22023';
  END IF;
  UPDATE hotels SET name = v_name, timezone = p_timezone, updated_at = now()
   WHERE id = public.auth_hotel_id();
END;
$$;

CREATE OR REPLACE FUNCTION public.set_category_credit(p_category text, p_minutes integer)
RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.auth_has_permission('rooms.credits.manage') THEN
    RAISE EXCEPTION 'Only a manager can change cleaning credits.' USING ERRCODE = '42501';
  END IF;
  IF p_minutes IS NULL OR p_minutes NOT BETWEEN 5 AND 600 THEN
    RAISE EXCEPTION 'A cleaning credit is between 5 minutes and 10 hours.' USING ERRCODE = '22023';
  END IF;
  UPDATE rooms SET credit = p_minutes
   WHERE hotel_id = public.auth_hotel_id()
     AND category IS NOT DISTINCT FROM p_category
     AND credit IS DISTINCT FROM p_minutes;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.update_hotel_settings(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_category_credit(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_hotel_settings(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_category_credit(text, integer) TO authenticated;
