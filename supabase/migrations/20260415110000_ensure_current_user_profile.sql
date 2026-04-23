-- Bootstrap helper: ensure current auth user has a public.users row.
-- This fixes environments where users existed in auth.users before the sync trigger,
-- causing tenant-scoped RLS (auth_hotel_id) to return NULL and hide all staff lists.
--
-- Safe to run multiple times (idempotent).

CREATE OR REPLACE FUNCTION public.ensure_current_user_profile()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  resolved_hotel_id uuid;
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

  -- Resolve default hotel (create if needed).
  SELECT h.id INTO resolved_hotel_id
  FROM public.hotels h
  WHERE h.name = 'Default Hotel'
  LIMIT 1;

  IF resolved_hotel_id IS NULL THEN
    INSERT INTO public.hotels (name)
    VALUES ('Default Hotel')
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO resolved_hotel_id;
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
      NULLIF((au.raw_user_meta_data->>'hotel_id')::text, '')::uuid,
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
$$;

GRANT EXECUTE ON FUNCTION public.ensure_current_user_profile() TO authenticated;

