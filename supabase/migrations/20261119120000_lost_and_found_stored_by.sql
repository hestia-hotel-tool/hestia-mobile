-- Lost & Found → Register step 2 — Figma 4649:2427: "Stored by", the person
-- who put a Stored item away, next to its Stored Location.
--
--   lost_and_found_items.stored_by_id   who stored it (Stored items only; the
--                                       app defaults it to the registrant)
--
-- The same rules as Found by / Registered by:
--   * line staff (no lost_and_found.read_all) register as themselves —
--     Stored by is them too (20261026260000);
--   * Housekeeping leaders pick Housekeeping people only (20261026280000);
--   * only a manager may change it afterwards (20260928000100's guard).

BEGIN;

ALTER TABLE public.lost_and_found_items
  ADD COLUMN IF NOT EXISTS stored_by_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lost_and_found_items_stored_by_id
  ON public.lost_and_found_items (stored_by_id);

DROP POLICY IF EXISTS "Hotel users can register lost_and_found" ON public.lost_and_found_items;
CREATE POLICY "Hotel users can register lost_and_found" ON public.lost_and_found_items
  FOR INSERT
  WITH CHECK (
    hotel_id = (SELECT public.auth_hotel_id())
    AND (
      -- Line staff: themselves only.
      (
        NOT public.auth_has_permission('lost_and_found.read_all')
        AND coalesce(found_by_id, (SELECT auth.uid())) = (SELECT auth.uid())
        AND coalesce(registered_by_id, (SELECT auth.uid())) = (SELECT auth.uid())
        AND coalesce(stored_by_id, (SELECT auth.uid())) = (SELECT auth.uid())
      )
      OR (
        public.auth_has_permission('lost_and_found.read_all')
        AND (
          -- Housekeeping leaders: Housekeeping people only.
          public.auth_tickets_hotel_wide()
          OR public.auth_department_id() IS DISTINCT FROM (SELECT id FROM public.departments WHERE key = 'housekeeping')
          OR (
            public._user_in_department(found_by_id, public.auth_department_id())
            AND public._user_in_department(registered_by_id, public.auth_department_id())
            AND public._user_in_department(stored_by_id, public.auth_department_id())
          )
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION public._lost_and_found_guard_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
     OR NEW.stored_by_id IS DISTINCT FROM OLD.stored_by_id
     OR NEW.storage_location IS DISTINCT FROM OLD.storage_location THEN
    RAISE EXCEPTION 'Only a manager can edit a lost & found item.'
      USING ERRCODE = '42501', HINT = 'Status can still be changed from the list.';
  END IF;
  RETURN NEW;
END;
$function$;

COMMIT;
