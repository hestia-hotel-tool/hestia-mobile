-- Adds the `attendant` rooms layout.
--
-- Room attendants read the same status-banded list supervisors do (Figma
-- 3838:1623), narrowed to the rooms assigned to them and topped with a
-- finished/total counter. Extending the constraint is all that is needed here —
-- 20260907000000_rooms_variant.sql named it deliberately so this would not have
-- to guess at a generated name.
--
-- Values are seeded from `src/domain/rbac/matrix.json` by `npm run rbac:generate`.

BEGIN;

ALTER TABLE public.job_titles
  DROP CONSTRAINT IF EXISTS job_titles_rooms_variant_check;
ALTER TABLE public.job_titles
  ADD CONSTRAINT job_titles_rooms_variant_check
  CHECK (rooms_variant IN ('default', 'supervisor', 'attendant'));

COMMIT;
