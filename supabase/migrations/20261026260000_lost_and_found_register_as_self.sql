-- Housekeeping line staff register lost & found items as themselves (client
-- change, 2026-10-26): when a room attendant — or a porter, laundry or public
-- area attendant, the staff without lost_and_found.read_all — registers an
-- item, Found by and Registered by are both them. The app shows them fixed
-- with no picker; this holds it on the server too.
--
-- Everyone with lost_and_found.read_all (leaders, Front Office, Concierge, …)
-- may still register on someone's behalf.

BEGIN;

DROP POLICY IF EXISTS "Hotel users can register lost_and_found" ON public.lost_and_found_items;
CREATE POLICY "Hotel users can register lost_and_found" ON public.lost_and_found_items
  FOR INSERT
  WITH CHECK (
    hotel_id = (SELECT public.auth_hotel_id())
    AND (
      public.auth_has_permission('lost_and_found.read_all')
      OR (
        coalesce(found_by_id, (SELECT auth.uid())) = (SELECT auth.uid())
        AND coalesce(registered_by_id, (SELECT auth.uid())) = (SELECT auth.uid())
      )
    )
  );

COMMIT;
