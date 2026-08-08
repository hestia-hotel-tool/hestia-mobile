-- Lost & Found: unique incremental tracking number (2 letters + 5 digits, e.g. FH31309)
-- Sequence for numeric part (10000 -> 99999)
CREATE SEQUENCE IF NOT EXISTS lost_and_found_tracking_seq START WITH 10000;

-- Add column (nullable for existing rows)
ALTER TABLE lost_and_found_items
  ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- Unique constraint so we never duplicate
CREATE UNIQUE INDEX IF NOT EXISTS idx_lost_and_found_tracking_number
  ON lost_and_found_items (tracking_number)
  WHERE tracking_number IS NOT NULL;

-- Trigger: set tracking_number on INSERT when NULL
CREATE OR REPLACE FUNCTION set_lost_and_found_tracking_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_number IS NULL OR NEW.tracking_number = '' THEN
    NEW.tracking_number := 'FH' || LPAD(nextval('lost_and_found_tracking_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_lost_and_found_tracking_number_trigger ON lost_and_found_items;
CREATE TRIGGER set_lost_and_found_tracking_number_trigger
  BEFORE INSERT ON lost_and_found_items
  FOR EACH ROW
  EXECUTE FUNCTION set_lost_and_found_tracking_number();

-- Backfill existing rows with no tracking number (optional)
UPDATE lost_and_found_items
SET tracking_number = 'FH' || LPAD(nextval('lost_and_found_tracking_seq')::text, 5, '0')
WHERE tracking_number IS NULL OR tracking_number = '';
