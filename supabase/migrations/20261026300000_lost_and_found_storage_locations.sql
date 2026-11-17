-- Lost & Found storage locations, per hotel and editable (client request,
-- 2026-10-26: "Stored Location dropdown should be customisable").
--
-- They were four values fixed in the app (HSK Office, Front Desk, Security
-- Office, Lost & Found Room). Now each hotel has its own list, seeded with
-- those four under the same keys, so every existing item keeps its label.
-- Items still store the key (lost_and_found_items.storage_location).
--
-- Managed in the app (Account → Management → Lost & Found storage) by anyone
-- with lost_and_found.manage, through the functions below: add, rename,
-- reorder, remove. Removing a location in use only retires it — it leaves the
-- dropdown, but items stored there keep showing its name; an unused one is
-- deleted.

BEGIN;

CREATE TABLE IF NOT EXISTS public.lost_and_found_storage_locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  key         text NOT NULL CHECK (key ~ '^[A-Za-z0-9_-]{1,60}$'),
  label       text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 60),
  sort_order  integer NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, key)
);
CREATE INDEX IF NOT EXISTS lf_storage_locations_hotel_idx ON public.lost_and_found_storage_locations (hotel_id, sort_order);

ALTER TABLE public.lost_and_found_storage_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Hotel users read storage locations" ON public.lost_and_found_storage_locations;
CREATE POLICY "Hotel users read storage locations" ON public.lost_and_found_storage_locations
  FOR SELECT TO authenticated USING (hotel_id = (SELECT public.auth_hotel_id()));
-- No write policies: the functions below are the way in.
REVOKE ALL ON public.lost_and_found_storage_locations FROM anon;

-- Every hotel starts with the four the app had.
INSERT INTO public.lost_and_found_storage_locations (hotel_id, key, label, sort_order)
SELECT h.id, v.key, v.label, v.ord
  FROM public.hotels h
 CROSS JOIN (VALUES ('hskOffice', 'HSK Office', 1), ('frontDesk', 'Front Desk', 2),
                    ('securityOffice', 'Security Office', 3), ('lostAndFoundRoom', 'Lost & Found Room', 4)) AS v(key, label, ord)
ON CONFLICT (hotel_id, key) DO NOTHING;

-- …and so does a hotel created later.
CREATE OR REPLACE FUNCTION public._hotels_seed_storage_locations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.lost_and_found_storage_locations (hotel_id, key, label, sort_order)
  VALUES (NEW.id, 'hskOffice', 'HSK Office', 1), (NEW.id, 'frontDesk', 'Front Desk', 2),
         (NEW.id, 'securityOffice', 'Security Office', 3), (NEW.id, 'lostAndFoundRoom', 'Lost & Found Room', 4)
  ON CONFLICT (hotel_id, key) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS hotels_seed_storage_locations ON public.hotels;
CREATE TRIGGER hotels_seed_storage_locations AFTER INSERT ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public._hotels_seed_storage_locations();

CREATE OR REPLACE FUNCTION public._lf_storage_guard()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_hotel uuid := public.auth_hotel_id();
BEGIN
  IF auth.uid() IS NULL OR v_hotel IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.auth_has_permission('lost_and_found.manage') THEN
    RAISE EXCEPTION 'Only a manager can change the storage locations.' USING ERRCODE = '42501';
  END IF;
  RETURN v_hotel;
END;
$$;

-- Add (p_id null) or rename. Returns the location's id.
CREATE OR REPLACE FUNCTION public.lf_storage_location_save(p_id uuid, p_label text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_hotel uuid := public._lf_storage_guard();
  v_label text := btrim(coalesce(p_label, ''));
  v_key   text;
  v_id    uuid;
BEGIN
  IF char_length(v_label) NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'A location needs a name of up to 60 characters.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.lost_and_found_storage_locations
              WHERE hotel_id = v_hotel AND active AND lower(label) = lower(v_label) AND id IS DISTINCT FROM p_id) THEN
    RAISE EXCEPTION 'There is already a location called "%".', v_label USING ERRCODE = '23505';
  END IF;

  IF p_id IS NULL THEN
    -- A stable key from the name; items store it, so it never changes after.
    v_key := left(regexp_replace(lower(v_label), '[^a-z0-9]+', '_', 'g'), 40);
    v_key := btrim(v_key, '_');
    IF v_key = '' THEN v_key := 'location'; END IF;
    v_key := v_key || '_' || substr(md5(random()::text), 1, 6);
    INSERT INTO public.lost_and_found_storage_locations (hotel_id, key, label, sort_order)
    VALUES (v_hotel, v_key, v_label,
            coalesce((SELECT max(sort_order) FROM public.lost_and_found_storage_locations WHERE hotel_id = v_hotel), 0) + 1)
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  UPDATE public.lost_and_found_storage_locations SET label = v_label, active = true
   WHERE id = p_id AND hotel_id = v_hotel
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Location not found.' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_id;
END;
$$;

-- The dropdown's order: the ids, first to last.
CREATE OR REPLACE FUNCTION public.lf_storage_location_reorder(p_ids uuid[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_hotel uuid := public._lf_storage_guard();
BEGIN
  UPDATE public.lost_and_found_storage_locations l
     SET sort_order = o.ord
    FROM unnest(p_ids) WITH ORDINALITY AS o(id, ord)
   WHERE l.id = o.id AND l.hotel_id = v_hotel;
END;
$$;

-- Remove: retired if items are stored there, deleted if not. Returns which.
CREATE OR REPLACE FUNCTION public.lf_storage_location_remove(p_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_hotel uuid := public._lf_storage_guard();
  v_loc   public.lost_and_found_storage_locations%ROWTYPE;
BEGIN
  SELECT * INTO v_loc FROM public.lost_and_found_storage_locations WHERE id = p_id AND hotel_id = v_hotel;
  IF v_loc.id IS NULL THEN
    RAISE EXCEPTION 'Location not found.' USING ERRCODE = 'P0002';
  END IF;
  IF (SELECT count(*) FROM public.lost_and_found_storage_locations WHERE hotel_id = v_hotel AND active AND id <> v_loc.id) = 0 THEN
    RAISE EXCEPTION 'Keep at least one storage location.' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.lost_and_found_items WHERE hotel_id = v_hotel AND storage_location = v_loc.key) THEN
    UPDATE public.lost_and_found_storage_locations SET active = false WHERE id = v_loc.id;
    RETURN 'retired';
  END IF;
  DELETE FROM public.lost_and_found_storage_locations WHERE id = v_loc.id;
  RETURN 'deleted';
END;
$$;

REVOKE ALL ON FUNCTION public._lf_storage_guard() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.lf_storage_location_save(uuid, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.lf_storage_location_reorder(uuid[]) FROM public, anon;
REVOKE ALL ON FUNCTION public.lf_storage_location_remove(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.lf_storage_location_save(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lf_storage_location_reorder(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lf_storage_location_remove(uuid) TO authenticated;

COMMIT;
