-- IT keeps one title (2026-10-19): Director Of Information Technology. IT
-- Manager, Assistant IT Manager, IT Supervisor and IT Agent are removed, as in
-- 20261019140000 — scripts/rbac/parse-spec.py REMOVED_TITLES keeps them out of
-- the seed; this removes them from databases seeded before that.
--
-- Anyone still on IT Manager moves to Director Of Information Technology first
-- (same `technical` role, so their access does not change). Any other holder
-- stops the migration (users.job_title_id is ON DELETE SET NULL, and a person
-- with no title has no permissions).

BEGIN;

UPDATE public.users
   SET job_title_id = (SELECT id FROM public.job_titles WHERE key = 'director_of_information_technology'),
       updated_at = now()
 WHERE job_title_id = (SELECT id FROM public.job_titles WHERE key = 'it_manager');

DO $$
DECLARE
  v_held text;
BEGIN
  SELECT string_agg(u.email || ' (' || jt.name || ')', ', ')
    INTO v_held
    FROM public.users u
    JOIN public.job_titles jt ON jt.id = u.job_title_id
   WHERE jt.key IN ('it_manager', 'assistant_it_manager', 'it_supervisor', 'it_agent');
  IF v_held IS NOT NULL THEN
    RAISE EXCEPTION 'Job titles still held: %', v_held;
  END IF;
END $$;

DELETE FROM public.job_titles
 WHERE key IN ('it_manager', 'assistant_it_manager', 'it_supervisor', 'it_agent');

COMMIT;
