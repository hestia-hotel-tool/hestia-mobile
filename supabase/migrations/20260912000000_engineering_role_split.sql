-- Engineering gets its own role, and loses the Rooms screen.
--
-- The signed-off spec gives all nine Engineering and IT titles one identical
-- rights vector, which is why they shared the `technical` role. The product
-- decision is that Engineering works from its own ticket dashboard (Figma
-- 3843-52) and never opens the Rooms list, while IT keeps it.
--
-- A right belongs to a role, not a title, so the four Engineering titles need a
-- role of their own. `engineering` is `technical` minus the Rooms right — that
-- is, minus `tab.rooms.view` (the tab, the landing route and the deep link) and
-- `rooms.read` (the room list and room detail routes).
--
-- Note `rooms.read` is client-side UX gating only: the `rooms` RLS policy keys
-- on `hotel_id = auth_hotel_id()`, not on this permission, so the room numbers
-- the engineering Home shows against ticket activity keep resolving.
--
-- The five IT titles stay on `technical` and are untouched.
--
-- The generated seed (20260902000100_rbac_seed.sql) already encodes all of
-- this, but Supabase never re-runs an applied migration, so a deployed database
-- needs the delta spelled out. Same reason as
-- 20260911000000_attendant_rooms_only.sql.

BEGIN;

-- 1. The role. Must exist before any title can point at it.
INSERT INTO public.roles (key, name, description) VALUES
  ('engineering', 'Engineering', 'Engineering. Ticket-driven, works from Home rather than Rooms.')
ON CONFLICT (key) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description;

-- 2. Its grants: everything `technical` holds except the two Rooms keys.
--    Copied from `technical` rather than listed out, so the two roles cannot
--    drift apart on the rights they are meant to share.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT eng.id, rp.permission_id
  FROM public.roles eng
  CROSS JOIN public.roles tech
  JOIN public.role_permissions rp ON rp.role_id = tech.id
  JOIN public.permissions p ON p.id = rp.permission_id
 WHERE eng.key = 'engineering'
   AND tech.key = 'technical'
   AND p.name NOT IN ('tab.rooms.view', 'rooms.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. `technical` keeps IT's description; its own grants are unchanged.
UPDATE public.roles
   SET description = 'IT. Ticket-driven.'
 WHERE key = 'technical';

-- 4. Move the four Engineering titles across.
UPDATE public.job_titles jt
   SET role_id = r.id
  FROM public.roles r
 WHERE r.key = 'engineering'
   AND jt.key IN (
         'director_of_engineering',
         'assistant_director_of_engineering',
         'engineering_supervisor',
         'shift_engineer'
       )
   AND jt.role_id IS DISTINCT FROM r.id;

COMMIT;
