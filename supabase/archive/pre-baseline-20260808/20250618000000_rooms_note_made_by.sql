-- Add note_made_by to rooms (display string e.g. "Stella Kitou at 09:00am")
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS note_made_by TEXT;
