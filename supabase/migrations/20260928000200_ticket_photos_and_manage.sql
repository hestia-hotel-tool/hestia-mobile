-- Tickets: photos on the ticket itself, and edit / delete rules.
--
-- 1. `photo_urls` — every photo of the ticket, in order. Photos used to live
--    only in the ticket's `room_history` row, and that row is written only for
--    room tickets, so a public-area ticket's photos were uploaded and then
--    never shown again. Existing ones are copied across.
--
-- 2. Who may change what:
--    - status, priority, assignee and due time: anyone in the hotel, as
--      today (the list's status popover and staff picker);
--    - title, description, photos, location and department: the person who
--      raised the ticket, or a holder of the new `tickets.manage`;
--    - delete: `tickets.manage` only.
--    `tickets.manage` goes to full_access and ops_senior, like
--    `lost_and_found.manage` (20260928000100).
--
-- 3. Removing photos (on edit or delete) needs a Storage DELETE policy:
--    uploads are stored under <hotel>/<uploader>/, so an uploader may remove
--    their own and a manager any of the hotel's.

-- ---------------------------------------------------------------------------
-- 1. Photos
-- ---------------------------------------------------------------------------

ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS photo_urls text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.tickets.photo_urls IS 'Every photo of the ticket, in order.';

UPDATE public.tickets t
   SET photo_urls = h.urls
  FROM (
    SELECT rh.event_id, array_agg(a.value ORDER BY a.ord) AS urls
      FROM public.room_history rh
      CROSS JOIN LATERAL jsonb_array_elements_text(rh.attachments) WITH ORDINALITY AS a(value, ord)
     WHERE rh.event_type = 'ticket'
       AND jsonb_typeof(rh.attachments) = 'array'
       AND a.value ~* '^https?://'
     GROUP BY rh.event_id
  ) h
 WHERE h.event_id = t.id AND cardinality(t.photo_urls) = 0;

-- ---------------------------------------------------------------------------
-- 2. Who may edit and delete
-- ---------------------------------------------------------------------------

INSERT INTO public.permissions (name, description)
VALUES ('tickets.manage', 'Edit or delete any ticket')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.roles r
  JOIN public.permissions p ON p.name = 'tickets.manage'
 WHERE r.key IN ('full_access', 'ops_senior')
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Hotel users can manage tickets" ON public.tickets;

CREATE POLICY "Hotel users can read tickets" ON public.tickets
  FOR SELECT TO authenticated USING (hotel_id = public.auth_hotel_id());
CREATE POLICY "Hotel users can raise tickets" ON public.tickets
  FOR INSERT TO authenticated WITH CHECK (hotel_id = public.auth_hotel_id());
-- Updates stay open to the hotel; what may change is checked by the trigger below.
CREATE POLICY "Hotel users can update tickets" ON public.tickets
  FOR UPDATE TO authenticated
  USING (hotel_id = public.auth_hotel_id()) WITH CHECK (hotel_id = public.auth_hotel_id());
CREATE POLICY "Managers can delete tickets" ON public.tickets
  FOR DELETE TO authenticated
  USING (hotel_id = public.auth_hotel_id() AND public.auth_has_permission('tickets.manage'));

CREATE OR REPLACE FUNCTION public._tickets_guard_edit()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Server-side writes (no user), the ticket's author and managers may change anything.
  IF auth.uid() IS NULL
     OR auth.uid() = OLD.created_by_id
     OR public.auth_has_permission('tickets.manage') THEN
    RETURN NEW;
  END IF;
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.photo_urls IS DISTINCT FROM OLD.photo_urls
     OR NEW.room_id IS DISTINCT FROM OLD.room_id
     OR NEW.type IS DISTINCT FROM OLD.type
     OR NEW.department_id IS DISTINCT FROM OLD.department_id
     OR NEW.created_by_id IS DISTINCT FROM OLD.created_by_id THEN
    RAISE EXCEPTION 'Only the person who raised this ticket or a manager can edit it.'
      USING ERRCODE = '42501', HINT = 'Status, priority and assignee can still be changed.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_guard_edit ON public.tickets;
CREATE TRIGGER tickets_guard_edit
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public._tickets_guard_edit();

-- ---------------------------------------------------------------------------
-- 3. Storage: remove ticket photos
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Uploaders and managers can delete ticket attachments" ON storage.objects;
CREATE POLICY "Uploaders and managers can delete ticket attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND name LIKE (public.auth_hotel_id())::text || '/%'
    AND (
      name LIKE (public.auth_hotel_id())::text || '/' || (auth.uid())::text || '/%'
      OR public.auth_has_permission('tickets.manage')
    )
  );
