-- Back office: tickets, lost & found, announcements (Step 5.1, docs/04-backend-changes.md §B6).
--
-- 1. Tickets: a readable reference (ref → "T-1001"), the list's index, realtime.
-- 2. Lost & found: shipping / return / discard details, a status CHECK (the
--    four statuses mobile uses), lf_set_status(), who changed the status and
--    when (stamped for mobile's direct updates too), realtime.
--    `tracking_number` is the item's own reference ("FH10066", set by
--    set_lost_and_found_tracking_number), so the parcel's tracking number gets
--    its own column, shipping_tracking.
-- 3. Announcements: a table of what was sent, publish_announcement_v2() with an
--    audience (departments, shifts, exclusions), and read stats.
--    publish_announcement() (mobile) becomes a wrapper, same signature and
--    result.
--
-- Mobile impact: none needed. Ticket inserts don't send ref; lost & found
-- status updates still work as they are (and now also stamp who/when);
-- announcements arrive as the same 'general' notifications, with
-- announcementId added to data. Recipients are now active staff only (no
-- disabled accounts, no platform team), which is what "everyone" means.

-- ===========================================================================
-- 1. Tickets
-- ===========================================================================

ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS ref bigint;
-- Existing tickets numbered by age, from 1001.
UPDATE public.tickets t SET ref = 1000 + x.n
  FROM (SELECT id, row_number() OVER (ORDER BY created_at, id) n FROM public.tickets) x
 WHERE x.id = t.id AND t.ref IS NULL;
ALTER TABLE public.tickets ALTER COLUMN ref SET NOT NULL;
DO $$
DECLARE v_next bigint := coalesce((SELECT max(ref) FROM public.tickets), 1000) + 1;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tickets' AND column_name = 'ref' AND is_identity = 'YES') THEN
    EXECUTE format('ALTER TABLE public.tickets ALTER COLUMN ref ADD GENERATED ALWAYS AS IDENTITY (START WITH %s)', v_next);
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS tickets_ref_key ON public.tickets (ref);
CREATE INDEX IF NOT EXISTS tickets_hotel_status_priority_created ON public.tickets (hotel_id, status, priority, created_at DESC);

-- ===========================================================================
-- 2. Lost & found
-- ===========================================================================

