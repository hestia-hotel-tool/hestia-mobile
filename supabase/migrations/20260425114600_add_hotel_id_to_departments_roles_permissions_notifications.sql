-- Multi-tenant: ensure remaining tables are hotel-scoped via hotel_id
-- Adds hotel_id + FK + indexes + tenant-scoped RLS for:
-- - departments, roles, permissions, role_permissions
-- - notifications, user_push_tokens
--
-- NOTE: notifications/user_push_tokens are already isolated by auth.uid() policies,
-- but we add hotel_id for consistency and easier analytics/admin tooling.

DO $$
DECLARE
  default_hotel_id UUID;
BEGIN
  SELECT id INTO default_hotel_id
  FROM public.hotels
  WHERE name = 'Default Hotel'
  LIMIT 1;

  IF default_hotel_id IS NULL THEN
    RAISE EXCEPTION 'Default Hotel not found. Run 20260413090000_hotels_and_user_hotel_id.sql first.';
  END IF;

  -- -------------------------------------------------------------------------
  -- Departments (hotel-owned)
  -- -------------------------------------------------------------------------
  ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS hotel_id UUID;
  UPDATE public.departments SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
  CREATE INDEX IF NOT EXISTS idx_departments_hotel_id ON public.departments(hotel_id);
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'departments_hotel_id_fkey') THEN
    ALTER TABLE public.departments
      ADD CONSTRAINT departments_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
  END IF;
  ALTER TABLE public.departments ALTER COLUMN hotel_id SET NOT NULL;

  -- Make department names unique per hotel (instead of globally unique)
  ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_name_key;
  ALTER TABLE public.departments
    ADD CONSTRAINT departments_hotel_name_key UNIQUE (hotel_id, name);

  -- -------------------------------------------------------------------------
  -- Roles (hotel-owned)
  -- -------------------------------------------------------------------------
  ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS hotel_id UUID;
  UPDATE public.roles SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
  CREATE INDEX IF NOT EXISTS idx_roles_hotel_id ON public.roles(hotel_id);
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_hotel_id_fkey') THEN
    ALTER TABLE public.roles
      ADD CONSTRAINT roles_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
  END IF;
  ALTER TABLE public.roles ALTER COLUMN hotel_id SET NOT NULL;

  -- Optional but helpful: unique role name per hotel
  ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_name_key;
  ALTER TABLE public.roles
    ADD CONSTRAINT roles_hotel_name_key UNIQUE (hotel_id, name);

  -- -------------------------------------------------------------------------
  -- Permissions (hotel-owned)
  -- -------------------------------------------------------------------------
  ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS hotel_id UUID;
  UPDATE public.permissions SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
  CREATE INDEX IF NOT EXISTS idx_permissions_hotel_id ON public.permissions(hotel_id);
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'permissions_hotel_id_fkey') THEN
    ALTER TABLE public.permissions
      ADD CONSTRAINT permissions_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
  END IF;
  ALTER TABLE public.permissions ALTER COLUMN hotel_id SET NOT NULL;

  -- permissions.name was globally unique; make it unique per hotel
  ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_name_key;
  ALTER TABLE public.permissions
    ADD CONSTRAINT permissions_hotel_name_key UNIQUE (hotel_id, name);

  -- -------------------------------------------------------------------------
  -- Role permissions (hotel-owned join table)
  -- -------------------------------------------------------------------------
  ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS hotel_id UUID;
  UPDATE public.role_permissions rp
  SET hotel_id = COALESCE(r.hotel_id, p.hotel_id, default_hotel_id)
  FROM public.roles r, public.permissions p
  WHERE rp.hotel_id IS NULL
    AND r.id = rp.role_id
    AND p.id = rp.permission_id;
  UPDATE public.role_permissions SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
  CREATE INDEX IF NOT EXISTS idx_role_permissions_hotel_id ON public.role_permissions(hotel_id);
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_hotel_id_fkey') THEN
    ALTER TABLE public.role_permissions
      ADD CONSTRAINT role_permissions_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
  END IF;
  ALTER TABLE public.role_permissions ALTER COLUMN hotel_id SET NOT NULL;

  -- -------------------------------------------------------------------------
  -- Notifications (hotel-owned for consistency)
  -- -------------------------------------------------------------------------
  ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS hotel_id UUID;
  UPDATE public.notifications n
  SET hotel_id = COALESCE(u.hotel_id, default_hotel_id)
  FROM public.users u
  WHERE n.hotel_id IS NULL AND u.id = n.user_id;
  UPDATE public.notifications SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
  CREATE INDEX IF NOT EXISTS idx_notifications_hotel_id ON public.notifications(hotel_id);
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_hotel_id_fkey') THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
  END IF;
  ALTER TABLE public.notifications ALTER COLUMN hotel_id SET NOT NULL;

  -- -------------------------------------------------------------------------
  -- User push tokens (hotel-owned for consistency)
  -- -------------------------------------------------------------------------
  ALTER TABLE public.user_push_tokens ADD COLUMN IF NOT EXISTS hotel_id UUID;
  UPDATE public.user_push_tokens upt
  SET hotel_id = COALESCE(u.hotel_id, default_hotel_id)
  FROM public.users u
  WHERE upt.hotel_id IS NULL AND u.id = upt.user_id;
  UPDATE public.user_push_tokens SET hotel_id = default_hotel_id WHERE hotel_id IS NULL;
  CREATE INDEX IF NOT EXISTS idx_user_push_tokens_hotel_id ON public.user_push_tokens(hotel_id);
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_push_tokens_hotel_id_fkey') THEN
    ALTER TABLE public.user_push_tokens
      ADD CONSTRAINT user_push_tokens_hotel_id_fkey FOREIGN KEY (hotel_id) REFERENCES public.hotels(id) ON DELETE RESTRICT;
  END IF;
  ALTER TABLE public.user_push_tokens ALTER COLUMN hotel_id SET NOT NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Tenant-scoped RLS for newly hotel-owned tables
-- ---------------------------------------------------------------------------

-- Departments
DROP POLICY IF EXISTS "Authenticated users can read departments" ON public.departments;
DROP POLICY IF EXISTS "Hotel users can read departments" ON public.departments;
CREATE POLICY "Hotel users can read departments" ON public.departments
  FOR SELECT TO authenticated
  USING (hotel_id = public.auth_hotel_id());

-- Roles
DROP POLICY IF EXISTS "Authenticated users can read roles" ON public.roles;
DROP POLICY IF EXISTS "Hotel users can read roles" ON public.roles;
CREATE POLICY "Hotel users can read roles" ON public.roles
  FOR SELECT TO authenticated
  USING (hotel_id = public.auth_hotel_id());

-- Permissions
DROP POLICY IF EXISTS "Authenticated users can read permissions" ON public.permissions;
DROP POLICY IF EXISTS "Hotel users can read permissions" ON public.permissions;
CREATE POLICY "Hotel users can read permissions" ON public.permissions
  FOR SELECT TO authenticated
  USING (hotel_id = public.auth_hotel_id());

-- Role permissions
DROP POLICY IF EXISTS "Authenticated users can read role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Hotel users can read role_permissions" ON public.role_permissions;
CREATE POLICY "Hotel users can read role_permissions" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (hotel_id = public.auth_hotel_id());

