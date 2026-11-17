-- Lost & Found visibility for housekeeping line staff (tester feedback,
-- 2026-10-26: "Mei should not see the Lost & Found list created by others or
-- on past dates — only by HER and only TODAY").
--
-- With lost_and_found.read_all (every leader, Front Office, Concierge,
-- Engineering, IT, In Room Dining, F&B — scripts/rbac/parse-spec.py) nothing
-- changes: the whole hotel's items. Without it — Room Attendant, Porter /
-- Houseman, Laundry, Public Area — only the items they registered or found,
-- on today's service day (hotel_service_day: the hotel's day, not UTC's).
--
-- Enforced by RLS, so the list, an item's page, a room's lost & found badge,
-- realtime and the assistant all follow it. Registering is unchanged; an
-- update is allowed on what one can see.

BEGIN;

-- 1. Permission -------------------------------------------------------------------
INSERT INTO public.permissions (name, description)
VALUES ('lost_and_found.read_all', 'See every lost & found item, not only your own from today')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.roles r JOIN public.permissions p ON p.name = 'lost_and_found.read_all'
 WHERE r.key IN ('full_access', 'ops_senior', 'fo_agent', 'concierge_agent',
                 'ird_service', 'technical', 'fnb_kitchen', 'engineering')
ON CONFLICT DO NOTHING;

-- 2. Who may see an item ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lost_and_found_visible(p_hotel_id uuid, p_registered_by uuid, p_found_by uuid, p_created_at timestamptz)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_hotel_id = public.auth_hotel_id()
     AND (
       public.auth_has_permission('lost_and_found.read_all')
       OR (
         auth.uid() IN (p_registered_by, p_found_by)
         AND public.hotel_service_day(p_hotel_id, p_created_at) = public.hotel_service_day(p_hotel_id, now())
       )
     );
$$;
REVOKE ALL ON FUNCTION public.lost_and_found_visible(uuid, uuid, uuid, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lost_and_found_visible(uuid, uuid, uuid, timestamptz) TO authenticated;

DROP POLICY IF EXISTS "Hotel users can read lost_and_found" ON public.lost_and_found_items;
CREATE POLICY "Hotel users can read lost_and_found" ON public.lost_and_found_items
  FOR SELECT USING (public.lost_and_found_visible(hotel_id, registered_by_id, found_by_id, created_at));

DROP POLICY IF EXISTS "Hotel users can update lost_and_found" ON public.lost_and_found_items;
CREATE POLICY "Hotel users can update lost_and_found" ON public.lost_and_found_items
  FOR UPDATE
  USING (public.lost_and_found_visible(hotel_id, registered_by_id, found_by_id, created_at))
  WITH CHECK (hotel_id = (SELECT public.auth_hotel_id()));

COMMIT;
