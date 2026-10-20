-- Executive and Administration keeps one title (2026-10-19): Hotel Manager.
-- General Manager and Assistant to General & Hotel Manager are removed, as in
-- 20261019140000 — scripts/rbac/parse-spec.py REMOVED_TITLES keeps them out of
-- the seed; this removes them from databases seeded before that.
--
-- Anyone still on one of them moves to Hotel Manager first (all three are
-- `full_access`, so their access does not change).

BEGIN;

UPDATE public.users
   SET job_title_id = (SELECT id FROM public.job_titles WHERE key = 'hotel_manager'),
       updated_at = now()
 WHERE job_title_id IN (
   SELECT id FROM public.job_titles
    WHERE key IN ('general_manager', 'assistant_to_general_and_hotel_manager')
 );

DELETE FROM public.job_titles
 WHERE key IN ('general_manager', 'assistant_to_general_and_hotel_manager');

COMMIT;
