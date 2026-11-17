-- Engineering gets the Rooms tab back.
--
-- 20260912000000_engineering_role_split took `tab.rooms.view` and `rooms.read`
-- away from Engineering (it worked only from its ticket dashboard). `rooms.read`
-- came back for opening a room from ticket activity; the redrawn engineering
-- Home (Figma 3843:52) now lists Floors with "View Rooms", which opens the Rooms
-- tab on that floor (Figma 4684:62) — so the tab itself is granted again.
--
-- Client gating only, as before: the `rooms` RLS policy keys on the hotel, not
-- on this permission. Mirrors EXTRA_GRANTS in scripts/rbac/parse-spec.py.

BEGIN;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.roles r
  JOIN public.permissions p ON p.name IN ('tab.rooms.view', 'rooms.read')
 WHERE r.key = 'engineering'
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
