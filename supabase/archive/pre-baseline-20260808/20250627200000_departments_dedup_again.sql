-- Deduplicate departments (idempotent: safe to run even if 20250627100000 already ran)
-- Use this if duplicates remain: normalizes name, reassigns FKs to canonical row, deletes extras, enforces UNIQUE(name).

-- Normalize names
UPDATE public.departments SET name = trim(name) WHERE name <> trim(name);

-- Reassign users to canonical department per name
UPDATE public.users u
SET department_id = canon.id
FROM public.departments d
JOIN (
  SELECT DISTINCT ON (name) name, id
  FROM public.departments
  ORDER BY name, id
) canon ON canon.name = d.name AND canon.id <> d.id
WHERE u.department_id = d.id;

-- Reassign tickets to canonical department per name
UPDATE public.tickets t
SET department_id = canon.id
FROM public.departments d
JOIN (
  SELECT DISTINCT ON (name) name, id
  FROM public.departments
  ORDER BY name, id
) canon ON canon.name = d.name AND canon.id <> d.id
WHERE t.department_id = d.id;

-- Keep only one row per name (canonical = smallest id per name)
DELETE FROM public.departments
WHERE (name, id) NOT IN (
  SELECT name, id
  FROM (
    SELECT DISTINCT ON (name) name, id
    FROM public.departments
    ORDER BY name, id
  ) canon
);

-- Enforce unique name
ALTER TABLE public.departments DROP CONSTRAINT IF EXISTS departments_name_key;
ALTER TABLE public.departments ADD CONSTRAINT departments_name_key UNIQUE (name);
