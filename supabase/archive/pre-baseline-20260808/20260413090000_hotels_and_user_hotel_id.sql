-- Multi-tenant: introduce hotels (tenants) and assign users to a hotel

-- 1) Tenant table
CREATE TABLE IF NOT EXISTS public.hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Keep updated_at in sync (reuses existing helper if present).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
      AND pg_function_is_visible(oid)
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'update_hotels_updated_at'
    ) THEN
      CREATE TRIGGER update_hotels_updated_at
        BEFORE UPDATE ON public.hotels
        FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
  END IF;
END $$;

-- 2) Assign each staff user to exactly one hotel
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS hotel_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'users_hotel_id_fkey'
      AND n.nspname = 'public'
      AND t.relname = 'users'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_hotel_id_fkey
      FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_hotel_id ON public.users(hotel_id);

-- 3) Backfill existing data with a Default Hotel
DO $$
DECLARE
  default_hotel_id UUID;
BEGIN
  SELECT id INTO default_hotel_id
  FROM public.hotels
  WHERE name = 'Default Hotel'
  LIMIT 1;

  IF default_hotel_id IS NULL THEN
    INSERT INTO public.hotels (name)
    VALUES ('Default Hotel')
    RETURNING id INTO default_hotel_id;
  END IF;

  UPDATE public.users
  SET hotel_id = default_hotel_id
  WHERE hotel_id IS NULL;

  ALTER TABLE public.users
    ALTER COLUMN hotel_id SET NOT NULL;
END $$;

