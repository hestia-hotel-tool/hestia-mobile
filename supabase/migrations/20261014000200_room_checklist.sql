-- Room Checklist (minibar and laundry): record what a room used.
--
-- The app's Checklist tab was a mock — its items were hard-coded and Submit
-- saved nothing. This gives it a real catalogue and a real submit:
--
--  1. consumables becomes the per-hotel catalogue the tab draws: a question
--     to ask, a bundled picture, an order, an active flag and a par level (how
--     many are stocked; the stepper cannot go past it). The real items are
--     seeded per hotel; the old placeholder rows ("Mini Bar - Coke"…), never
--     used, are switched off.
--  2. consumptions records each use. A room with no guest still records
--     (restocking, an empty room's laundry), so reservation_id is optional.
--     One Submit is one submission_id; a repeated submit with the same id
--     records nothing twice.
--  3. room_checklist(room) loads the tab in one call; submit_room_checklist()
--     is the only way to write. Direct writes to consumptions, which any
--     signed-in member of the hotel could make, are closed.

BEGIN;

-- 1. Catalogue ---------------------------------------------------------------
ALTER TABLE public.consumables
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS image_key text,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS par_level integer;

ALTER TABLE public.consumables
  ADD CONSTRAINT consumables_par_level_range CHECK (par_level IS NULL OR par_level BETWEEN 0 AND 999);

-- The seed placeholders were never used (no consumptions exist).
UPDATE public.consumables SET active = false
 WHERE name IN ('Mini Bar - Coke', 'Mini Bar - Water', 'Laundry - Shirt', 'Towels - Extra')
   AND NOT EXISTS (SELECT 1 FROM public.consumptions c WHERE c.consumable_id = consumables.id);

INSERT INTO public.consumables (hotel_id, name, category, description, image_key, sort_order, par_level, billable, unit_price)
SELECT h.id, v.name, v.category, v.description, v.image_key, v.sort_order, v.par_level, v.billable, 0
  FROM public.hotels h
 CROSS JOIN (VALUES
   ('Valser Sparkling Water', 'mini_bar', 'How many bottles of Valser Sparkling Water were consumed?', 'sparkling-water', 1, 10, true),
   ('Valser Still Water',     'mini_bar', 'How many bottles of Valser Still Water were consumed?',     'still-water',     2, 10, true),
   ('Coca-Cola Zero',         'mini_bar', 'How many bottles of Coca-Cola Zero were consumed?',         'coca-cola-zero',  3, 10, true),
   ('Rivella',                'mini_bar', 'How many bottles of Rivella were consumed?',                'rivella',         4, 10, true),
   ('Towels Changed',         'laundry',  'How many times were the towels changed?',                   'large-towels',    1, NULL, false),
   ('Medium Towels',          'laundry',  'How many medium towels were replaced?',                     'medium-towels',   2, NULL, false),
   ('Face Towels',            'laundry',  'How many face towels were replaced?',                       'face-towels',     3, NULL, false)
 ) AS v(name, category, description, image_key, sort_order, par_level, billable)
 WHERE NOT EXISTS (SELECT 1 FROM public.consumables c WHERE c.hotel_id = h.id AND c.name = v.name);

-- 2. Consumptions -------------------------------------------------------------
ALTER TABLE public.consumptions ALTER COLUMN reservation_id DROP NOT NULL;
ALTER TABLE public.consumptions ADD COLUMN IF NOT EXISTS submission_id uuid;
ALTER TABLE public.consumptions
  ADD CONSTRAINT consumptions_quantity_positive CHECK (quantity BETWEEN 1 AND 999);
CREATE UNIQUE INDEX IF NOT EXISTS consumptions_submission_item_uq
  ON public.consumptions (submission_id, consumable_id) WHERE submission_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS consumptions_room_consumed_idx
  ON public.consumptions (room_id, consumed_at DESC);

-- Reads stay open to the hotel; writes go through submit_room_checklist().
DROP POLICY IF EXISTS "Hotel users can manage consumptions" ON public.consumptions;
CREATE POLICY "Hotel users can read consumptions" ON public.consumptions
  FOR SELECT USING (hotel_id = (SELECT public.auth_hotel_id()));

-- 3. The stay a checklist is for -----------------------------------------------
-- The guest staying in the room on the hotel's today. On a changeover day the
-- departing guest (earlier arrival) comes first: the minibar is checked when
-- they leave.
CREATE OR REPLACE FUNCTION public._room_current_stay(p_room_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT res.id
    FROM public.reservations res
    JOIN public.rooms r ON r.id = res.room_id
    JOIN public.hotels h ON h.id = r.hotel_id
   WHERE res.room_id = p_room_id
     AND res.arrival_date <= (now() AT TIME ZONE h.timezone)::date
     AND res.departure_date >= (now() AT TIME ZONE h.timezone)::date
   ORDER BY res.arrival_date ASC, res.departure_date ASC
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public._room_current_stay(uuid) FROM public, anon, authenticated;

-- Everything the Checklist tab shows, in one call.
CREATE OR REPLACE FUNCTION public.room_checklist(p_room_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r public.rooms%ROWTYPE;
  v_stay uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.auth_has_permission('rooms.checklist.view') THEN
    RAISE EXCEPTION 'You do not have access to the room checklist.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.rooms WHERE id = p_room_id AND hotel_id = public.auth_hotel_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found.' USING ERRCODE = 'P0002';
  END IF;
  v_stay := public._room_current_stay(r.id);

  RETURN jsonb_build_object(
    'me', (SELECT jsonb_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url)
             FROM public.users u WHERE u.id = v_uid),
    'stay', (
      SELECT jsonb_build_object(
        'reservation_id', res.id,
        'arrival_date', res.arrival_date,
        'departure_date', res.departure_date,
        'guest_name', (SELECT g.full_name FROM public.reservation_guests rg
                         JOIN public.guests g ON g.id = rg.guest_id
                        WHERE rg.reservation_id = res.id
                        ORDER BY rg.guest_order LIMIT 1))
        FROM public.reservations res WHERE res.id = v_stay),
    'items', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'category', c.category, 'description', c.description,
               'image_key', c.image_key, 'unit_price', c.unit_price, 'billable', c.billable,
               'par_level', c.par_level)
             ORDER BY c.category, c.sort_order, c.name)
        FROM public.consumables c
       WHERE c.hotel_id = r.hotel_id AND c.active), '[]'::jsonb),
    -- What was recorded this stay (or, with no guest, in the last day).
    'submissions', coalesce((
      SELECT jsonb_agg(s ORDER BY s->>'reported_at' DESC)
        FROM (
          SELECT jsonb_build_object(
                   'submission_id', coalesce(x.submission_id, x.id),
                   'reported_at', min(x.consumed_at),
                   'reported_by', jsonb_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url),
                   'remarks', max(x.remarks),
                   'total', sum(x.total_amount),
                   'items', jsonb_agg(jsonb_build_object(
                              'consumable_id', x.consumable_id, 'name', c.name, 'category', c.category,
                              'image_key', c.image_key, 'quantity', x.quantity,
                              'unit_price', x.unit_price, 'total', x.total_amount)
                            ORDER BY c.category, c.sort_order)) AS s
            FROM public.consumptions x
            JOIN public.consumables c ON c.id = x.consumable_id
            LEFT JOIN public.users u ON u.id = x.reported_by_id
           WHERE x.room_id = r.id
             AND CASE WHEN v_stay IS NOT NULL THEN x.reservation_id = v_stay
                      ELSE x.reservation_id IS NULL AND x.consumed_at > now() - interval '1 day' END
           GROUP BY coalesce(x.submission_id, x.id), u.id, u.full_name, u.avatar_url
           ORDER BY min(x.consumed_at) DESC
           LIMIT 20
        ) sub(s)), '[]'::jsonb)
  );
