-- Email the guest about an item found in their room — "Send Email to Guest
-- for reclamation?" on Lost & Found's Register, step 3.
--
-- The checkbox and address field existed but did nothing: the address was
-- never saved and nothing was sent. Now:
--
--   app ──lf_email_guest(item, address)──▶ email_outbox (queued)
--        trigger ──pg_net──▶ Edge Function `send-email` ──▶ the provider
--
-- The message is written here, server side, from the stored item — not by the
-- app — so what a guest receives cannot be anything but the hotel's own text
-- about a real item. The provider (Resend, SendGrid, Postmark, Mailgun or
-- SMTP) is chosen by the function's environment; until one is set, emails
-- wait in the outbox and go out once it is (docs/email.md).
--
-- The dispatch reuses the push webhook's plumbing: the URL is the push URL
-- with `/notify` swapped for `/send-email` (or the vault secret
-- `email_dispatch_url` when set), signed with the same shared secret.

BEGIN;

-- 1. Who the guest writes back to -------------------------------------------
ALTER TABLE public.hotels
  ADD COLUMN IF NOT EXISTS contact_email text CHECK (contact_email IS NULL OR char_length(contact_email) <= 254),
  ADD COLUMN IF NOT EXISTS contact_phone text CHECK (contact_phone IS NULL OR char_length(contact_phone) <= 40);
COMMENT ON COLUMN public.hotels.contact_email IS 'Reply-to and contact line on emails to guests.';

-- 2. The address the item's email went to ----------------------------------
ALTER TABLE public.lost_and_found_items
  ADD COLUMN IF NOT EXISTS guest_email text CHECK (guest_email IS NULL OR char_length(guest_email) <= 254);

-- 3. The outbox ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_outbox (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id             uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  kind                 text NOT NULL,
  to_email             text NOT NULL CHECK (char_length(to_email) <= 254),
  reply_to             text,
  subject              text NOT NULL,
  text_body            text NOT NULL,
  html_body            text NOT NULL,
  lost_and_found_item_id uuid REFERENCES public.lost_and_found_items(id) ON DELETE SET NULL,
  status               text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sending', 'sent', 'failed')),
  attempts             integer NOT NULL DEFAULT 0,
  last_error           text,
  provider             text,
  provider_message_id  text,
  created_by_id        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  sent_at              timestamptz
);
CREATE INDEX IF NOT EXISTS email_outbox_pending_idx ON public.email_outbox (created_at) WHERE status IN ('queued', 'failed');
CREATE INDEX IF NOT EXISTS email_outbox_item_idx ON public.email_outbox (lost_and_found_item_id);

ALTER TABLE public.email_outbox ENABLE ROW LEVEL SECURITY;
-- Staff who can see lost & found can see whether an item's email went out.
DROP POLICY IF EXISTS "Hotel staff read lost and found emails" ON public.email_outbox;
CREATE POLICY "Hotel staff read lost and found emails" ON public.email_outbox
  FOR SELECT TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('lost_and_found.read'));
-- No write policies: lf_email_guest() queues, the send-email function (service role) updates.
REVOKE ALL ON public.email_outbox FROM anon;

