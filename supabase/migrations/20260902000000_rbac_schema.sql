-- RBAC schema: stable keys, job titles, and permission resolution.
--
-- Context
-- -------
-- The app's roles/permissions tables exist but are joined on `name`, a
-- human-readable display string. That is what produced the `IT Manager` vs
-- `IT Administrator` mismatch, where the seed and the client disagreed on the
-- spelling and the affected user silently lost every tab but two. A `key`
-- column existed once (20250606000003) and was dropped again
-- (20250606000004) in favour of `name`; this restores it deliberately, with
-- `name` kept purely for display.
--
-- The signed-off spec defines 54 job titles, but they collapse to 11 distinct
-- permission profiles. `job_titles` carries the display identity and points at
-- the role that carries the rights, so we maintain 208 grants instead of 972.
--
-- Idempotent and safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Stable keys on reference data
-- ---------------------------------------------------------------------------

ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE public.roles       ADD COLUMN IF NOT EXISTS key text;

DO $$
BEGIN
  ALTER TABLE public.departments ADD CONSTRAINT departments_key_key UNIQUE (key);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.roles ADD CONSTRAINT roles_key_key UNIQUE (key);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.departments.key IS
  'Stable identifier. Join on this, never on name.';
COMMENT ON COLUMN public.roles.key IS
  'Stable identifier. Join on this, never on name.';

-- ---------------------------------------------------------------------------
-- 2. Reconcile existing departments with the spec's eight
--
-- The previous seed treated `HSK Portier`, `Laundry` and `Reception` as
-- departments. In the spec they are job titles inside Housekeeping and Front
-- Office, and there was no Housekeeping department at all.
-- ---------------------------------------------------------------------------

-- Backfill keys onto departments that map 1:1 by name.
UPDATE public.departments d
   SET key = m.key
  FROM (VALUES
    ('Engineering',              'engineering'),
    ('IT',                       'it'),
    ('Concierge',                'concierge'),
    ('Front Office',             'front_office'),
    ('In Room Dining',           'in_room_dining'),
    ('Executive Administration', 'executive'),
    ('Food and Beverage',        'food_beverage')
  ) AS m(name, key)
 WHERE d.name = m.name
   AND d.key IS NULL;

-- Housekeeping was missing entirely. If a row with that name already exists
-- without a key, adopt it rather than creating a duplicate (name is UNIQUE).
INSERT INTO public.departments (key, name, description)
VALUES ('housekeeping', 'Housekeeping',
        'Room attendants, supervisors and housekeeping leadership')
ON CONFLICT (name) DO UPDATE
  SET key = EXCLUDED.key
  WHERE departments.key IS NULL;

-- Repoint anyone sitting in a department that is really a job title, then drop
-- those rows. users.department_id is ON DELETE SET NULL, so this must run first.
UPDATE public.users u
   SET department_id = (
     SELECT d.id
       FROM public.departments d
      WHERE d.key = CASE old.name
                      WHEN 'Reception' THEN 'front_office'
                      ELSE 'housekeeping'
                    END
   )
  FROM public.departments old
 WHERE u.department_id = old.id
   AND old.name IN ('HSK Portier', 'Laundry', 'Reception');

