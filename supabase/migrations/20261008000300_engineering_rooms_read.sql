-- Engineering opens a room from its ticket activity (Home → Recent activity →
-- room details). The engineering role had no rooms.read, so the room page
-- was closed to the Director of Engineering and their team. Matches
-- EXTRA_GRANTS in scripts/rbac/parse-spec.py.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.roles r JOIN public.permissions p ON p.name = 'rooms.read'
 WHERE r.key = 'engineering'
ON CONFLICT DO NOTHING;
