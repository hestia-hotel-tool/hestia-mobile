-- Concierge keeps four titles (2026-10-19): Head Concierge, Concierge Agent,
-- Bellboy Supervisor, Bellboy Agent. The other six are removed, as in
-- 20261019140000 — scripts/rbac/parse-spec.py REMOVED_TITLES keeps them out of
-- the seed; this removes them from databases seeded before that.
--
-- Refuses to run while anyone still holds one of them (users.job_title_id is
-- ON DELETE SET NULL, and a person with no title has no permissions).

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
     'chief_concierge', 'concierge_manager', 'assistant_concierge_manager',
     'concierge_supervisor', 'valet_supervisor', 'valet_attendant'
   );
  IF v_held IS NOT NULL THEN
    RAISE EXCEPTION 'Job titles still held: %', v_held;
  END IF;
END $$;

DELETE FROM public.job_titles
 WHERE key IN (
   'chief_concierge', 'concierge_manager', 'assistant_concierge_manager',
   'concierge_supervisor', 'valet_supervisor', 'valet_attendant'
 );

COMMIT;
