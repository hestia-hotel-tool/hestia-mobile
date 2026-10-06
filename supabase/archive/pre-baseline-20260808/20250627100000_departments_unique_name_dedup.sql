-- Ensure departments.name is unique and remove duplicate departments
-- 0. Normalize names (trim) so " Engineering " and "Engineering" are treated as same
-- 1. Reassign users and tickets from duplicate department rows to the canonical row (smallest id per name)
-- 2. Delete duplicate department rows so only one row per name remains
-- 3. Enforce UNIQUE(name) on departments
-- Note: PostgreSQL has no min(uuid), so we use DISTINCT ON (name) ORDER BY name, id to pick canonical row.

-- 0. Normalize department names (trim whitespace)
UPDATE public.departments SET name = trim(name) WHERE name <> trim(name);

-- 1. Point users at the canonical department when they reference a duplicate
UPDATE public.users u
SET department_id = canon.id
FROM public.departments d
JOIN (
  SELECT DISTINCT ON (name) name, id
  FROM public.departments
  ORDER BY name, id
) canon ON canon.name = d.name AND canon.id <> d.id
WHERE u.department_id = d.id;

-- 2a. Point tickets at the canonical department when they reference a duplicate
UPDATE public.tickets t
SET department_id = canon.id
FROM public.departments d
JOIN (
  SELECT DISTINCT ON (name) name, id
  FROM public.departments
  ORDER BY name, id
) canon ON canon.name = d.name AND canon.id <> d.id
WHERE t.department_id = d.id;

-- 2b. Delete every department row that is NOT in the canonical set (exactly one per name)
DELETE FROM public.departments
WHERE (name, id) NOT IN (
  SELECT name, id
  FROM (
    SELECT DISTINCT ON (name) name, id
    FROM public.departments
    ORDER BY name, id
  ) canon
);

-- 3. Ensure unique constraint on name (idempotent)
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_name_key;
ALTER TABLE public.departments ADD CONSTRAINT departments_name_key UNIQUE (name);

COMMENT ON CONSTRAINT departments_name_key ON public.departments IS 'Department name must be unique across the table.';
