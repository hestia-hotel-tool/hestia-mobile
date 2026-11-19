-- Engineering's room checklist — Figma 4759:225.
--
-- Housekeeping's Checklist tab counts what a room used (consumables). This is
-- a different thing: a condition inspection. A technician walks the room by
-- category (Electrical, Plumbing, Wood work, Extras) and marks every item
-- Good or Issue; an issue carries a note and can become an engineering ticket.
--
--   inspection_items          the hotel's catalogue, per department
--   room_inspections          one per room, department and service day
--   room_inspection_results   one per item marked; no row = Unchecked
--
-- A new service day is a new inspection by itself (keyed on the day), so the
-- daily round reset needs nothing extra. Writes go only through the RPCs:
--
--   room_inspection(room, dept)                     load the tab
--   set_room_inspection_result(room, dept, item, result, note)
--   finish_room_inspection(room, dept, reason)      all marked → round Checked
--   raise_room_inspection_tickets(room, dept)       one ticket per open issue
--
-- Who may mark: the technician holding the room this shift, or an
-- engineering lead. The technician's first mark starts the round (or resumes
-- it) — doing the checklist is doing the check.

BEGIN;

-- 1. Tables ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inspection_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  category      text NOT NULL,
  name          text NOT NULL,
  image_key     text,
  sort_order    integer NOT NULL DEFAULT 0,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, department_id, name)
);

CREATE TABLE IF NOT EXISTS public.room_inspections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_id       uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  service_day   date NOT NULL,
  completed_at  timestamptz,
  completed_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, department_id, service_day)
);
CREATE INDEX IF NOT EXISTS room_inspections_hotel_day_idx
  ON public.room_inspections (hotel_id, service_day);

CREATE TABLE IF NOT EXISTS public.room_inspection_results (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.room_inspections(id) ON DELETE CASCADE,
  item_id       uuid NOT NULL REFERENCES public.inspection_items(id) ON DELETE CASCADE,
  result        text NOT NULL CHECK (result IN ('good', 'issue')),
  note          text CHECK (note IS NULL OR length(note) <= 500),
  ticket_id     uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  updated_by    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (inspection_id, item_id)
);

ALTER TABLE public.inspection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_inspection_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hotel users can read inspection items" ON public.inspection_items;
CREATE POLICY "Hotel users can read inspection items" ON public.inspection_items
  FOR SELECT USING (hotel_id = (SELECT public.auth_hotel_id()));
DROP POLICY IF EXISTS "Hotel users can read room inspections" ON public.room_inspections;
CREATE POLICY "Hotel users can read room inspections" ON public.room_inspections
  FOR SELECT USING (hotel_id = (SELECT public.auth_hotel_id()));
DROP POLICY IF EXISTS "Hotel users can read inspection results" ON public.room_inspection_results;
CREATE POLICY "Hotel users can read inspection results" ON public.room_inspection_results
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.room_inspections i
     WHERE i.id = inspection_id AND i.hotel_id = (SELECT public.auth_hotel_id())
  ));
-- No write policies: the RPCs below are the only way in.

