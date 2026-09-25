-- General Announcements — Figma 4241:405.
--
-- A member of leadership writes a subject and a message, optionally leaves some
-- staff out, and publishes. Everyone else in their hotel gets it as a `general`
-- notification, which is what the Chat list's "General" row reads.
--
-- ## Why a function, not an INSERT policy
--
-- `notifications` has no INSERT policy: rows are written server-side only, so
-- nobody can drop a notice into a colleague's inbox from the client. Opening a
-- policy for this would let any holder of the permission write *any* row for
-- *any* user. A SECURITY DEFINER function writes exactly one shape — type
-- `general`, the caller as sender, recipients drawn from the caller's own hotel
-- — and nothing else.
--
-- ## The permission
--
-- `chat.announce` is granted to full_access and ops_senior (see EXTRA_GRANTS in
-- scripts/rbac/parse-spec.py). The regenerated seed carries the same rows, but
-- that migration has already run, so the grant is repeated here.

INSERT INTO public.permissions (name, description) VALUES
  ('chat.announce', 'Publish a General Announcement to all staff')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.roles r
  JOIN public.permissions p ON p.name = 'chat.announce'
 WHERE r.key IN ('full_access', 'ops_senior')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.publish_announcement(
  p_subject text,
  p_body text,
  p_exclude_user_ids uuid[] DEFAULT '{}'
) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_sender uuid := auth.uid();
  v_hotel uuid := public.auth_hotel_id();
  v_subject text := btrim(coalesce(p_subject, ''));
  v_body text := btrim(coalesce(p_body, ''));
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
  IF length(v_subject) > 120 OR length(v_body) > 2000 THEN
    RAISE EXCEPTION 'Subject or message is too long' USING ERRCODE = '22001';
  END IF;

  INSERT INTO public.notifications (user_id, hotel_id, type, title, body, data)
  SELECT u.id, v_hotel, 'general', v_subject, v_body,
         jsonb_build_object('senderId', v_sender)
    FROM public.users u
   WHERE u.hotel_id = v_hotel
     AND u.id <> v_sender
     AND NOT (u.id = ANY (coalesce(p_exclude_user_ids, '{}')));

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.publish_announcement(text, text, uuid[]) IS
  'Send a `general` notification to every user in the caller''s hotel except the caller and p_exclude_user_ids. Requires chat.announce. Returns the number of recipients.';

ALTER FUNCTION public.publish_announcement(text, text, uuid[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.publish_announcement(text, text, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_announcement(text, text, uuid[]) TO authenticated;
