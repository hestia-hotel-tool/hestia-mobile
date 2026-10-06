-- Set placeholder image_url for all guests that don't have one.
-- Uses deterministic pravatar URLs (same as former app placeholder) so room cards show an avatar when data is from Supabase.
-- Replace with real Supabase Storage URLs later via uploadGuestImage().

UPDATE guests
SET image_url = 'https://i.pravatar.cc/96?u=' || id
WHERE image_url IS NULL;
