-- Live room status and assignments for the Staff screens.
--
-- The Staff list, an attendant's See rooms and their Activity screen read
-- `rooms` and `room_assignments`; neither was in the realtime publication, so a
-- room assigned or started elsewhere only appeared after a reload. Realtime
-- applies each subscriber's RLS to inserts and updates, so a client only hears
-- about its own hotel's rows.
--
-- REPLICA IDENTITY FULL on `room_assignments`: an unassignment is a DELETE, and
-- with the default identity its event carries only the primary key, so a
-- subscription filtered on `user_id` or `hotel_id` would never see it. The
-- table is small (one row per room per shift), so the extra WAL is negligible.
-- `rooms` is only ever updated in place, and an UPDATE event carries the full
-- new row already.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'room_assignments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_assignments;
  END IF;
END
$$;

ALTER TABLE public.room_assignments REPLICA IDENTITY FULL;
