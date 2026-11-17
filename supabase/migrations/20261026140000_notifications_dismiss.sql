-- Deleting General and Task notifications from your inbox (client request,
-- 2026-10-26).
--
-- A dismiss, not a DELETE: the row stays, so the back office's announcement
-- statistics (delivered / read, which join notifications —
-- 20261017090000_backoffice_operations.sql) keep counting it. The person no
-- longer sees it: inbox lists filter `dismissed_at IS NULL`. Dismissing also
-- marks it read, so every unread badge (which counts read_at IS NULL) drops it
-- with no further change.

BEGIN;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;
CREATE INDEX IF NOT EXISTS notifications_user_visible_idx
  ON public.notifications (user_id, type, created_at DESC) WHERE dismissed_at IS NULL;

-- p_ids: these notifications; or p_types: every one of these types (Delete all).
-- Only the caller's own rows. Returns how many were dismissed.
CREATE OR REPLACE FUNCTION public.notifications_dismiss(p_ids uuid[] DEFAULT NULL, p_types text[] DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_n   integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;
  IF p_ids IS NULL AND p_types IS NULL THEN
    RETURN 0;
  END IF;
  UPDATE public.notifications
     SET dismissed_at = now(), read_at = coalesce(read_at, now())
   WHERE user_id = v_uid
     AND dismissed_at IS NULL
     AND (p_ids IS NULL OR id = ANY (p_ids))
     AND (p_types IS NULL OR type = ANY (p_types));
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.notifications_dismiss(uuid[], text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.notifications_dismiss(uuid[], text[]) TO authenticated;

COMMIT;
