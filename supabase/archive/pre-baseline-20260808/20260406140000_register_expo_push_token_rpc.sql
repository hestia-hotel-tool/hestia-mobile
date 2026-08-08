-- Push token upsert from the client fails when the same expo_push_token row exists for another user
-- (RLS UPDATE USING blocks the merge). This SECURITY DEFINER RPC performs a safe handoff to auth.uid().

CREATE OR REPLACE FUNCTION public.register_expo_push_token(
  p_expo_push_token text,
  p_device_os text,
  p_device_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_expo_push_token IS NULL OR length(trim(p_expo_push_token)) < 10 THEN
    RAISE EXCEPTION 'Invalid push token';
  END IF;

  INSERT INTO user_push_tokens (user_id, expo_push_token, device_os, device_name)
  VALUES (auth.uid(), p_expo_push_token, p_device_os, p_device_name)
  ON CONFLICT (expo_push_token) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    device_os = EXCLUDED.device_os,
    device_name = EXCLUDED.device_name,
    updated_at = NOW();
END;
$$;

REVOKE ALL ON FUNCTION public.register_expo_push_token(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_expo_push_token(text, text, text) TO authenticated;
