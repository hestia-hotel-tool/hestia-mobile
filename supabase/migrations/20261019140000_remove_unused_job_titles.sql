-- Job titles the client does not use (2026-10-19): four in Housekeeping, eight
-- in Front Office. scripts/rbac/parse-spec.py REMOVED_TITLES keeps them out of
-- matrix.json and the RBAC seed; this removes them from databases seeded
-- before that, so they are no longer offered when adding staff.
--
-- Refuses to run while anyone still holds one of them: users.job_title_id is
-- ON DELETE SET NULL, and a person with no title has no permissions at all.
-- Move or remove those people first.

BEGIN;

DO $$
DECLARE
  v_held text;
BEGIN
  SELECT string_agg(u.email || ' (' || jt.name || ')', ', ')
    INTO v_held
    FROM public.users u
    JOIN public.job_titles jt ON jt.id = u.job_title_id
   WHERE jt.key IN (
     'housekeeping_manager', 'assistant_housekeeping_manager', 'senior_supervisor', 'coordinator',
     'assistant_director_of_rooms', 'director_of_front_office', 'assistant_front_office_manager',
     'front_office_trainee', 'night_auditor',
     'guest_relations_manager', 'guest_relations_supervisor', 'guest_relations_agent'
   );
  IF v_held IS NOT NULL THEN
    RAISE EXCEPTION 'Job titles still held: %', v_held;
  END IF;
END $$;

DELETE FROM public.job_titles
 WHERE key IN (
   'housekeeping_manager', 'assistant_housekeeping_manager', 'senior_supervisor', 'coordinator',
   'assistant_director_of_rooms', 'director_of_front_office', 'assistant_front_office_manager',
   'front_office_trainee', 'night_auditor',
   'guest_relations_manager', 'guest_relations_supervisor', 'guest_relations_agent'
 );

COMMIT;