ALTER TABLE public.lost_and_found_items
  ADD COLUMN IF NOT EXISTS shipping_carrier text CHECK (char_length(shipping_carrier) <= 80),
  ADD COLUMN IF NOT EXISTS shipping_tracking text CHECK (char_length(shipping_tracking) <= 120),
  ADD COLUMN IF NOT EXISTS shipped_at timestamptz,
  ADD COLUMN IF NOT EXISTS returned_to text CHECK (char_length(returned_to) <= 200),
  ADD COLUMN IF NOT EXISTS returned_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_id_checked boolean,
  ADD COLUMN IF NOT EXISTS discarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS discard_reason text CHECK (char_length(discard_reason) <= 500),
  ADD COLUMN IF NOT EXISTS status_changed_by_id uuid REFERENCES public.users (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;

-- Every row already holds one of mobile's four statuses, so the check is valid at once.
UPDATE public.lost_and_found_items SET status = 'stored' WHERE status IS NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lost_and_found_items_status_check') THEN
    ALTER TABLE public.lost_and_found_items
      ADD CONSTRAINT lost_and_found_items_status_check CHECK (status IN ('stored', 'shipped', 'returned', 'discarded'));
  END IF;
END $$;
ALTER TABLE public.lost_and_found_items ALTER COLUMN status SET DEFAULT 'stored';

-- Who changed the status and when, whoever wrote it (mobile updates the row directly).
CREATE OR REPLACE FUNCTION public._lost_and_found_status_stamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_by_id := coalesce(auth.uid(), NEW.status_changed_by_id);
    NEW.status_changed_at := now();
    IF NEW.status = 'shipped' AND NEW.shipped_at IS NULL THEN NEW.shipped_at := now(); END IF;
    IF NEW.status = 'returned' AND NEW.returned_at IS NULL THEN NEW.returned_at := now(); END IF;
    IF NEW.status = 'discarded' AND NEW.discarded_at IS NULL THEN NEW.discarded_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS lost_and_found_status_stamp ON public.lost_and_found_items;
CREATE TRIGGER lost_and_found_status_stamp BEFORE UPDATE OF status ON public.lost_and_found_items
  FOR EACH ROW EXECUTE FUNCTION public._lost_and_found_status_stamp();

-- Change an item's status with the details that go with it (lost_and_found.manage):
--   shipped:   {shipped_location*, shipping_carrier*, shipping_tracking?, shipped_at?}
--   returned:  {returned_to*, return_id_checked, returned_at?, return_info?}
--   discarded: {discard_reason*, discarded_at?}
--   stored:    reopens it and clears the other details
-- The item's room gets a history line.
CREATE OR REPLACE FUNCTION public.lf_set_status(p_id uuid, p_status text, p_details jsonb DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_item public.lost_and_found_items%ROWTYPE;
  d jsonb := coalesce(p_details, '{}');
  v_text text := nullif(btrim(coalesce(d->>'shipped_location', '')), '');
  v_carrier text := nullif(btrim(coalesce(d->>'shipping_carrier', '')), '');
  v_to text := nullif(btrim(coalesce(d->>'returned_to', '')), '');
  v_reason text := nullif(btrim(coalesce(d->>'discard_reason', '')), '');
  v_when timestamptz;
  v_line text;
BEGIN
  IF NOT public.auth_has_permission('lost_and_found.manage') THEN
    RAISE EXCEPTION 'Only a manager can change an item''s status this way.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_item FROM public.lost_and_found_items WHERE id = p_id AND hotel_id = v_hotel FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That item no longer exists.' USING ERRCODE = 'P0002';
  END IF;
  IF p_status NOT IN ('stored', 'shipped', 'returned', 'discarded') THEN
    RAISE EXCEPTION 'Unknown status "%".', p_status USING ERRCODE = '22023';
  END IF;

  CASE p_status
    WHEN 'shipped' THEN
      IF v_text IS NULL THEN RAISE EXCEPTION 'Enter where it is shipped to.' USING ERRCODE = '22023'; END IF;
      IF v_carrier IS NULL THEN RAISE EXCEPTION 'Enter the carrier.' USING ERRCODE = '22023'; END IF;
      v_when := coalesce((d->>'shipped_at')::timestamptz, now());
      UPDATE public.lost_and_found_items
         SET status = 'shipped', shipped_location = v_text, shipping_carrier = v_carrier,
             shipping_tracking = nullif(btrim(coalesce(d->>'shipping_tracking', '')), ''), shipped_at = v_when,
             returned_to = NULL, returned_at = NULL, return_id_checked = NULL, discarded_at = NULL, discard_reason = NULL
       WHERE id = p_id;
      v_line := format('%s (%s) shipped to %s with %s', v_item.item_name, v_item.tracking_number, v_text, v_carrier);
    WHEN 'returned' THEN
      IF v_to IS NULL THEN RAISE EXCEPTION 'Enter who it was returned to.' USING ERRCODE = '22023'; END IF;
      v_when := coalesce((d->>'returned_at')::timestamptz, now());
      UPDATE public.lost_and_found_items
         SET status = 'returned', returned_to = v_to, return_id_checked = coalesce((d->>'return_id_checked')::boolean, false),
             returned_at = v_when, return_info = coalesce(nullif(btrim(coalesce(d->>'return_info', '')), ''), return_info),
             shipped_at = NULL, shipping_carrier = NULL, shipping_tracking = NULL, discarded_at = NULL, discard_reason = NULL
       WHERE id = p_id;
      v_line := format('%s (%s) returned to %s', v_item.item_name, v_item.tracking_number, v_to);
    WHEN 'discarded' THEN
      IF v_reason IS NULL THEN RAISE EXCEPTION 'Give a reason for discarding it.' USING ERRCODE = '22023'; END IF;
      v_when := coalesce((d->>'discarded_at')::timestamptz, now());
      UPDATE public.lost_and_found_items
         SET status = 'discarded', discard_reason = v_reason, discarded_at = v_when,
             shipped_at = NULL, shipping_carrier = NULL, shipping_tracking = NULL, returned_to = NULL, returned_at = NULL, return_id_checked = NULL
       WHERE id = p_id;
      v_line := format('%s (%s) discarded: %s', v_item.item_name, v_item.tracking_number, v_reason);
    ELSE
      UPDATE public.lost_and_found_items
         SET status = 'stored', shipped_at = NULL, shipping_carrier = NULL, shipping_tracking = NULL, shipped_location = NULL,
             returned_to = NULL, returned_at = NULL, return_id_checked = NULL, discarded_at = NULL, discard_reason = NULL
       WHERE id = p_id;
      v_line := format('%s (%s) back in storage', v_item.item_name, v_item.tracking_number);
  END CASE;

  IF v_item.room_id IS NOT NULL THEN
    INSERT INTO public.room_history (hotel_id, room_id, reservation_id, user_id, event_type, description)
    VALUES (v_hotel, v_item.room_id, v_item.reservation_id, auth.uid(), 'lost_and_found', v_line);
  END IF;
END;
$$;

-- ===========================================================================
-- 3. Announcements
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        uuid NOT NULL REFERENCES public.hotels (id),
  sender_id       uuid REFERENCES public.users (id) ON DELETE SET NULL,
  subject         text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 120),
  body            text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  -- {department_ids:[], shift_ids:[], exclude_user_ids:[]}; empty lists = everyone
  audience        jsonb NOT NULL DEFAULT '{}',
  recipient_count integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS announcements_hotel_created ON public.announcements (hotel_id, created_at DESC);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS announcements_select ON public.announcements;
CREATE POLICY announcements_select ON public.announcements FOR SELECT TO authenticated
  USING (hotel_id = (SELECT public.auth_hotel_id()) AND public.auth_has_permission('chat.announce'));
-- No client writes: publish_announcement_v2 inserts.
DROP TRIGGER IF EXISTS update_announcements_updated_at ON public.announcements;
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS announcements_audit_trg ON public.announcements;
CREATE TRIGGER announcements_audit_trg AFTER INSERT OR UPDATE OR DELETE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- Send an announcement to the hotel's active staff, or to some departments and/or
-- shifts, minus anyone excluded. Each gets a 'general' notification (mobile's
-- General inbox) carrying the announcement's id. Returns the announcement's id.
CREATE OR REPLACE FUNCTION public.publish_announcement_v2(
  p_subject text, p_body text, p_department_ids uuid[] DEFAULT NULL, p_shift_ids uuid[] DEFAULT NULL, p_exclude_user_ids uuid[] DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_hotel uuid := public.auth_hotel_id();
  v_subject text := btrim(coalesce(p_subject, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_depts uuid[] := nullif(coalesce(p_department_ids, '{}'), '{}');
  v_shifts uuid[] := nullif(coalesce(p_shift_ids, '{}'), '{}');
  v_id uuid;
  v_count integer;
BEGIN
  IF v_sender IS NULL OR v_hotel IS NULL THEN
    RAISE EXCEPTION 'Not signed in' USING ERRCODE = '42501';
  END IF;
  IF NOT public.auth_has_permission('chat.announce') THEN
    RAISE EXCEPTION 'You are not allowed to publish announcements' USING ERRCODE = '42501';
  END IF;
  IF v_subject = '' OR v_body = '' THEN
    RAISE EXCEPTION 'Subject and message are required' USING ERRCODE = '22023';
  END IF;
  IF char_length(v_subject) > 120 OR char_length(v_body) > 2000 THEN
    RAISE EXCEPTION 'Subject or message is too long' USING ERRCODE = '22001';
  END IF;

  INSERT INTO public.announcements (hotel_id, sender_id, subject, body, audience)
  VALUES (v_hotel, v_sender, v_subject, v_body, jsonb_build_object(
    'department_ids', to_jsonb(coalesce(v_depts, '{}')), 'shift_ids', to_jsonb(coalesce(v_shifts, '{}')),
    'exclude_user_ids', to_jsonb(coalesce(p_exclude_user_ids, '{}'))))
  RETURNING id INTO v_id;

  INSERT INTO public.notifications (user_id, hotel_id, type, title, body, data)
  SELECT u.id, v_hotel, 'general', v_subject, v_body, jsonb_build_object('senderId', v_sender, 'announcementId', v_id)
    FROM public.users u
   WHERE u.hotel_id = v_hotel
     AND u.active
     AND u.id <> v_sender
     AND NOT (u.id = ANY (public.platform_team_ids()))
     AND NOT (u.id = ANY (coalesce(p_exclude_user_ids, '{}')))
     AND (v_depts IS NULL OR u.department_id = ANY (v_depts))
     AND (v_shifts IS NULL OR u.shift_id = ANY (v_shifts));
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Nobody matches that audience.' USING ERRCODE = '22023';
  END IF;
  UPDATE public.announcements SET recipient_count = v_count WHERE id = v_id;
  RETURN v_id;
END;
$$;

-- Mobile's call: everyone (minus exclusions); still returns how many it reached.
CREATE OR REPLACE FUNCTION public.publish_announcement(p_subject text, p_body text, p_exclude_user_ids uuid[] DEFAULT '{}'::uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid := public.publish_announcement_v2(p_subject, p_body, NULL, NULL, p_exclude_user_ids);
BEGIN
  RETURN (SELECT recipient_count FROM public.announcements WHERE id = v_id);
END;
$$;

-- How many got each announcement and how many have read it (chat.announce).
CREATE OR REPLACE FUNCTION public.announcement_stats(p_ids uuid[])
RETURNS TABLE (announcement_id uuid, recipients integer, read integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.auth_has_permission('chat.announce') THEN
    RAISE EXCEPTION 'You are not allowed to see announcements' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT a.id, count(n.id)::integer, (count(n.id) FILTER (WHERE n.read_at IS NOT NULL))::integer
      FROM public.announcements a
      LEFT JOIN public.notifications n ON n.type = 'general' AND n.hotel_id = a.hotel_id AND n.data->>'announcementId' = a.id::text
     WHERE a.id = ANY (p_ids) AND a.hotel_id = public.auth_hotel_id()
     GROUP BY a.id;
END;
$$;

CREATE INDEX IF NOT EXISTS notifications_announcement ON public.notifications ((data->>'announcementId')) WHERE type = 'general';

-- ===========================================================================
-- Realtime and grants
-- ===========================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tickets') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'lost_and_found_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lost_and_found_items;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.lf_set_status(uuid, text, jsonb) FROM public, anon;
REVOKE ALL ON FUNCTION public.publish_announcement_v2(text, text, uuid[], uuid[], uuid[]) FROM public, anon;
REVOKE ALL ON FUNCTION public.publish_announcement(text, text, uuid[]) FROM public, anon;
REVOKE ALL ON FUNCTION public.announcement_stats(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lf_set_status(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_announcement_v2(text, text, uuid[], uuid[], uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_announcement(text, text, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.announcement_stats(uuid[]) TO authenticated;
GRANT SELECT ON public.announcements TO authenticated;