-- 2. Engineering's catalogue ----------------------------------------------------
-- Electrical is Figma 4759:225's list; the other three are the standard
-- guest-room engineering walk-through, editable per hotel.
INSERT INTO public.inspection_items (hotel_id, department_id, category, name, image_key, sort_order)
SELECT h.id, public._department_id('engineering'), v.category, v.name, v.image_key, v.sort_order
  FROM public.hotels h
 CROSS JOIN (VALUES
   ('electrical', 'Lightbulbs',                 'lightbulbs',         1),
   ('electrical', 'Heating/Cooling System',     'heating-cooling',    2),
   ('electrical', 'Jewelry and Cash Safe',      'safe',               3),
   ('electrical', 'Tv/Remote Controller',       'tv-remote',          4),
   ('electrical', 'Kitchen Fridge/Appliances',  'kitchen-appliances', 5),
   ('plumbing',   'Taps and Sink',              NULL,                 1),
   ('plumbing',   'Shower and Water Pressure',  NULL,                 2),
   ('plumbing',   'Toilet and Flush',           NULL,                 3),
   ('plumbing',   'Drains',                     NULL,                 4),
   ('plumbing',   'Hot Water',                  NULL,                 5),
   ('woodwork',   'Doors and Locks',            NULL,                 1),
   ('woodwork',   'Wardrobe and Drawers',       NULL,                 2),
   ('woodwork',   'Bed Frame and Headboard',    NULL,                 3),
   ('woodwork',   'Desk and Chairs',            NULL,                 4),
   ('woodwork',   'Windows and Frames',         NULL,                 5),
   ('extras',     'Smoke Detector',             NULL,                 1),
   ('extras',     'Telephone',                  NULL,                 2),
   ('extras',     'Wi-Fi Signal',               NULL,                 3),
   ('extras',     'Hair Dryer',                 NULL,                 4),
   ('extras',     'Curtains and Blinds',        NULL,                 5)
 ) AS v(category, name, image_key, sort_order)
ON CONFLICT (hotel_id, department_id, name) DO NOTHING;

-- 3. Helpers ----------------------------------------------------------------------
-- The hotel's service day: the day of its last daily reset (the round's day).
CREATE OR REPLACE FUNCTION public._hotel_service_day(p_hotel_id uuid)
RETURNS date
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(h.service_day_reset_on, public._hotel_local_now(h.id)::date)
    FROM public.hotels h WHERE h.id = p_hotel_id;
$$;
REVOKE ALL ON FUNCTION public._hotel_service_day(uuid) FROM PUBLIC, anon, authenticated;

