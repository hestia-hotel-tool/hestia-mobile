-- Room assignments: unique on (room_id, shift_id) for upsert, and allow anon for persistence without login
-- One assignment per room per shift; upsert in app uses this to insert or update.

-- Unique constraint so we can upsert by (room_id, shift_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_assignments_room_shift
  ON room_assignments (room_id, shift_id);

-- Allow anon role to manage room_assignments (so assignment persists when not logged in; remove in prod if needed)
CREATE POLICY "Anon can manage room_assignments" ON room_assignments
  FOR ALL TO anon USING (true) WITH CHECK (true);