END;
$$;

-- Record a submit. Idempotent on p_submission_id.
CREATE OR REPLACE FUNCTION public.submit_room_checklist(
  p_room_id uuid,
  p_items jsonb,
  p_submission_id uuid,
  p_remarks text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r public.rooms%ROWTYPE;
  v_stay uuid;
  v_remarks text := nullif(btrim(coalesce(p_remarks, '')), '');
  v_count integer;
  v_total numeric;
  v_summary text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.auth_has_permission('rooms.checklist.complete') THEN
    RAISE EXCEPTION 'You do not have permission to submit the room checklist.' USING ERRCODE = '42501';
  END IF;
  IF p_submission_id IS NULL THEN
    RAISE EXCEPTION 'Missing submission id.' USING ERRCODE = '22023';
  END IF;
  IF v_remarks IS NOT NULL AND char_length(v_remarks) > 500 THEN
    RAISE EXCEPTION 'Remarks can be at most 500 characters.' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO r FROM public.rooms WHERE id = p_room_id AND hotel_id = public.auth_hotel_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Already recorded (a retried or double-tapped submit): report it, add nothing.
  IF EXISTS (SELECT 1 FROM public.consumptions WHERE submission_id = p_submission_id) THEN
    SELECT count(*), sum(total_amount) INTO v_count, v_total
      FROM public.consumptions WHERE submission_id = p_submission_id;
    RETURN jsonb_build_object('submission_id', p_submission_id, 'count', v_count, 'total', v_total, 'duplicate', true);
  END IF;

  v_stay := public._room_current_stay(r.id);

  WITH wanted AS (
    SELECT (e->>'consumable_id')::uuid AS consumable_id, sum((e->>'quantity')::int) AS quantity
      FROM jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) e
     WHERE coalesce((e->>'quantity')::int, 0) > 0
     GROUP BY 1
  ), ins AS (
    INSERT INTO public.consumptions
      (hotel_id, room_id, reservation_id, consumable_id, quantity, unit_price, total_amount,
       status, reported_by_id, consumed_at, remarks, submission_id)
    SELECT r.hotel_id, r.id, v_stay, c.id, w.quantity, c.unit_price,
           CASE WHEN c.billable AND c.unit_price IS NOT NULL THEN round(c.unit_price * w.quantity, 2) END,
           CASE WHEN c.billable AND v_stay IS NOT NULL THEN 'pending' ELSE 'recorded' END,
           v_uid, now(), v_remarks, p_submission_id
      FROM wanted w
      JOIN public.consumables c ON c.id = w.consumable_id AND c.hotel_id = r.hotel_id AND c.active
    RETURNING consumable_id, quantity, total_amount
  )
  SELECT count(*), sum(i.total_amount),
         string_agg(format('%s× %s', i.quantity, c.name), ', ' ORDER BY c.category, c.sort_order)
    INTO v_count, v_total, v_summary
    FROM ins i JOIN public.consumables c ON c.id = i.consumable_id;

  IF coalesce(v_count, 0) = 0 THEN
    RAISE EXCEPTION 'Add at least one item before submitting.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.room_history (room_id, hotel_id, user_id, reservation_id, event_type, description)
  VALUES (r.id, r.hotel_id, v_uid, v_stay, 'checklist',
          format('Room checklist: %s', v_summary) || coalesce(format(' — %s', v_remarks), ''));

  RETURN jsonb_build_object('submission_id', p_submission_id, 'count', v_count, 'total', v_total, 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION public.room_checklist(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.room_checklist(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_room_checklist(uuid, jsonb, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.submit_room_checklist(uuid, jsonb, uuid, text) TO authenticated;

COMMIT;
