-- Multi-tenant: make room_number unique per hotel, not globally.
-- This allows different hotels to both have room "101", etc.

DO $$
BEGIN
  -- Drop old global uniqueness if present (created by initial schema).
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'rooms'
      AND c.contype = 'u'
      AND c.conname = 'rooms_room_number_key'
  ) THEN
    ALTER TABLE public.rooms DROP CONSTRAINT rooms_room_number_key;
  END IF;

  -- Also drop any legacy unique index on room_number if one exists.
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'rooms'
      AND indexname = 'rooms_room_number_key'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS public.rooms_room_number_key';
  END IF;
END $$;

-- Enforce uniqueness per hotel
CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_hotel_id_room_number_unique
  ON public.rooms(hotel_id, room_number);

