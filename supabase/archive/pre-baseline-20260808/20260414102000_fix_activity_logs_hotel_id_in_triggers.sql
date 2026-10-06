-- Fix activity_logs triggers to always populate hotel_id (multi-tenant requirement)
-- Without this, inserts can fail with NOT NULL violations on activity_logs.hotel_id.

CREATE OR REPLACE FUNCTION public._log_room_activity(room_id uuid, action text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  resolved_hotel_id uuid;
BEGIN
  IF room_id IS NULL OR action IS NULL OR btrim(action) = '' THEN
    RETURN;
  END IF;

  -- Prefer room's hotel_id, fallback to Default Hotel.
  SELECT r.hotel_id INTO resolved_hotel_id
  FROM public.rooms r
  WHERE r.id = room_id;

  IF resolved_hotel_id IS NULL THEN
    SELECT h.id INTO resolved_hotel_id
    FROM public.hotels h
    WHERE h.name = 'Default Hotel'
    LIMIT 1;
  END IF;

  INSERT INTO public.activity_logs (user_id, action, table_name, record_id, created_at, hotel_id)
  VALUES (auth.uid(), action, 'rooms', room_id, now(), resolved_hotel_id);
END;
$$;

