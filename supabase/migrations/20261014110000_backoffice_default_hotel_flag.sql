-- The default hotel by flag, not by name (hestia-backoffice, 2026-10-14).
--
-- New accounts without a hotel, ensure_current_user_profile() and
-- _log_room_activity() fell back to the hotel *named* 'Default Hotel', and
-- created one when it was missing. Renaming that hotel would silently start a
-- second, empty 'Default Hotel'. The fallback is now hotels.is_default (one
-- row at most), so the default hotel can be called anything.
--
-- Data: the existing 'Default Hotel' row becomes the default. Renaming it is
-- done per environment, not here.
--
-- Mobile impact: none. Same fallback behaviour; one new column on hotels.

ALTER TABLE public.hotels ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.hotels.is_default IS
  'The hotel that accounts without one join (new auth users, profile repair). At most one row.';

CREATE UNIQUE INDEX IF NOT EXISTS hotels_single_default ON public.hotels (is_default) WHERE is_default;

UPDATE public.hotels SET is_default = true
 WHERE name = 'Default Hotel'
   AND NOT EXISTS (SELECT 1 FROM public.hotels WHERE is_default);

CREATE OR REPLACE FUNCTION public.default_hotel_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  hid uuid;
BEGIN
  SELECT id INTO hid FROM public.hotels WHERE is_default LIMIT 1;
  IF hid IS NULL THEN
    INSERT INTO public.hotels (name, is_default)
    VALUES ('Default Hotel', true)
    ON CONFLICT (name) DO UPDATE SET is_default = true
    RETURNING id INTO hid;
  END IF;
  RETURN hid;
END;
$$;

-- _log_room_activity runs as the caller (authenticated), as it did when it read hotels directly.
REVOKE ALL ON FUNCTION public.default_hotel_id() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.default_hotel_id() TO authenticated;

-- The three fallbacks, unchanged except for how they find the default hotel.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  resolved_hotel_id UUID;
BEGIN
  -- Prefer explicit hotel_id passed in auth user metadata
  BEGIN
    resolved_hotel_id := (NEW.raw_user_meta_data->>'hotel_id')::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      resolved_hotel_id := NULL;
  END;

  -- Fallback to the default hotel (hotels.is_default), whatever it is called.
  IF resolved_hotel_id IS NULL THEN
    resolved_hotel_id := public.default_hotel_id();
  END IF;

  INSERT INTO public.users (id, full_name, avatar_url, hotel_id)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.email,
      split_part(COALESCE(NEW.email, 'user'), '@', 1),
      'User'
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    resolved_hotel_id
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    hotel_id = COALESCE(public.users.hotel_id, EXCLUDED.hotel_id);

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_current_user_profile()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid;
  resolved_hotel_id uuid;
  meta_hotel_id uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- If profile exists, return its hotel_id immediately.
  SELECT u.hotel_id INTO resolved_hotel_id
  FROM public.users u
  WHERE u.id = uid;

  IF resolved_hotel_id IS NOT NULL THEN
    RETURN resolved_hotel_id;
  END IF;

  -- Resolve the default hotel (hotels.is_default; created if there is none).
  resolved_hotel_id := public.default_hotel_id();

  -- Optional: honor auth metadata hotel_id only if it exists in public.hotels.
  -- Some environments/users can have stale hotel_id in metadata, which would violate FK.
  SELECT NULLIF((au.raw_user_meta_data->>'hotel_id')::text, '')::uuid
  INTO meta_hotel_id
  FROM auth.users au
  WHERE au.id = uid;

  IF meta_hotel_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.hotels h WHERE h.id = meta_hotel_id) THEN
    meta_hotel_id := NULL;
  END IF;

  -- Create/repair the public.users row using auth metadata when available.
  INSERT INTO public.users (id, full_name, avatar_url, hotel_id)
  SELECT
    au.id,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.email,
      split_part(COALESCE(au.email, 'user'), '@', 1),
      'User'
    ) AS full_name,
    au.raw_user_meta_data->>'avatar_url' AS avatar_url,
    COALESCE(
      meta_hotel_id,
      resolved_hotel_id
    ) AS hotel_id
  FROM auth.users au
  WHERE au.id = uid
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    hotel_id = COALESCE(public.users.hotel_id, EXCLUDED.hotel_id);

  -- Return the (now) present hotel_id.
  SELECT u.hotel_id INTO resolved_hotel_id
  FROM public.users u
  WHERE u.id = uid;

  RETURN resolved_hotel_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public._log_room_activity(room_id uuid, action text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  resolved_hotel_id uuid;
BEGIN
  IF room_id IS NULL OR action IS NULL OR btrim(action) = '' THEN
    RETURN;
  END IF;

  -- Prefer room's hotel_id, fallback to the default hotel.
  SELECT r.hotel_id INTO resolved_hotel_id
  FROM public.rooms r
  WHERE r.id = room_id;

  IF resolved_hotel_id IS NULL THEN
    resolved_hotel_id := public.default_hotel_id();
  END IF;

  INSERT INTO public.activity_logs (user_id, action, table_name, record_id, created_at, hotel_id)
  VALUES (auth.uid(), action, 'rooms', room_id, now(), resolved_hotel_id);
END;
$function$;