-- Today's inspection for a room (created on first use), after checking the
-- caller may work it. Returns the inspection id; sets the assignee out-param.
CREATE OR REPLACE FUNCTION public._room_inspection_for_write(
  p_room_id uuid,
  p_department text,
  OUT inspection_id uuid,
  OUT assignee uuid,
  OUT is_lead boolean,
  OUT room_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hotel uuid := public.auth_hotel_id();
  v_dept uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;
  IF p_department <> 'engineering' THEN
    RAISE EXCEPTION 'Only Engineering keeps a room inspection.' USING ERRCODE = '22023';
  END IF;
  v_dept := public._department_id(p_department);

  SELECT r.room_number INTO room_number FROM public.rooms r WHERE r.id = p_room_id AND r.hotel_id = v_hotel;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found.' USING ERRCODE = 'P0002';
  END IF;

  is_lead := public.auth_has_permission(public._assign_permission(v_dept));
  SELECT ra.user_id INTO assignee FROM public.room_assignments ra
   WHERE ra.room_id = p_room_id AND ra.department_id = v_dept
     AND ra.shift_id = public._hotel_current_shift(v_hotel)
   ORDER BY ra.updated_at DESC NULLS LAST LIMIT 1;

  IF assignee IS DISTINCT FROM v_uid AND NOT is_lead THEN
    IF assignee IS NULL THEN
      RAISE EXCEPTION 'Room % has no technician this shift.', room_number USING ERRCODE = '42501';
    END IF;
    RAISE EXCEPTION 'Room % is another technician''s.', room_number USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.room_inspections (hotel_id, room_id, department_id, service_day)
  VALUES (v_hotel, p_room_id, v_dept, public._hotel_service_day(v_hotel))
  ON CONFLICT (room_id, department_id, service_day) DO UPDATE SET updated_at = now()
  RETURNING id INTO inspection_id;
END;
$$;
REVOKE ALL ON FUNCTION public._room_inspection_for_write(uuid, text) FROM PUBLIC, anon, authenticated;

-- 4. Load ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.room_inspection(p_room_id uuid, p_department text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_dept uuid := public._department_id(p_department);
  v_insp public.room_inspections%ROWTYPE;
  v_by text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.rooms WHERE id = p_room_id AND hotel_id = v_hotel) THEN
    RAISE EXCEPTION 'Room not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_insp FROM public.room_inspections
   WHERE room_id = p_room_id AND department_id = v_dept
     AND service_day = public._hotel_service_day(v_hotel);
  IF v_insp.completed_by IS NOT NULL THEN
    SELECT full_name INTO v_by FROM public.users WHERE id = v_insp.completed_by;
  END IF;

  RETURN jsonb_build_object(
    'serviceDay', public._hotel_service_day(v_hotel),
    'completedAt', v_insp.completed_at,
    'completedBy', v_by,
    'items', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', it.id,
               'category', it.category,
               'name', it.name,
               'imageKey', it.image_key,
               'sortOrder', it.sort_order,
               'result', res.result,
               'note', res.note,
               'ticketId', res.ticket_id
             ) ORDER BY it.category, it.sort_order, it.name)
        FROM public.inspection_items it
        LEFT JOIN public.room_inspection_results res
               ON res.item_id = it.id AND res.inspection_id = v_insp.id
       WHERE it.hotel_id = v_hotel AND it.department_id = v_dept AND it.active
    ), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.room_inspection(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.room_inspection(uuid, text) TO authenticated;

-- 5. Mark one item --------------------------------------------------------------------
-- p_result: 'good' | 'issue' | NULL (back to Unchecked).
CREATE OR REPLACE FUNCTION public.set_room_inspection_result(
  p_room_id uuid,
  p_department text,
  p_item_id uuid,
  p_result text,
  p_note text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  w record;
  v_status text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
BEGIN
  IF p_result IS NOT NULL AND p_result NOT IN ('good', 'issue') THEN
    RAISE EXCEPTION 'Unknown result %.', p_result USING ERRCODE = '22023';
  END IF;
  w := public._room_inspection_for_write(p_room_id, p_department);

  IF NOT EXISTS (
    SELECT 1 FROM public.inspection_items
     WHERE id = p_item_id AND hotel_id = public.auth_hotel_id()
       AND department_id = public._department_id(p_department) AND active
  ) THEN
    RAISE EXCEPTION 'Checklist item not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Doing the checklist is doing the check: the technician's mark starts or
  -- resumes the round. A lead marking does not move it.
  SELECT status INTO v_status FROM public.room_department_states
   WHERE room_id = p_room_id AND department_id = public._department_id(p_department);
  v_status := coalesce(v_status, 'unchecked');
  IF v_status = 'unchecked' THEN
    IF w.assignee = v_uid THEN
      PERFORM public.room_department_action(p_room_id, p_department, 'start', NULL);
    ELSE
      RAISE EXCEPTION 'Room % has not been started — start it from the status menu first.', w.room_number
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF v_status = 'paused' AND w.assignee = v_uid THEN
    PERFORM public.room_department_action(p_room_id, p_department, 'resume', NULL);
  END IF;

  IF p_result IS NULL THEN
    DELETE FROM public.room_inspection_results
     WHERE inspection_id = w.inspection_id AND item_id = p_item_id;
  ELSE
    INSERT INTO public.room_inspection_results (inspection_id, item_id, result, note, updated_by)
    VALUES (w.inspection_id, p_item_id, p_result, CASE WHEN p_result = 'issue' THEN v_note END, v_uid)
    ON CONFLICT (inspection_id, item_id) DO UPDATE
      SET result = EXCLUDED.result,
          note = EXCLUDED.note,
          -- A ticket already raised stays linked while the item is still an issue.
          ticket_id = CASE WHEN EXCLUDED.result = 'issue' THEN room_inspection_results.ticket_id END,
          updated_by = v_uid,
          updated_at = now();
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_room_inspection_result(uuid, text, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_room_inspection_result(uuid, text, uuid, text, text) TO authenticated;

-- 6. Finish -----------------------------------------------------------------------------
-- Every item marked → the inspection is complete and the round goes Checked.
-- A lead finishing for the technician gives a reason (room_department_action).
CREATE OR REPLACE FUNCTION public.finish_room_inspection(
  p_room_id uuid,
  p_department text,
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hotel uuid := public.auth_hotel_id();
  v_dept uuid := public._department_id(p_department);
  w record;
  v_left integer;
  v_issues integer;
  v_status text;
BEGIN
  w := public._room_inspection_for_write(p_room_id, p_department);

  SELECT count(*) INTO v_left
    FROM public.inspection_items it
   WHERE it.hotel_id = v_hotel AND it.department_id = v_dept AND it.active
     AND NOT EXISTS (SELECT 1 FROM public.room_inspection_results r
                      WHERE r.inspection_id = w.inspection_id AND r.item_id = it.id);
  IF v_left > 0 THEN
    RAISE EXCEPTION '% item(s) on Room %''s checklist are still unchecked.', v_left, w.room_number
      USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_issues FROM public.room_inspection_results
   WHERE inspection_id = w.inspection_id AND result = 'issue';

  SELECT status INTO v_status FROM public.room_department_states
   WHERE room_id = p_room_id AND department_id = v_dept;
  IF coalesce(v_status, 'unchecked') <> 'checked' THEN
    PERFORM public.room_department_action(p_room_id, p_department, 'check', p_reason);
  END IF;

  UPDATE public.room_inspections
     SET completed_at = now(), completed_by = v_uid, updated_at = now()
   WHERE id = w.inspection_id;

  INSERT INTO public.room_history (room_id, hotel_id, user_id, event_type, description)
  VALUES (p_room_id, v_hotel, v_uid, 'engineering',
          CASE WHEN v_issues = 0 THEN 'Completed the engineering checklist — all good'
               ELSE format('Completed the engineering checklist — %s issue%s', v_issues,
                           CASE WHEN v_issues = 1 THEN '' ELSE 's' END) END);

  RETURN jsonb_build_object('issues', v_issues);
END;
$$;
REVOKE ALL ON FUNCTION public.finish_room_inspection(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_room_inspection(uuid, text, text) TO authenticated;

-- 7. Tickets for the issues ---------------------------------------------------------------
-- One engineering ticket per issue that has none yet; a repeat call raises
-- nothing twice. Returns how many were raised.
CREATE OR REPLACE FUNCTION public.raise_room_inspection_tickets(p_room_id uuid, p_department text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hotel uuid := public.auth_hotel_id();
  v_dept uuid := public._department_id(p_department);
  w record;
  r record;
  v_ticket uuid;
  v_n integer := 0;
BEGIN
  w := public._room_inspection_for_write(p_room_id, p_department);

  FOR r IN
    SELECT res.id, it.name, res.note
      FROM public.room_inspection_results res
      JOIN public.inspection_items it ON it.id = res.item_id
     WHERE res.inspection_id = w.inspection_id AND res.result = 'issue' AND res.ticket_id IS NULL
     ORDER BY it.category, it.sort_order
     FOR UPDATE OF res
  LOOP
    INSERT INTO public.tickets (hotel_id, title, description, status, room_id, created_by_id, department_id)
    VALUES (v_hotel, r.name, coalesce(r.note, format('Issue found on the Room %s checklist.', w.room_number)),
            'unsolved', p_room_id, v_uid, v_dept)
    RETURNING id INTO v_ticket;

    UPDATE public.room_inspection_results SET ticket_id = v_ticket WHERE id = r.id;

    INSERT INTO public.room_history (room_id, hotel_id, user_id, event_type, event_id, description)
    VALUES (p_room_id, v_hotel, v_uid, 'ticket', v_ticket, format('Raised a ticket: %s', r.name));
    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.raise_room_inspection_tickets(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.raise_room_inspection_tickets(uuid, text) TO authenticated;

COMMIT;
