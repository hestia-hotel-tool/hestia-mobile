-- Room notes as a separate entity: one room has many notes, each note has one author (user).
-- Replaces rooms.notes (text blob) and rooms.note_made_by / note_made_by_avatar so we can track who made each note.

-- 1. Create room_notes table
CREATE TABLE room_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_room_notes_room_id ON room_notes(room_id);
CREATE INDEX idx_room_notes_created_at ON room_notes(room_id, created_at DESC);

-- 2. Migrate existing rooms.notes into room_notes (one row per paragraph; author unknown for legacy)
INSERT INTO room_notes (room_id, text, created_by_id)
SELECT r.id, trim(note_text), NULL
FROM rooms r
CROSS JOIN LATERAL unnest(
  coalesce(
    string_to_array(
      nullif(trim(r.notes), ''),
      E'\n\n'
    ),
    ARRAY[]::text[]
  )
) AS note_text
WHERE r.notes IS NOT NULL AND trim(r.notes) != '' AND trim(note_text) != '';

-- 3. Drop old note columns from rooms
ALTER TABLE rooms DROP COLUMN IF EXISTS notes;
ALTER TABLE rooms DROP COLUMN IF EXISTS note_made_by;
ALTER TABLE rooms DROP COLUMN IF EXISTS note_made_by_avatar;

-- 4. RLS for room_notes: authenticated users can read all; insert/update/delete for authenticated
ALTER TABLE room_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read room_notes"
  ON room_notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert room_notes"
  ON room_notes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by_id OR created_by_id IS NULL);

CREATE POLICY "Authenticated users can update own room_notes"
  ON room_notes FOR UPDATE TO authenticated
  USING (auth.uid() = created_by_id)
  WITH CHECK (auth.uid() = created_by_id);

CREATE POLICY "Authenticated users can delete own room_notes"
  ON room_notes FOR DELETE TO authenticated
  USING (auth.uid() = created_by_id);
