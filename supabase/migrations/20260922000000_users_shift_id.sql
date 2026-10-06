-- Which shift a member of staff works.
--
-- Until now this was unanswerable. `users` had no shift column and there is no
-- roster table, so the only link between a person and a shift was
-- `room_assignments.shift_id` — a side effect of being handed a room. The
-- consequence was stark: of 35 staff, **26 had no shift at all**, and the Staff
-- screen's AM/PM tabs could only ever show the nine people who happened to hold
-- an assignment. Someone rostered for the morning but not yet given rooms was
-- invisible.
--
-- This makes it a property of the person, which is what the question "who is on
-- this morning?" is actually asking.
--
-- ## What this deliberately is not
--
-- It is **not** a rota. One column says "this person usually works AM"; it
-- cannot say "AM on Monday, PM on Thursday", and it keeps no history. The real
-- model is a `staff_shifts (user_id, shift_id, date)` table, and this column
-- should be replaced by one the day rotation matters. It is chosen here because
-- it answers today's question with one nullable column instead of a feature.
--
-- Nullable on purpose: a new hire, or anyone genuinely unrostered, is NULL
-- rather than silently defaulted onto a shift they do not work.

ALTER TABLE "public"."users"
  ADD COLUMN IF NOT EXISTS "shift_id" uuid
  REFERENCES "public"."shifts"("id") ON DELETE SET NULL;

COMMENT ON COLUMN "public"."users"."shift_id" IS
  'The shift this person usually works. NULL means unrostered. Not a rota — no date, no history.';

-- The Staff screen filters a department by shift on every tab press.
CREATE INDEX IF NOT EXISTS "users_shift_id_idx" ON "public"."users" ("shift_id");

-- Backfill: 75% of each department on AM, the rest on PM.
--
-- Scoped per (hotel, department), because `shifts` is hotel-scoped — a user
-- must be pointed at *their own* hotel's AM row, not the other tenant's.
--
-- `ceil` rather than `round`, so a department of one lands on AM rather than
-- being rostered entirely to the afternoon.
--
-- Ordered by name then id so the split is deterministic: the same people get
-- AM every time this runs, on any database, which makes the result
-- reproducible rather than a lottery.
--
-- `WHERE shift_id IS NULL` keeps it idempotent and, more importantly, stops a
-- re-run from overwriting a roster an administrator has since corrected by
-- hand. Today that clause matches everyone, because nobody has a shift yet.
WITH ranked AS (
  SELECT
    u."id",
    u."hotel_id",
    row_number() OVER (
      PARTITION BY u."hotel_id", u."department_id"
      ORDER BY u."full_name", u."id"
    ) AS rn,
    count(*) OVER (
      PARTITION BY u."hotel_id", u."department_id"
    ) AS n
  FROM "public"."users" u
  WHERE u."shift_id" IS NULL
),
target AS (
  SELECT
    r."id",
    r."hotel_id",
    CASE WHEN r.rn <= ceil(r.n * 0.75) THEN 'AM' ELSE 'PM' END AS shift_name
  FROM ranked r
)
UPDATE "public"."users" u
SET "shift_id" = s."id",
    "updated_at" = now()
FROM target t
JOIN "public"."shifts" s
  ON s."hotel_id" = t."hotel_id"
 AND upper(trim(s."name")) = t.shift_name
WHERE u."id" = t."id";
