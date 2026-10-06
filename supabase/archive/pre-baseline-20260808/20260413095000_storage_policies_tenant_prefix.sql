-- Multi-tenant: restrict Storage uploads/updates to hotel-scoped object prefixes
-- Object name convention: {hotel_id}/...

-- Avatars
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE public.auth_hotel_id()::text || '/%'
  );

DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
CREATE POLICY "Authenticated users can update avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND name LIKE public.auth_hotel_id()::text || '/%'
  );

-- Guest images
DROP POLICY IF EXISTS "Authenticated users can upload guest images" ON storage.objects;
CREATE POLICY "Authenticated users can upload guest images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'guest-images'
    AND name LIKE public.auth_hotel_id()::text || '/%'
  );

DROP POLICY IF EXISTS "Authenticated users can update guest images" ON storage.objects;
CREATE POLICY "Authenticated users can update guest images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'guest-images'
    AND name LIKE public.auth_hotel_id()::text || '/%'
  );

-- Ticket attachments
DROP POLICY IF EXISTS "Authenticated users can upload ticket attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload ticket attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND name LIKE public.auth_hotel_id()::text || '/%'
  );

DROP POLICY IF EXISTS "Authenticated users can update ticket attachments" ON storage.objects;
CREATE POLICY "Authenticated users can update ticket attachments" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND name LIKE public.auth_hotel_id()::text || '/%'
  );

-- Lost-and-found
DROP POLICY IF EXISTS "Authenticated users can upload lost-and-found images" ON storage.objects;
CREATE POLICY "Authenticated users can upload lost-and-found images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'lost-and-found'
    AND name LIKE public.auth_hotel_id()::text || '/%'
  );

DROP POLICY IF EXISTS "Authenticated users can update lost-and-found images" ON storage.objects;
CREATE POLICY "Authenticated users can update lost-and-found images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'lost-and-found'
    AND name LIKE public.auth_hotel_id()::text || '/%'
  );

-- Chat attachments (bucket created manually or via script; policies still apply once bucket exists)
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND name LIKE public.auth_hotel_id()::text || '/%'
  );

DROP POLICY IF EXISTS "Authenticated users can update chat attachments" ON storage.objects;
CREATE POLICY "Authenticated users can update chat attachments" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND name LIKE public.auth_hotel_id()::text || '/%'
  );

