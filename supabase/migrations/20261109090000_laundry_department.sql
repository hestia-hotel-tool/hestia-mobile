-- Executive and Administration becomes the Laundry department (client,
-- 2026-11-09).
--
--   1. Its staff are deleted: the two Hotel Managers, Elena Hofmann (Badrutt's
--      Palace) and Amina Diallo (Palm Haven). Checked before writing this: they
--      had created no tickets, chats, messages, Lost & Found items,
--      consumptions, assignments or sessions, so the cascade from auth.users
--      removes nothing else.
--   2. The Hotel Manager job title goes with them: nobody holds it, and it
--      would otherwise sit in the Laundry department.
--   3. The department is renamed in place — key `executive` -> `laundry`,
--      name "Laundry" — so its id (and anything pointing at it) is kept.
--   4. The laundry attendants leave Housekeeping: the job title moves to
--      Laundry and is renamed "Laundry Attendant". Its key stays
--      `housekeeping_laundry_attendant`: the laundry Rooms view, the role
--      (`hk_laundry`) and the client fallback all hang off it.
--   5. Hotel-wide ticket rights belonged to the lead of `executive` (the Hotel
--      Manager). That department is gone, so only platform admins keep them —
--      otherwise a future Laundry lead would inherit them by accident.
--
-- Irreversible for the deleted accounts (step 1).

BEGIN;

-- 1. Delete the department's staff (auth.users cascades to public.users).
DELETE FROM auth.users
 WHERE id IN (
   SELECT u.id
     FROM public.users u
     LEFT JOIN public.job_titles jt ON jt.id = u.job_title_id
     JOIN public.departments d ON d.id = coalesce(jt.department_id, u.department_id)
    WHERE d.key = 'executive'
 );

-- Anyone left with a bare department_id pointing there (no title).
DELETE FROM auth.users
 WHERE id IN (
   SELECT u.id FROM public.users u
     JOIN public.departments d ON d.id = u.department_id
    WHERE d.key = 'executive'
 );

-- 2. The Hotel Manager title.
DELETE FROM public.job_titles WHERE key = 'hotel_manager';

-- 3. Executive and Administration -> Laundry.
-- On a database built from scratch the regenerated RBAC seed has already
-- created `laundry` beside `executive`; then `executive`'s references move
-- over and it is dropped. On the live database it is renamed in place.
DO $$
DECLARE
  v_exec uuid := (SELECT id FROM public.departments WHERE key = 'executive');
  v_laundry uuid := (SELECT id FROM public.departments WHERE key = 'laundry');
BEGIN
  IF v_exec IS NULL THEN
    RETURN;
  END IF;
  IF v_laundry IS NULL THEN
    UPDATE public.departments
       SET key = 'laundry',
           name = 'Laundry',
           description = 'Linen, uniforms and guest laundry',
           updated_at = now()
     WHERE id = v_exec;
  ELSE
    UPDATE public.job_titles SET department_id = v_laundry WHERE department_id = v_exec;
    UPDATE public.users SET department_id = v_laundry WHERE department_id = v_exec;
    UPDATE public.tickets SET department_id = v_laundry WHERE department_id = v_exec;
    DELETE FROM public.departments WHERE id = v_exec;
  END IF;
END;
$$;

-- 4. Laundry attendants: out of Housekeeping, into Laundry.
UPDATE public.job_titles
   SET department_id = (SELECT id FROM public.departments WHERE key = 'laundry'),
       name = 'Laundry Attendant',
       updated_at = now()
 WHERE key = 'housekeeping_laundry_attendant';

-- users.department_id is a legacy copy of the title's department; keep it in step.
UPDATE public.users u
   SET department_id = jt.department_id,
       updated_at = now()
  FROM public.job_titles jt
 WHERE jt.id = u.job_title_id
   AND jt.key = 'housekeeping_laundry_attendant'
   AND u.department_id IS DISTINCT FROM jt.department_id;

-- 5. Hotel-wide ticket rights: platform admins only.
CREATE OR REPLACE FUNCTION public.auth_tickets_hotel_wide()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.is_platform_admin();
$$;

COMMENT ON COLUMN public.job_titles.is_department_lead IS
  'Heads and managers of the department: may reassign its tickets.';

COMMIT;
