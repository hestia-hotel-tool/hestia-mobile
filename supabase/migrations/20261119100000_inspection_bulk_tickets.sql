-- Engineering checklist → bulk tickets — Figma 4759:1554.
--
-- After Submit the tab lists the issues as one form ("Create Checklist
-- Ticket"): each issue gets its own title (the note to start with), photos and
-- urgency, and one "Create Ticket" raises them all. So the RPC now takes what
-- each ticket says instead of copying the note:
--
--   p_tickets: [{ "itemId": uuid, "title": text, "priority": "urgent" |
--                 "medium" | "notUrgent", "photoUrls": [text] }, …]
--
-- Only issues on today's inspection with no ticket yet are raised; anything
-- else in the list is ignored, so a retry raises nothing twice. Without
-- p_tickets it raises every open issue from its note, as before.

BEGIN;

DROP FUNCTION IF EXISTS public.raise_room_inspection_tickets(uuid, text);

CREATE OR REPLACE FUNCTION public.raise_room_inspection_tickets(
  p_room_id uuid,
  p_department text,
  p_tickets jsonb DEFAULT NULL
) RETURNS integer
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
  t jsonb;
  v_title text;
  v_priority text;
  v_photos text[];
  v_ticket uuid;
  v_n integer := 0;
BEGIN
  IF p_tickets IS NOT NULL AND jsonb_typeof(p_tickets) <> 'array' THEN
    RAISE EXCEPTION 'p_tickets must be a list.' USING ERRCODE = '22023';
  END IF;
  w := public._room_inspection_for_write(p_room_id, p_department);

  FOR r IN
    SELECT res.id, res.item_id, it.name, res.note
      FROM public.room_inspection_results res
      JOIN public.inspection_items it ON it.id = res.item_id
     WHERE res.inspection_id = w.inspection_id AND res.result = 'issue' AND res.ticket_id IS NULL
     ORDER BY it.category, it.sort_order
     FOR UPDATE OF res
  LOOP
    t := NULL;
    IF p_tickets IS NOT NULL THEN
      SELECT x INTO t FROM jsonb_array_elements(p_tickets) x WHERE (x->>'itemId')::uuid = r.item_id LIMIT 1;
      CONTINUE WHEN t IS NULL;
    END IF;

    v_title := left(coalesce(nullif(btrim(t->>'title'), ''), r.note, r.name), 200);
    v_priority := CASE WHEN t->>'priority' IN ('urgent', 'medium', 'notUrgent') THEN t->>'priority' END;
    v_photos := coalesce(ARRAY(SELECT jsonb_array_elements_text(coalesce(t->'photoUrls', '[]'::jsonb))), '{}');

    INSERT INTO public.tickets (hotel_id, title, description, status, priority, room_id, created_by_id, department_id, photo_urls)
    VALUES (v_hotel, v_title,
            format('Room %s checklist — %s%s', w.room_number, r.name,
                   CASE WHEN r.note IS NOT NULL AND r.note <> v_title THEN ': ' || r.note ELSE '' END),
            'unsolved', v_priority, p_room_id, v_uid, v_dept, v_photos)
    RETURNING id INTO v_ticket;

    UPDATE public.room_inspection_results SET ticket_id = v_ticket WHERE id = r.id;

    INSERT INTO public.room_history (room_id, hotel_id, user_id, event_type, event_id, description, attachments)
    VALUES (p_room_id, v_hotel, v_uid, 'ticket', v_ticket, format('Raised a ticket: %s', v_title), to_jsonb(v_photos));
    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.raise_room_inspection_tickets(uuid, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.raise_room_inspection_tickets(uuid, text, jsonb) TO authenticated;

COMMIT;
