-- Auto-create users (staff) record when a new auth user signs up
-- Call this from your app after sign-up, or use a webhook/edge function.
-- Optional: Use Supabase Auth webhook to sync auth.users -> users

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
DECLARE
  resolved_hotel_id UUID;
BEGIN
  -- Single-tenant-per-user:
  -- - Prefer explicit hotel_id passed in auth user metadata (invite-based onboarding)
  -- - Fallback to the Default Hotel for local/dev setups
  SELECT (NEW.raw_user_meta_data->>'hotel_id')::uuid INTO resolved_hotel_id;
  IF resolved_hotel_id IS NULL THEN
    SELECT id INTO resolved_hotel_id
    FROM public.hotels
    WHERE name = 'Default Hotel'
    LIMIT 1;
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Create users record when auth.users gets new row
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
