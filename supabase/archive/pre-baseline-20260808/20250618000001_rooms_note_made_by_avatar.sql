-- Add note_made_by_avatar to rooms (avatar URL for the user who made the note)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS note_made_by_avatar TEXT;
