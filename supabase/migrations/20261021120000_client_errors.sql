-- JavaScript errors reported by the mobile app (src/lib/crashReporter.ts).
--
-- TestFlight crash logs for 1.2.3 (4) were all `RCTFatal`: an uncaught JS
-- error. iOS does not record the JS message, so the logs could say the app
-- died but not why. The app now queues each error on the device and sends it
-- here on its next launch with a session.
--
-- Write-only for the app: a signed-in user may insert their own reports and
-- read none. They are read with SQL or from the back office.

BEGIN;

CREATE TABLE IF NOT EXISTS public.client_errors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES public.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  hotel_id     uuid REFERENCES public.hotels(id) ON DELETE CASCADE DEFAULT public.auth_hotel_id(),
  message      text NOT NULL CHECK (char_length(message) <= 2000),
  stack        text CHECK (stack IS NULL OR char_length(stack) <= 8000),
  fatal        boolean NOT NULL DEFAULT false,
  source       text NOT NULL CHECK (source IN ('global', 'render')),
  route        text CHECK (route IS NULL OR char_length(route) <= 300),
  app_version  text CHECK (app_version IS NULL OR char_length(app_version) <= 40),
  platform     text CHECK (platform IS NULL OR char_length(platform) <= 40),
  occurred_at  timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS client_errors_created_idx ON public.client_errors (created_at DESC);

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users report their own errors" ON public.client_errors;
CREATE POLICY "Users report their own errors" ON public.client_errors
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
-- No SELECT, UPDATE or DELETE policy: reports are read with SQL / the back office.

REVOKE ALL ON public.client_errors FROM anon;
GRANT INSERT ON public.client_errors TO authenticated;

COMMIT;
