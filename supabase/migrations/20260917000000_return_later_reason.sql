-- Why housekeeping is coming back, not just when.
--
-- `rooms.return_later_at` has always recorded the time and nothing else, so a
-- supervisor reading the room could see that it had been deferred but never why.
-- Refuse Service already stores its grounds in `refuse_service_reason`; this is
-- the same idea for the other deferral state, and it is what lets the Return
-- Later sheet offer a preset or a typed message instead of the hardcoded task
-- text it used to attach.
--
-- Nullable and free text, exactly like `refuse_service_reason`: the presets are
-- a UI convenience, not an enum, and a room deferred before this column existed
-- simply has no reason.
--
-- Safe to apply to a live database: adding a nullable column rewrites no rows
-- and breaks no existing read. The app also tolerates its absence — `updateRoom`
-- retries without the newer activity columns on a 42703/PGRST204, so the reason
-- silently stops persisting rather than failing the whole status write if this
-- migration has not run yet.

ALTER TABLE "public"."rooms"
  ADD COLUMN IF NOT EXISTS "return_later_reason" "text";

COMMENT ON COLUMN "public"."rooms"."return_later_reason" IS
  'Reason housekeeping is returning later (free text; the UI offers presets).';