-- 4. Queue a guest email for an item ------------------------------------------
CREATE OR REPLACE FUNCTION public._html_escape(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

CREATE OR REPLACE FUNCTION public.lf_email_guest(p_item_id uuid, p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_hotel  uuid := public.auth_hotel_id();
  v_email  text := lower(btrim(coalesce(p_email, '')));
  v_item   public.lost_and_found_items%ROWTYPE;
  v_h      public.hotels%ROWTYPE;
  v_room   text;
  v_guest  text;
  v_found  text;
  v_where  text;
  v_contact text;
  v_subject text;
  v_text   text;
  v_html   text;
  v_id     uuid;
BEGIN
  IF v_uid IS NULL OR v_hotel IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;
  IF NOT (public.auth_has_permission('lost_and_found.register') OR public.auth_has_permission('lost_and_found.manage')) THEN
    RAISE EXCEPTION 'You cannot email guests about lost and found items.' USING ERRCODE = '42501';
  END IF;
  IF v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR char_length(v_email) > 254 THEN
    RAISE EXCEPTION 'That email address does not look right.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_item FROM public.lost_and_found_items WHERE id = p_item_id AND hotel_id = v_hotel;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found.' USING ERRCODE = 'P0002';
  END IF;
  -- One item, a handful of emails a day at most: a mistyped address is
  -- corrected, not hammered.
  IF (SELECT count(*) FROM public.email_outbox
       WHERE lost_and_found_item_id = v_item.id AND created_at > now() - interval '1 day') >= 5 THEN
    RAISE EXCEPTION 'This item has already been emailed several times today.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_h FROM public.hotels WHERE id = v_hotel;
  SELECT room_number INTO v_room FROM public.rooms WHERE id = v_item.room_id;
  SELECT g.full_name INTO v_guest
    FROM public.reservation_guests rg JOIN public.guests g ON g.id = rg.guest_id
   WHERE rg.reservation_id = v_item.reservation_id
   ORDER BY rg.guest_order LIMIT 1;
  -- The app does not link a reservation when registering: take the room's
  -- latest stay that had begun by the day the item was found — the guest the
  -- item card shows (cancelled / no-show excluded).
  IF v_guest IS NULL AND v_item.room_id IS NOT NULL THEN
    SELECT g.full_name INTO v_guest
      FROM public.reservations r
      JOIN public.reservation_guests rg ON rg.reservation_id = r.id
      JOIN public.guests g ON g.id = rg.guest_id
     WHERE r.room_id = v_item.room_id
       AND r.arrival_date <= (coalesce(v_item.found_at, v_item.created_at) AT TIME ZONE coalesce(v_h.timezone, 'UTC'))::date
       AND coalesce(r.stay_status, '') NOT IN ('cancelled', 'no_show')
     ORDER BY r.arrival_date DESC, rg.guest_order
     LIMIT 1;
  END IF;

  v_found := to_char(coalesce(v_item.found_at, v_item.created_at) AT TIME ZONE coalesce(v_h.timezone, 'UTC'), 'FMDD FMMonth YYYY');
  v_where := CASE WHEN v_room IS NOT NULL THEN format('in your room (%s)', v_room)
                  ELSE coalesce('at ' || nullif(btrim(v_item.found_location), ''), 'at the hotel') END;
  v_contact := concat_ws(' · ', nullif(v_h.contact_email, ''), nullif(v_h.contact_phone, ''));

  v_subject := format('%s: we found an item you left behind (ref. %s)', v_h.name, coalesce(v_item.tracking_number, '—'));
  v_text := concat_ws(E'\n',
    format('Dear %s,', coalesce(nullif(btrim(v_guest), ''), 'Guest')),
    '',
    format('After your stay at %s we found an item %s on %s:', v_h.name, v_where, v_found),
    '',
    format('  %s', v_item.item_name),
    format('  Reference: %s', coalesce(v_item.tracking_number, '—')),
    '',
    'We are keeping it safe for you. To collect it or have it sent to you, reply to this email and quote the reference above.',
    CASE WHEN v_contact <> '' THEN format('You can also reach us at %s.', v_contact) END,
    '',
    'Kind regards,',
    format('%s · Lost & Found', v_h.name)
  );
  v_html := format(
    '<div style="font-family:-apple-system,Helvetica,Arial,sans-serif;color:#1e1e1e;font-size:15px;line-height:1.5;max-width:560px">'
    '<p>Dear %s,</p>'
    '<p>After your stay at %s we found an item %s on %s:</p>'
    '<table style="border-collapse:collapse;margin:8px 0 16px"><tr><td style="padding:10px 14px;background:#f4f7fc;border-radius:8px">'
    '<div style="font-weight:700;font-size:16px">%s</div>'
    '<div style="color:#5a759d;margin-top:2px">Reference: <b>%s</b></div></td></tr></table>'
    '<p>We are keeping it safe for you. To collect it or have it sent to you, reply to this email and quote the reference above.</p>'
    '%s'
    '<p>Kind regards,<br>%s · Lost &amp; Found</p></div>',
    public._html_escape(coalesce(nullif(btrim(v_guest), ''), 'Guest')),
    public._html_escape(v_h.name), public._html_escape(v_where), public._html_escape(v_found),
    public._html_escape(v_item.item_name), public._html_escape(coalesce(v_item.tracking_number, '—')),
    CASE WHEN v_contact <> '' THEN format('<p>You can also reach us at %s.</p>', public._html_escape(v_contact)) ELSE '' END,
    public._html_escape(v_h.name)
  );

  UPDATE public.lost_and_found_items SET guest_email = v_email WHERE id = v_item.id;

  INSERT INTO public.email_outbox
    (hotel_id, kind, to_email, reply_to, subject, text_body, html_body, lost_and_found_item_id, created_by_id)
  VALUES
    (v_hotel, 'lost_and_found_guest', v_email, nullif(v_h.contact_email, ''), v_subject, v_text, v_html, v_item.id, v_uid)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.lf_email_guest(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lf_email_guest(uuid, text) TO authenticated;

-- 5. Wake the sender ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._email_outbox_dispatch()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_url text;
  v_secret text;
  v_ids jsonb;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'email_dispatch_url';
  IF v_url IS NULL THEN
    SELECT regexp_replace(decrypted_secret, '/notify/?$', '/send-email') INTO v_url
      FROM vault.decrypted_secrets WHERE name = 'push_dispatch_url';
  END IF;
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'push_dispatch_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NULL; -- Not wired yet: the rows wait in the outbox.
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
  RAISE WARNING '[email] dispatch failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS email_outbox_dispatch ON public.email_outbox;
CREATE TRIGGER email_outbox_dispatch
  AFTER INSERT ON public.email_outbox
  REFERENCING NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION public._email_outbox_dispatch();

COMMIT;