DELETE FROM public.departments
 WHERE name IN ('HSK Portier', 'Laundry', 'Reception')
   AND key IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Job titles — display identity, mapped onto a role
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.job_titles (
  id            uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  key           text NOT NULL UNIQUE,
  name          text NOT NULL,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
  role_id       uuid NOT NULL REFERENCES public.roles(id)       ON DELETE RESTRICT,
  -- Which HomeScreen layout this title sees. A presentation concern, not a
  -- right: it replaces the `department === 'engineering'` string comparison in
  -- HomeScreen. Lives on the title rather than the role because it describes
  -- what a person's day looks like, not what they are allowed to do.
  home_variant  text NOT NULL DEFAULT 'default'
                CHECK (home_variant IN ('default', 'engineering', 'hsk_portier')),
  -- Same idea for the Rooms list: supervisors read it grouped by housekeeping
  -- status with In Progress pinned, leadership reads it flat. Declared here so a
  -- fresh database has the column before the seed populates it; existing
  -- databases pick it up from 20260907000000_rooms_variant.sql instead.
  rooms_variant text NOT NULL DEFAULT 'default'
                CHECK (rooms_variant IN ('default', 'supervisor', 'attendant')),
  created_at    timestamp with time zone DEFAULT now(),
  updated_at    timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_titles_role       ON public.job_titles(role_id);
CREATE INDEX IF NOT EXISTS idx_job_titles_department ON public.job_titles(department_id);

DROP TRIGGER IF EXISTS update_job_titles_updated_at ON public.job_titles;
CREATE TRIGGER update_job_titles_updated_at
  BEFORE UPDATE ON public.job_titles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reference data, same posture as roles/permissions/departments: readable by
-- any authenticated user, writable only by service_role.
ALTER TABLE public.job_titles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read job_titles" ON public.job_titles;
CREATE POLICY "Authenticated users can read job_titles" ON public.job_titles
  FOR SELECT TO authenticated USING (true);

REVOKE ALL ON TABLE public.job_titles FROM anon;
GRANT SELECT ON TABLE public.job_titles TO authenticated;
GRANT ALL    ON TABLE public.job_titles TO service_role;

-- ---------------------------------------------------------------------------
-- 4. users.job_title_id
--
-- Permissions resolve users -> job_titles -> roles -> role_permissions.
-- `users.role_id` is left in place but is no longer read; it is dropped in a
-- follow-up migration once nothing references it.
-- ---------------------------------------------------------------------------

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title_id uuid;

DO $$
BEGIN
  ALTER TABLE public.users
    ADD CONSTRAINT users_job_title_id_fkey
    FOREIGN KEY (job_title_id) REFERENCES public.job_titles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_job_title ON public.users(job_title_id);

COMMENT ON COLUMN public.users.job_title_id IS
  'Source of the user''s permissions, via job_titles.role_id.';
COMMENT ON COLUMN public.users.role_id IS
  'DEPRECATED — superseded by job_title_id. Not read by the app.';

-- ---------------------------------------------------------------------------
-- 5. Permission resolution
--
-- Same hardening as the existing auth_hotel_id(): STABLE SECURITY DEFINER with
-- a pinned search_path, so the function cannot be hijacked by a caller-supplied
-- schema.
-- ---------------------------------------------------------------------------

-- One round trip, called once per session by the client. Everything after that
-- is an O(1) set lookup.
CREATE OR REPLACE FUNCTION public.get_my_permissions() RETURNS text[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT coalesce(array_agg(DISTINCT p.name), '{}')
  FROM public.users u
  JOIN public.job_titles jt       ON jt.id = u.job_title_id
  JOIN public.role_permissions rp ON rp.role_id = jt.role_id
  JOIN public.permissions p       ON p.id = rp.permission_id
  WHERE u.id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_my_permissions() IS
  'Flat permission keys for the calling user. Returns {} when no job title is assigned — fail closed.';

-- The security boundary. Use in RLS policies alongside the hotel_id check, so
-- tenancy and role are both enforced server-side.
CREATE OR REPLACE FUNCTION public.auth_has_permission(p_key text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.job_titles jt       ON jt.id = u.job_title_id
    JOIN public.role_permissions rp ON rp.role_id = jt.role_id
    JOIN public.permissions p       ON p.id = rp.permission_id
    WHERE u.id = auth.uid() AND p.name = p_key
  );
$$;

COMMENT ON FUNCTION public.auth_has_permission(text) IS
  'True when the calling user holds the permission. For use in RLS policies.';

-- The user's home layout variant, so HomeScreen stops comparing department
-- display strings.
CREATE OR REPLACE FUNCTION public.get_my_home_variant() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT coalesce(jt.home_variant, 'default')
  FROM public.users u
  LEFT JOIN public.job_titles jt ON jt.id = u.job_title_id
  WHERE u.id = auth.uid();
$$;

ALTER FUNCTION public.get_my_permissions()          OWNER TO postgres;
ALTER FUNCTION public.auth_has_permission(text)     OWNER TO postgres;
ALTER FUNCTION public.get_my_home_variant()         OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.get_my_permissions()      TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_has_permission(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_home_variant()     TO authenticated;

COMMIT;
