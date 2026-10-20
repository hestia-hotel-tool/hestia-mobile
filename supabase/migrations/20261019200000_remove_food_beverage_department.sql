-- The client does not use Food & Beverage / Kitchen (2026-10-19): its one
-- title (F&B / Kitchen Staff) and the department itself are removed.
-- scripts/rbac/parse-spec.py keeps both out of the seed; this removes them
-- from databases seeded before that.
--
-- The `fnb_kitchen` role stays (it is part of the generated matrix); it just
-- has no titles.
--
-- Refuses to run while anyone still holds the title or sits in the
-- department, or a ticket is routed to it: users.job_title_id and
-- users/tickets.department_id are ON DELETE SET NULL, and a person with no
-- title has no permissions, a ticket with no department reaches nobody.

BEGIN;

DO $$
DECLARE
  v_dept uuid := (SELECT id FROM public.departments WHERE key = 'food_beverage');
  v_held text;
  v_tickets int;
BEGIN
  IF v_dept IS NULL THEN
    RETURN;
  END IF;
  SELECT string_agg(u.email, ', ') INTO v_held
    FROM public.users u
    LEFT JOIN public.job_titles jt ON jt.id = u.job_title_id
   WHERE u.department_id = v_dept OR jt.department_id = v_dept;
  IF v_held IS NOT NULL THEN
    RAISE EXCEPTION 'Still in Food & Beverage / Kitchen: %', v_held;
  END IF;
  SELECT count(*) INTO v_tickets FROM public.tickets WHERE department_id = v_dept;
  IF v_tickets > 0 THEN
    RAISE EXCEPTION '% ticket(s) are routed to Food & Beverage / Kitchen', v_tickets;
  END IF;
END $$;

DELETE FROM public.job_titles
 WHERE department_id = (SELECT id FROM public.departments WHERE key = 'food_beverage');
DELETE FROM public.departments WHERE key = 'food_beverage';

COMMIT;
