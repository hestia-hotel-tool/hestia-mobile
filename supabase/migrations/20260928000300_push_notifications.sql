-- Push notifications: every in-app notification also reaches the phone.
--
-- 20260925000100 made the database write a `notifications` row for each chat
-- message, task and announcement, and left push as a follow-up. This is it:
--
--   notifications INSERT  ->  (statement trigger, pg_net)  ->  `notify` Edge
--   Function  ->  Expo push service  ->  APNs / FCM  ->  the phone
--
-- One HTTP call per statement, not per row: a chat message to a group or a
-- General Announcement to every member of staff inserts many rows at once,
-- and they go out as one batch.
--
-- ## Configuration (Vault, per project — not in this file)
--
--   push_dispatch_url     https://<project-ref>.supabase.co/functions/v1/notify
--   push_dispatch_secret  shared secret; the function's PUSH_WEBHOOK_SECRET
--
-- Without them the trigger does nothing, so a project that is not set up for
-- push still records its notifications. The call is asynchronous (pg_net) and
-- any failure is swallowed: push must never block or roll back the change
-- that caused it.
--
-- ## Also fixed: device registration
--
-- `register_expo_push_token` never set `hotel_id`, NOT NULL since the tenancy
-- work, so every registration failed and no device had a token.

-- ---------------------------------------------------------------------------
-- 1. Device registration
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.register_expo_push_token(p_expo_push_token text, p_device_os text, p_device_name text)
RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_hotel IS NULL THEN
    RAISE EXCEPTION 'No hotel assigned to this user';
  END IF;
  IF p_expo_push_token IS NULL OR length(trim(p_expo_push_token)) < 10 THEN
    RAISE EXCEPTION 'Invalid push token';
  END IF;

  -- A device belongs to whoever signed in on it last.
  INSERT INTO user_push_tokens (user_id, hotel_id, expo_push_token, device_os, device_name)
  VALUES (auth.uid(), v_hotel, p_expo_push_token, p_device_os, p_device_name)
  ON CONFLICT (expo_push_token) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    hotel_id = EXCLUDED.hotel_id,
    device_os = EXCLUDED.device_os,
    device_name = EXCLUDED.device_name,
    updated_at = now();
END;
$$;

-- Signing out stops this device receiving the account's pushes.
CREATE OR REPLACE FUNCTION public.unregister_expo_push_token(p_expo_push_token text)
RETURNS void
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  DELETE FROM user_push_tokens WHERE expo_push_token = p_expo_push_token AND user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.unregister_expo_push_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unregister_expo_push_token(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Unread counts, for the app icon badge on each push
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.notification_unread_counts(p_user_ids uuid[])
RETURNS TABLE (user_id uuid, unread integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT n.user_id, count(*)::int
    FROM notifications n
   WHERE n.user_id = ANY (p_user_ids) AND n.read_at IS NULL
   GROUP BY n.user_id;
$$;

-- Server only (the Edge Function, with the service role).
REVOKE ALL ON FUNCTION public.notification_unread_counts(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notification_unread_counts(uuid[]) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Dispatch
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._notifications_dispatch_push()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_url text;
  v_secret text;
  v_ids jsonb;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'push_dispatch_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'push_dispatch_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(id) INTO v_ids FROM new_rows;
  IF v_ids IS NULL THEN
    RETURN NULL;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    body := jsonb_build_object('ids', v_ids),
    headers := jsonb_build_object('content-type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 10000
  );
  RETURN NULL;
EXCEPTION WHEN others THEN
  RAISE WARNING '[push] dispatch failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public._notifications_dispatch_push() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notifications_dispatch_push ON public.notifications;
CREATE TRIGGER notifications_dispatch_push
  AFTER INSERT ON public.notifications
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public._notifications_dispatch_push();
