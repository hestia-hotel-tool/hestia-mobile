-- Clear all tenant-scoped data for Palm Haven Hotel (fresh reseed).
-- Safe for multi-tenant: only deletes rows with hotel_id = Palm Haven Hotel id.
-- Does NOT delete auth users. Does NOT delete the hotel row itself.

DO $$
DECLARE
  hid uuid;
BEGIN
  SELECT id INTO hid
  FROM public.hotels
  WHERE name = 'Palm Haven Hotel'
  LIMIT 1;

  IF hid IS NULL THEN
    RAISE NOTICE 'Palm Haven Hotel not found; nothing to clear.';
    RETURN;
  END IF;

  -- Delete in FK-safe order
  DELETE FROM public.ticket_tags          WHERE hotel_id = hid;
  DELETE FROM public.reservation_guests   WHERE hotel_id = hid;
  DELETE FROM public.room_assignments     WHERE hotel_id = hid;
  DELETE FROM public.room_notes           WHERE hotel_id = hid;
  DELETE FROM public.messages             WHERE hotel_id = hid;
  DELETE FROM public.chat_participants    WHERE hotel_id = hid;
  DELETE FROM public.chats                WHERE hotel_id = hid;
  DELETE FROM public.consumptions         WHERE hotel_id = hid;
  DELETE FROM public.lost_and_found_items WHERE hotel_id = hid;
  DELETE FROM public.tickets              WHERE hotel_id = hid;
  DELETE FROM public.room_history         WHERE hotel_id = hid;
  DELETE FROM public.activity_logs        WHERE hotel_id = hid;

  -- Reservations and guests/rooms last
  DELETE FROM public.reservations         WHERE hotel_id = hid;
  DELETE FROM public.guests               WHERE hotel_id = hid;
  DELETE FROM public.rooms                WHERE hotel_id = hid;

  -- Optional root tables
  DELETE FROM public.consumables          WHERE hotel_id = hid;
  DELETE FROM public.shifts               WHERE hotel_id = hid;

  RAISE NOTICE 'Cleared Palm Haven Hotel tenant data (hotel_id=%).', hid;
END $$;

