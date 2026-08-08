-- Guest name for Lost & Found items found in rooms

ALTER TABLE lost_and_found_items
  ADD COLUMN IF NOT EXISTS guest_name TEXT;

