-- Fix auth -> public.users sync to always resolve a hotel_id
-- Some environments were returning a 500 from auth admin createUser due to a trigger failure.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
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

  -- Fallback to Default Hotel (create it if needed)
  IF resolved_hotel_id IS NULL THEN
    SELECT id INTO resolved_hotel_id
    FROM public.hotels
    WHERE name = 'Default Hotel'
    LIMIT 1;

    IF resolved_hotel_id IS NULL THEN
      INSERT INTO public.hotels (name)
      VALUES ('Default Hotel')
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id INTO resolved_hotel_id;
    END IF;
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

