-- Lost & Found for line staff: only the items THEY registered, only today
-- (client, 2026-11-20, restating 2026-10-26: "Mei should not see the Lost &
-- Found list created by others or on past dates — only by HER and only
-- TODAY").
--
-- 20261026240000 let line staff (no lost_and_found.read_all) see today's
-- items they registered OR found. "Found" let in items someone else created:
-- a leader registering an item and naming Mei as the finder put it on Mei's
-- list. Now only the registrant sees it. Line staff registering for
-- themselves are both registrant and finder (the form locks both to them), so
-- their own items are unaffected.
--
-- Same signature, so the SELECT and UPDATE policies that call it are
-- unchanged; p_found_by is no longer used.

BEGIN;

CREATE OR REPLACE FUNCTION public.lost_and_found_visible(p_hotel_id uuid, p_registered_by uuid, p_found_by uuid, p_created_at timestamptz)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_hotel_id = public.auth_hotel_id()
     AND (
       public.auth_has_permission('lost_and_found.read_all')
       OR (
         auth.uid() = p_registered_by
         AND public.hotel_service_day(p_hotel_id, p_created_at) = public.hotel_service_day(p_hotel_id, now())
       )
     );
$$;

COMMIT;
