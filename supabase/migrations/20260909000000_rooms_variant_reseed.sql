-- Re-seed `job_titles.rooms_variant` onto databases that already ran the seed.
--
-- Housekeeping leadership reads the same status-banded list supervisors do.
-- Executive Housekeeper, Housekeeping Manager and Assistant Housekeeping
-- Manager were mapped to the flat `default` list, so they were served the wrong
-- Rooms screen (Figma 3883-5570 is the banded one, labelled "HSK Executive").
-- Fixed in `src/domain/rbac/matrix.json`.
--
-- That fix alone is not enough for an existing database. The values live in
-- 20260902000100_rbac_seed.sql, which `npm run rbac:generate` rewrites in
-- place — and an already-applied migration never runs again, so regenerating it
-- only helps a fresh `supabase db reset`. Neither
-- 20260907000000_rooms_variant.sql nor 20260908000000_rooms_variant_attendant.sql
-- seeded any values either: the first added the column with DEFAULT 'default',
-- the second only widened the CHECK constraint. So a long-lived database can
-- still have every title on 'default', including the supervisors that have
-- read as banded in matrix.json since 20260907.
--
-- Hence this migration carries the full non-default set rather than just the
-- three titles that changed — it is the first thing to actually write these
-- values to a deployed database. Titles absent from the list keep 'default',
-- which is the column default.
--
-- Idempotent: re-running sets the same values. Source of truth remains
-- matrix.json; if you change a rooms_variant there, run `npm run rbac:generate`
-- and add a migration like this one.

BEGIN;

UPDATE public.job_titles jt
   SET rooms_variant = v.rooms_variant
  FROM (VALUES
    ('executive_housekeeper', 'supervisor'),
    ('housekeeping_manager', 'supervisor'),
    ('assistant_housekeeping_manager', 'supervisor'),
    ('senior_supervisor', 'supervisor'),
    ('supervisor', 'supervisor'),
    ('coordinator', 'supervisor'),
    ('housekeeping_room_attendant', 'attendant')
  ) AS v(key, rooms_variant)
 WHERE jt.key = v.key
   AND jt.rooms_variant IS DISTINCT FROM v.rooms_variant;

COMMIT;
