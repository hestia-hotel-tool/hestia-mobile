-- Dedupe tenant seed data issues:
-- 1) Ensure `hotels.name` is unique; merge duplicate hotel rows by name.
-- 2) Remove duplicate reservation<->guest links (guest showing multiple times on same reservation).
-- 3) Add uniqueness constraints to prevent regressions.

DO $$
DECLARE
  r RECORD;
  keep_id uuid;
BEGIN
  -- Merge duplicate hotels with same name (keep the smallest UUID for determinism).
  FOR r IN
    SELECT name, array_agg(id ORDER BY id) AS ids
    FROM public.hotels
    GROUP BY name
    HAVING COUNT(*) > 1
  LOOP
    keep_id := (r.ids)[1];

    -- Update all hotel-owned tables to point to keep_id
    UPDATE public.users               SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.rooms               SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.shifts              SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.guests              SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.reservations        SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.reservation_guests  SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.room_assignments    SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.room_notes          SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.messages            SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.chat_participants   SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.chats               SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.consumptions        SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.lost_and_found_items SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.tickets             SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.ticket_tags         SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.room_history        SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.activity_logs       SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;
    UPDATE public.consumables         SET hotel_id = keep_id WHERE hotel_id = ANY(r.ids) AND hotel_id <> keep_id;

    -- Delete the extra hotel rows
    DELETE FROM public.hotels
    WHERE id = ANY(r.ids) AND id <> keep_id;
  END LOOP;

  -- Remove any duplicate reservation_guests links (keep one row).
  -- This should not exist if a PK/unique index is present, but can happen in environments created before constraints.
  DELETE FROM public.reservation_guests a
  USING public.reservation_guests b
  WHERE a.ctid < b.ctid
    AND a.hotel_id = b.hotel_id
    AND a.reservation_id = b.reservation_id
    AND a.guest_id = b.guest_id;
END $$;

-- Prevent duplicate hotels by name.
CREATE UNIQUE INDEX IF NOT EXISTS idx_hotels_name_unique
  ON public.hotels (name);

-- Prevent duplicate guest links for a reservation within a hotel.
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservation_guests_hotel_res_guest_unique
  ON public.reservation_guests (hotel_id, reservation_id, guest_id);

