-- Ticket photo attachments (create-ticket flow → Storage → room_history.attachments)
-- Path: {user_id}/{timestamp}_{random}.jpg

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload ticket attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

CREATE POLICY "Authenticated users can update ticket attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Ticket attachments are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'ticket-attachments');
