-- Rebalance the shift split: `round`, not `ceil`.
--
-- `20260922000000` seeded 75/25 per department using `ceil(n * 0.75)` for the
-- AM count. On a department of three that gives **3 AM and 0 PM** — a whole
-- team with nobody on the afternoon, when 2/1 was available and is far closer
-- to the intent. Nine of the thirteen (hotel, department) groups here have
-- three people or fewer, so the error compounded: the estate came out **89% AM**
-- against the 75% asked for.
--
-- `round` is the faithful reading of "75%": the nearest whole number of people
-- to three quarters. It changes only the groups where `ceil` overshot.
--
--   size  ceil          round
--      1  1 AM / 0 PM   1 AM / 0 PM     unavoidable
--      2  2 AM / 0 PM   2 AM / 0 PM     1.5 rounds up; no split is 75%
--      3  3 AM / 0 PM   2 AM / 1 PM     <- the fix
--      4  3 AM / 1 PM   3 AM / 1 PM
--     11  9 AM / 2 PM   8 AM / 3 PM
--
-- A department of one or two still cannot be 75/25 — that is arithmetic, not a
-- bug, and it is why the estate total will sit above 75% for as long as most
-- departments are this small.
--
-- ## Why this overwrites, when the first migration did not
--
-- `20260922000000` was careful to touch only `shift_id IS NULL`, so it could
-- never undo a roster an administrator had corrected by hand. This one drops
-- that guard deliberately: it is fixing that migration's own output, applied
-- minutes earlier, before anyone could have changed anything. **It should not
-- be used as a template.** A later rebalance must either exclude
-- hand-maintained rows or be run knowingly.

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
),
target AS (
  SELECT
    r."id",
    r."hotel_id",
    -- Same deterministic ordering as the seed, so the same people keep AM.
    CASE WHEN r.rn <= round(r.n * 0.75) THEN 'AM' ELSE 'PM' END AS shift_name
  FROM ranked r
)
UPDATE "public"."users" u
SET "shift_id" = s."id",
    "updated_at" = now()
FROM target t
JOIN "public"."shifts" s
  ON s."hotel_id" = t."hotel_id"
 AND upper(trim(s."name")) = t.shift_name
WHERE u."id" = t."id"
  AND u."shift_id" IS DISTINCT FROM s."id";
