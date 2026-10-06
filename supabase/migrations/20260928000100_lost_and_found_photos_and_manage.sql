-- Lost & found: several photos per item, and edit / delete for managers.
--
-- 1. `photo_urls` — every photo of the item, in order. `image_url` stays, as
--    the cover (the first photo), so the list cards and room detail keep
--    reading one field; a trigger keeps the two in step.
--
-- 2. Editing an item (its name, notes, photos, where it was found or is kept)
--    and deleting it need `lost_and_found.manage`. Changing its *status* does
--    not — staff still mark items stored / shipped / returned / discarded
--    from the list.
--
--    The permission was admin-only (full_access). It now also goes to
--    ops_senior — the Front Office / Concierge / IRD leads, who hand items
--    back to guests — matching who "leadership" is for announcements.
--
-- 3. Deleting removes the item's photos from Storage too, so the bucket gets
--    a DELETE policy for the same people.

-- ---------------------------------------------------------------------------
-- 1. Photos
-- ---------------------------------------------------------------------------

ALTER TABLE public.lost_and_found_items
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.lost_and_found_items.photo_urls IS
  'Every photo of the item, in order. image_url mirrors the first (the cover).';

UPDATE public.lost_and_found_items
   SET photo_urls = ARRAY[image_url]
 WHERE image_url IS NOT NULL AND image_url <> '' AND cardinality(photo_urls) = 0;

CREATE OR REPLACE FUNCTION public._lost_and_found_sync_cover()
RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  -- An insert that only sets image_url (older builds) still gets a photo list.
  IF cardinality(coalesce(NEW.photo_urls, '{}')) = 0 AND nullif(NEW.image_url, '') IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.image_url IS DISTINCT FROM OLD.image_url) THEN
    NEW.photo_urls := ARRAY[NEW.image_url];
  END IF;
  NEW.image_url := NEW.photo_urls[1];
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lost_and_found_sync_cover ON public.lost_and_found_items;
CREATE TRIGGER lost_and_found_sync_cover
  BEFORE INSERT OR UPDATE OF photo_urls, image_url ON public.lost_and_found_items
  FOR EACH ROW EXECUTE FUNCTION public._lost_and_found_sync_cover();

-- ---------------------------------------------------------------------------
-- 2. Who may edit and delete
-- ---------------------------------------------------------------------------

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.roles r
  JOIN public.permissions p ON p.name = 'lost_and_found.manage'
 WHERE r.key IN ('full_access', 'ops_senior')
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Hotel users can manage lost_and_found" ON public.lost_and_found_items;

CREATE POLICY "Hotel users can read lost_and_found" ON public.lost_and_found_items
  FOR SELECT TO authenticated USING (hotel_id = public.auth_hotel_id());
CREATE POLICY "Hotel users can register lost_and_found" ON public.lost_and_found_items
  FOR INSERT TO authenticated WITH CHECK (hotel_id = public.auth_hotel_id());
-- Updates stay open to the hotel; what may change is checked by the trigger below.
CREATE POLICY "Hotel users can update lost_and_found" ON public.lost_and_found_items
  FOR UPDATE TO authenticated
  USING (hotel_id = public.auth_hotel_id()) WITH CHECK (hotel_id = public.auth_hotel_id());
CREATE POLICY "Managers can delete lost_and_found" ON public.lost_and_found_items
  FOR DELETE TO authenticated
  USING (hotel_id = public.auth_hotel_id() AND public.auth_has_permission('lost_and_found.manage'));

CREATE OR REPLACE FUNCTION public._lost_and_found_guard_edit()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Server-side writes (no user) and managers may change anything.
  IF auth.uid() IS NULL OR public.auth_has_permission('lost_and_found.manage') THEN
    RETURN NEW;
  END IF;
  IF NEW.item_name IS DISTINCT FROM OLD.item_name
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.photo_urls IS DISTINCT FROM OLD.photo_urls
     OR NEW.room_id IS DISTINCT FROM OLD.room_id
     OR NEW.found_location IS DISTINCT FROM OLD.found_location
     OR NEW.found_at IS DISTINCT FROM OLD.found_at
     OR NEW.found_by_id IS DISTINCT FROM OLD.found_by_id
     OR NEW.registered_by_id IS DISTINCT FROM OLD.registered_by_id
     OR NEW.storage_location IS DISTINCT FROM OLD.storage_location THEN
    RAISE EXCEPTION 'Only a manager can edit a lost & found item.'
      USING ERRCODE = '42501', HINT = 'Status can still be changed from the list.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lost_and_found_guard_edit ON public.lost_and_found_items;
CREATE TRIGGER lost_and_found_guard_edit
  BEFORE UPDATE ON public.lost_and_found_items
  FOR EACH ROW EXECUTE FUNCTION public._lost_and_found_guard_edit();

-- ---------------------------------------------------------------------------
-- 3. Storage: managers may delete their hotel's lost & found photos
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Managers can delete lost-and-found images" ON storage.objects;
CREATE POLICY "Managers can delete lost-and-found images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'lost-and-found'
    AND name LIKE (public.auth_hotel_id())::text || '/%'
    AND public.auth_has_permission('lost_and_found.manage')
  );
