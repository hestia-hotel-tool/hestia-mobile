-- Revert roles/permissions/departments to be GLOBAL (shared across hotels)
-- and remove hotel_id scoping introduced in 20260425114600_*.
--
-- This keeps hotels/users/other operational tables tenant-scoped,
-- but makes the "catalog" tables shared.

-- ---------------------------------------------------------------------------
-- Drop tenant-scoped policies that depend on hotel_id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Hotel users can read departments" ON public.departments;
DROP POLICY IF EXISTS "Hotel users can read roles" ON public.roles;
DROP POLICY IF EXISTS "Hotel users can read permissions" ON public.permissions;
DROP POLICY IF EXISTS "Hotel users can read role_permissions" ON public.role_permissions;

-- ---------------------------------------------------------------------------
-- Departments: remove hotel_id + restore global uniqueness on name
-- ---------------------------------------------------------------------------
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_hotel_name_key;
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_hotel_id_fkey;
DROP INDEX IF EXISTS public.idx_departments_hotel_id;
ALTER TABLE public.departments DROP COLUMN IF EXISTS hotel_id;

ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_name_key;
ALTER TABLE public.departments
  ADD CONSTRAINT departments_name_key UNIQUE (name);

-- ---------------------------------------------------------------------------
-- Roles: remove hotel_id + restore global uniqueness on name
-- ---------------------------------------------------------------------------
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_hotel_name_key;
ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_hotel_id_fkey;
DROP INDEX IF EXISTS public.idx_roles_hotel_id;
ALTER TABLE public.roles DROP COLUMN IF EXISTS hotel_id;

ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_name_key;
ALTER TABLE public.roles
  ADD CONSTRAINT roles_name_key UNIQUE (name);

-- ---------------------------------------------------------------------------
-- Permissions: remove hotel_id + restore global uniqueness on name
-- ---------------------------------------------------------------------------
ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_hotel_name_key;
ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_hotel_id_fkey;
DROP INDEX IF EXISTS public.idx_permissions_hotel_id;
ALTER TABLE public.permissions DROP COLUMN IF EXISTS hotel_id;

ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_name_key;
ALTER TABLE public.permissions
  ADD CONSTRAINT permissions_name_key UNIQUE (name);

-- ---------------------------------------------------------------------------
-- Role permissions: remove hotel_id (keep existing PK on (role_id, permission_id))
-- ---------------------------------------------------------------------------
ALTER TABLE public.role_permissions DROP CONSTRAINT IF EXISTS role_permissions_hotel_id_fkey;
DROP INDEX IF EXISTS public.idx_role_permissions_hotel_id;
ALTER TABLE public.role_permissions DROP COLUMN IF EXISTS hotel_id;

-- ---------------------------------------------------------------------------
-- Restore global read policies (idempotent)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read departments" ON public.departments;
CREATE POLICY "Authenticated users can read departments" ON public.departments
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.roles;
CREATE POLICY "Authenticated users can read roles" ON public.roles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can read permissions" ON public.permissions;
CREATE POLICY "Authenticated users can read permissions" ON public.permissions
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can read role_permissions" ON public.role_permissions;
CREATE POLICY "Authenticated users can read role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);

