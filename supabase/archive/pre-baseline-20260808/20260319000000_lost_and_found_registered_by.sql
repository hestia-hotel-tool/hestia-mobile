-- Add explicit "registered by" owner for Lost & Found items.
-- Keep existing rows consistent by backfilling from found_by_id.

ALTER TABLE lost_and_found_items
  ADD COLUMN IF NOT EXISTS registered_by_id UUID;

UPDATE lost_and_found_items
SET registered_by_id = found_by_id
WHERE registered_by_id IS NULL;

ALTER TABLE lost_and_found_items
  ALTER COLUMN registered_by_id SET DEFAULT auth.uid();

ALTER TABLE lost_and_found_items
  ALTER COLUMN registered_by_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'lost_and_found_items_registered_by_id_fkey'
  ) THEN
    ALTER TABLE lost_and_found_items
      ADD CONSTRAINT lost_and_found_items_registered_by_id_fkey
      FOREIGN KEY (registered_by_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_lost_and_found_items_registered_by_id
  ON lost_and_found_items (registered_by_id);
