-- The porter marks for a shift on the hotel's current service day — what the
-- porter's Rooms list draws (no row for a room = UnChecked).
CREATE OR REPLACE FUNCTION public.porter_checks_today(p_shift text)
RETURNS TABLE (room_id uuid, status text, user_id uuid, user_name text, started_at timestamptz,
               paused_at timestamptz, checked_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.room_id, c.status, c.user_id, u.full_name, c.started_at, c.paused_at, c.checked_at
    FROM public.porter_room_checks c
    JOIN public.shifts s ON s.id = c.shift_id
    LEFT JOIN public.users u ON u.id = c.user_id
   WHERE c.hotel_id = public.auth_hotel_id()
     AND upper(btrim(s.name)) = upper(btrim(coalesce(p_shift, '')))
     AND c.service_day = public.hotel_service_day(public.auth_hotel_id(), now())
     AND public.auth_has_permission('rooms.read');
$$;

REVOKE ALL ON FUNCTION public.porter_checks_today(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.porter_checks_today(text) TO authenticated;
