-- Attendants work from the Rooms list and never see Home.
--
-- Housekeeping Room Attendant, Porter/Houseman, Laundry Attendant and Public
-- Area Attendant lose the Home tab and get the Rooms list narrowed to their own
-- assignments — Figma 3838-1623, whose tab bar starts at Rooms.
--
-- `tab.home.view` is the sole source of the Home tab, the Home landing route
-- and the Home deep link, so revoking it removes all three together. The room
-- attendant never had it; the other three do.
--
-- Public Area additionally *gains* the Rooms right. The signed-off spec gives
-- that title no Rooms tab at all, so this is a widening rather than a
-- narrowing, and the matching note lives in scripts/rbac/parse-spec.py.
--
-- Each of these four roles maps to exactly one job title, so nothing else is
-- affected.
--
-- The generated seed (20260902000100_rbac_seed.sql) already encodes all of
-- this, but Supabase never re-runs an applied migration, so a deployed database
-- needs the delta spelled out. Same reason as
-- 20260910000000_rooms_variant_leadership.sql.

BEGIN;

-- 1. Revoke Home.
DELETE FROM public.role_permissions rp
 USING public.roles r, public.permissions p
 WHERE rp.role_id = r.id
   AND rp.permission_id = p.id
   AND r.key IN ('hk_houseman', 'hk_laundry', 'hk_public_area')
   AND p.name = 'tab.home.view';

-- 2. Grant Public Area the Rooms right (both permissions it expands to).
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.roles r
  CROSS JOIN public.permissions p
 WHERE r.key = 'hk_public_area'
   AND p.name IN ('tab.rooms.view', 'rooms.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. Give the other three attendant titles the attendant Rooms layout.
--    'attendant' is already an allowed value, so the CHECK needs no widening.
UPDATE public.job_titles jt
   SET rooms_variant = 'attendant'
 WHERE jt.key IN (
         'housekeeping_porter_houseman',
         'housekeeping_laundry_attendant',
         'housekeeping_public_area_attendant'
       )
   AND jt.rooms_variant IS DISTINCT FROM 'attendant';

COMMIT;
