-- Cleaning reports: what an attendant confirms when a room is cleaned.
--
-- Setting a room to Cleaned opens the Clean Checklist (Figma 1772-255): the
-- checks, then optional photos and a note, then "Slide to complete". This is
-- where that lands — one row per completed clean, so the supervisor who
-- inspects can see what was confirmed, the photos, and the note, and History
-- shows who cleaned the room and when.
--
-- The note is also added to the room's notes by the app, where the team
-- already looks for them.
--
-- Photos go to the `room-photos` bucket under <hotel>/<user>/…, like the other
-- uploads.

CREATE TABLE IF NOT EXISTS public.room_cleaning_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.users(id) ON DELETE SET NULL,
  -- [{ "id": "curtains", "label": "Curtains/blinds properly arranged", "checked": true }, …]
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  note text CHECK (note IS NULL OR length(note) <= 2000),
  photo_urls text[] NOT NULL DEFAULT '{}' CHECK (cardinality(photo_urls) <= 8),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.room_cleaning_reports IS 'One per completed clean: checklist, optional note and photos. Written by the Clean Checklist sheet.';

CREATE INDEX IF NOT EXISTS idx_room_cleaning_reports_room ON public.room_cleaning_reports (room_id, created_at DESC);

ALTER TABLE public.room_cleaning_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hotel users can read cleaning reports" ON public.room_cleaning_reports;
CREATE POLICY "Hotel users can read cleaning reports" ON public.room_cleaning_reports
  FOR SELECT TO authenticated USING (hotel_id = public.auth_hotel_id());

DROP POLICY IF EXISTS "Staff file their own cleaning reports" ON public.room_cleaning_reports;
CREATE POLICY "Staff file their own cleaning reports" ON public.room_cleaning_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    hotel_id = public.auth_hotel_id()
    AND user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.hotel_id = public.auth_hotel_id())
  );

GRANT SELECT, INSERT ON public.room_cleaning_reports TO authenticated;

-- History: "Cleaned the room — 2 photos: <note>"
DROP TRIGGER IF EXISTS room_cleaning_reports_audit_trg ON public.room_cleaning_reports;
CREATE TRIGGER room_cleaning_reports_audit_trg
  AFTER INSERT ON public.room_cleaning_reports
  FOR EACH ROW EXECUTE FUNCTION public.audit_changes();

-- ---------------------------------------------------------------------------
-- Photos bucket
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('room-photos', 'room-photos', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Hotel users can upload room photos" ON storage.objects;
CREATE POLICY "Hotel users can upload room photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'room-photos' AND name LIKE public.auth_hotel_id()::text || '/' || auth.uid()::text || '/%');

DROP POLICY IF EXISTS "Room photos are publicly readable" ON storage.objects;
CREATE POLICY "Room photos are publicly readable" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'room-photos');

DROP POLICY IF EXISTS "Uploaders can delete their room photos" ON storage.objects;
CREATE POLICY "Uploaders can delete their room photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'room-photos' AND name LIKE public.auth_hotel_id()::text || '/' || auth.uid()::text || '/%');
