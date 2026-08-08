-- Guest images storage bucket for guest portrait photos (room cards, detail)
-- Images are stored at guest-images/{guest_id}/avatar.{ext}

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'guest-images',
  'guest-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload guest images (path: guest_id/filename)
CREATE POLICY "Authenticated users can upload guest images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'guest-images');

CREATE POLICY "Authenticated users can update guest images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'guest-images');

-- Public read so guest portrait URLs work in the app without auth
CREATE POLICY "Guest images are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'guest-images');
