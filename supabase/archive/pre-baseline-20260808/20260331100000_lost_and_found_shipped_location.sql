-- Capture shipped destination for Lost & Found items (Figma 3107:70).
ALTER TABLE public.lost_and_found_items
  ADD COLUMN IF NOT EXISTS shipped_location TEXT;

COMMENT ON COLUMN public.lost_and_found_items.shipped_location IS 'Destination/location where the item was shipped.';

