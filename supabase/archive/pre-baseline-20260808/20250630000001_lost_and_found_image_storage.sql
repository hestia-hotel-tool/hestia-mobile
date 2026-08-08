-- Storage bucket and DB column for Lost & Found item images

-- 1) Create public storage bucket for lost-and-found images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lost-and-found',
  'lost-and-found',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2) Policies: authenticated users can upload/update; public can read
CREATE POLICY "Authenticated users can upload lost-and-found images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lost-and-found');

CREATE POLICY "Authenticated users can update lost-and-found images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lost-and-found');

CREATE POLICY "Lost-and-found images are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'lost-and-found');

-- 3) Store first image URL on lost_and_found_items
ALTER TABLE lost_and_found_items
  ADD COLUMN IF NOT EXISTS image_url TEXT;

