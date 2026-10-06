-- Split housekeeping leadership off the `supervisor` rooms layout.
--
-- Executive Housekeeper, Housekeeping Manager and Assistant Housekeeping
-- Manager read the same banded Rooms list supervisors do, but without the
-- In Progress band pinned to the top — Figma 3838:1572 marks that card
-- `sticky top-0` in the supervisor frame, and supervisors work the floor from
-- the list while leadership reads it.
--
-- All six titles shared `supervisor` until now, so the two behaviours could not
-- be told apart. The three leadership titles move to a new `leadership` value;
-- the three supervisors keep `supervisor`.
--
-- Order matters: widen the CHECK first. Updating first would write a value the
-- old constraint forbids and the statement would fail.
--
-- Values are seeded from `src/domain/rbac/matrix.json` by `npm run rbac:generate`,
-- but that seed lives in an already-applied migration and so never re-runs on a
-- deployed database — hence the explicit UPDATE, following
-- 20260909000000_rooms_variant_reseed.sql.

BEGIN;

ALTER TABLE public.job_titles
  DROP CONSTRAINT IF EXISTS job_titles_rooms_variant_check;
ALTER TABLE public.job_titles
  ADD CONSTRAINT job_titles_rooms_variant_check
  CHECK (rooms_variant IN ('default', 'leadership', 'supervisor', 'attendant'));

UPDATE public.job_titles jt
   SET rooms_variant = v.rooms_variant
  FROM (VALUES
    ('executive_housekeeper', 'leadership'),
    ('housekeeping_manager', 'leadership'),
    ('assistant_housekeeping_manager', 'leadership'),
    ('senior_supervisor', 'supervisor'),
    ('supervisor', 'supervisor'),
    ('coordinator', 'supervisor'),
    ('housekeeping_room_attendant', 'attendant')
  ) AS v(key, rooms_variant)
 WHERE jt.key = v.key
   AND jt.rooms_variant IS DISTINCT FROM v.rooms_variant;

COMMIT;
