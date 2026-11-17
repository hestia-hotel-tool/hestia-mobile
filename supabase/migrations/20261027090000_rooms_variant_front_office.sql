-- Front Office gets its own Rooms layout, `front_office` (Figma 3859:1919).
--
-- Until now the department read `leadership` — housekeeping leadership's banded
-- list. The Front Office frame dresses that list differently: a coloured status
-- cap on Paused and In Progress cards, the Dirty / Cleaned / Inspected bands
-- gathered in a tray, "Started: / Time: N mins" where housekeeping reads
-- credits, and status pills without the menu chevron. A variant of its own
-- keeps those differences out of housekeeping's screen.
--
-- Presentation only: rights and role_permissions are unchanged.
--
-- The base schema (20260902000000) lists the value too, so a fresh install
-- accepts the seed; this delta is for databases that already ran it.

BEGIN;

ALTER TABLE public.job_titles
  DROP CONSTRAINT IF EXISTS job_titles_rooms_variant_check;
ALTER TABLE public.job_titles
  ADD CONSTRAINT job_titles_rooms_variant_check
  CHECK (rooms_variant IN ('default', 'leadership', 'supervisor', 'attendant', 'front_office'));

UPDATE public.job_titles jt
   SET rooms_variant = 'front_office'
  FROM public.departments d
 WHERE d.id = jt.department_id
   AND d.key = 'front_office'
   AND jt.rooms_variant IS DISTINCT FROM 'front_office';

COMMIT;
