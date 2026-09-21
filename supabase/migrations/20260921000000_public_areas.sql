-- The public areas of a hotel, as data.
--
-- Lost & Found and the ticket flow both ask "where was this found?" and both
-- offer the same five answers — Brasserie, Gym, Toilet, Reception, Elevator —
-- from a hardcoded array literal in the component
-- (`RegisterLostAndFoundModal`, `SelectTicketLocationScreen`). Two copies of a
-- list that describes a *building*, compiled into the app, identical for every
-- tenant. A hotel without a gym still offers Gym; a hotel with a spa cannot add
-- it without a release.
--
-- The rooms this sits beside have always been a table. This makes the other
-- half of "location" a table too, so the two are answered the same way.
--
-- Scoped per hotel, like `lost_and_found_items` and `rooms`: the areas of the
-- Palm Haven are not the areas of the Default Hotel, and the seed below gives
-- each existing hotel its own copy of the five rather than sharing rows.
--
-- `sort_order` rather than alphabetical: the list is a pick-list a housekeeper
-- reads under time pressure, and the order the design drew it in is the order
-- it should keep. `active` rather than deleting: an area that closes should
-- stop being offered without orphaning the items already found there, which
-- reference it by the free text in `lost_and_found_items.found_location`.
--
-- Safe to apply to a live database: it creates a new table and writes only to
-- it. Nothing reads it yet that cannot cope without it — the app treats a
-- missing table the same way it treats the missing `shipped_location` column,
-- falling back rather than failing.

CREATE TABLE IF NOT EXISTS "public"."public_areas" (
  "id"         uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  "hotel_id"   uuid NOT NULL REFERENCES "public"."hotels"("id") ON DELETE CASCADE,
  "name"       text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "active"     boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  -- One "Gym" per hotel. The name is what gets written into
  -- `lost_and_found_items.found_location`, so duplicates would read as two
  -- different places.
  CONSTRAINT "public_areas_hotel_name_unique" UNIQUE ("hotel_id", "name")
);

COMMENT ON TABLE "public"."public_areas" IS
  'Named non-room locations in a hotel, offered when registering a lost item or a ticket.';
COMMENT ON COLUMN "public"."public_areas"."sort_order" IS
  'Display order in the picker; ties break on name.';
COMMENT ON COLUMN "public"."public_areas"."active" IS
  'False hides it from pickers without orphaning items already found there.';

CREATE INDEX IF NOT EXISTS "public_areas_hotel_active_idx"
  ON "public"."public_areas" ("hotel_id", "active", "sort_order");

ALTER TABLE "public"."public_areas" ENABLE ROW LEVEL SECURITY;

-- Read-only to the app, matching `job_titles` and the other reference tables:
-- these are configuration, changed by an administrator, not by a housekeeper
-- mid-shift.
DROP POLICY IF EXISTS "Authenticated users can read public_areas" ON "public"."public_areas";
CREATE POLICY "Authenticated users can read public_areas" ON "public"."public_areas"
  FOR SELECT TO authenticated USING (true);

REVOKE ALL ON TABLE "public"."public_areas" FROM anon;
GRANT SELECT ON TABLE "public"."public_areas" TO authenticated;

-- Seed every existing hotel with the five the app has been hardcoding, in the
-- order it drew them. `ON CONFLICT DO NOTHING` keeps this idempotent and makes
-- re-running the migration a no-op rather than an error.
INSERT INTO "public"."public_areas" ("hotel_id", "name", "sort_order")
SELECT h."id", a."name", a."sort_order"
FROM "public"."hotels" h
CROSS JOIN (VALUES
  ('Brasserie', 1),
  ('Gym',       2),
  ('Toilet',    3),
  ('Reception', 4),
  ('Elevator',  5)
) AS a("name", "sort_order")
ON CONFLICT ("hotel_id", "name") DO NOTHING;
