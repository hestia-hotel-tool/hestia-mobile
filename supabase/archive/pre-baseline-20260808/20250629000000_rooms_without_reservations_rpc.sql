-- RPC: Get rooms that have no reservations (for Postman / API).
-- Exposed as POST /rest/v1/rpc/get_rooms_without_reservations (body {} or empty).

CREATE OR REPLACE FUNCTION get_rooms_without_reservations()
RETURNS SETOF rooms
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.*
  FROM rooms r
  WHERE NOT EXISTS (
    SELECT 1 FROM reservations res WHERE res.room_id = r.id
  )
  ORDER BY r.room_number ASC;
$$;

COMMENT ON FUNCTION get_rooms_without_reservations() IS 'Returns all rooms that have no linked reservations; for API/Postman.';
