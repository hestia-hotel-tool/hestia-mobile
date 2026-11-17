-- Back office Step 5.3 (lost & found page): lf_set_status left the shipping
-- address behind when an item was then returned or discarded, so a returned
-- item still read "Shipped location: …". Each state now clears the others'
-- details completely, shipped_location included. Otherwise unchanged (B6).

CREATE OR REPLACE FUNCTION public.lf_set_status(p_id uuid, p_status text, p_details jsonb DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_item public.lost_and_found_items%ROWTYPE;
  d jsonb := coalesce(p_details, '{}');
  v_text text := nullif(btrim(coalesce(d->>'shipped_location', '')), '');
  v_carrier text := nullif(btrim(coalesce(d->>'shipping_carrier', '')), '');
  v_to text := nullif(btrim(coalesce(d->>'returned_to', '')), '');
  v_reason text := nullif(btrim(coalesce(d->>'discard_reason', '')), '');
  v_when timestamptz;
  v_line text;
BEGIN
  IF NOT public.auth_has_permission('lost_and_found.manage') THEN
    RAISE EXCEPTION 'Only a manager can change an item''s status this way.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_item FROM public.lost_and_found_items WHERE id = p_id AND hotel_id = v_hotel FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That item no longer exists.' USING ERRCODE = 'P0002';
  END IF;
  IF p_status NOT IN ('stored', 'shipped', 'returned', 'discarded') THEN
    RAISE EXCEPTION 'Unknown status "%".', p_status USING ERRCODE = '22023';
  END IF;

  CASE p_status
    WHEN 'shipped' THEN
      IF v_text IS NULL THEN RAISE EXCEPTION 'Enter where it is shipped to.' USING ERRCODE = '22023'; END IF;
      IF v_carrier IS NULL THEN RAISE EXCEPTION 'Enter the carrier.' USING ERRCODE = '22023'; END IF;
      v_when := coalesce((d->>'shipped_at')::timestamptz, now());
      UPDATE public.lost_and_found_items
         SET status = 'shipped', shipped_location = v_text, shipping_carrier = v_carrier,
             shipping_tracking = nullif(btrim(coalesce(d->>'shipping_tracking', '')), ''), shipped_at = v_when,
             returned_to = NULL, returned_at = NULL, return_id_checked = NULL, discarded_at = NULL, discard_reason = NULL
       WHERE id = p_id;
      v_line := format('%s (%s) shipped to %s with %s', v_item.item_name, v_item.tracking_number, v_text, v_carrier);
    WHEN 'returned' THEN
      IF v_to IS NULL THEN RAISE EXCEPTION 'Enter who it was returned to.' USING ERRCODE = '22023'; END IF;
      v_when := coalesce((d->>'returned_at')::timestamptz, now());
      UPDATE public.lost_and_found_items
         SET status = 'returned', returned_to = v_to, return_id_checked = coalesce((d->>'return_id_checked')::boolean, false),
             returned_at = v_when, return_info = coalesce(nullif(btrim(coalesce(d->>'return_info', '')), ''), return_info), shipped_location = NULL,
             shipped_at = NULL, shipping_carrier = NULL, shipping_tracking = NULL, discarded_at = NULL, discard_reason = NULL
       WHERE id = p_id;
      v_line := format('%s (%s) returned to %s', v_item.item_name, v_item.tracking_number, v_to);
    WHEN 'discarded' THEN
      IF v_reason IS NULL THEN RAISE EXCEPTION 'Give a reason for discarding it.' USING ERRCODE = '22023'; END IF;
      v_when := coalesce((d->>'discarded_at')::timestamptz, now());
      UPDATE public.lost_and_found_items
         SET status = 'discarded', discard_reason = v_reason, discarded_at = v_when, shipped_location = NULL,
             shipped_at = NULL, shipping_carrier = NULL, shipping_tracking = NULL, returned_to = NULL, returned_at = NULL, return_id_checked = NULL
       WHERE id = p_id;
      v_line := format('%s (%s) discarded: %s', v_item.item_name, v_item.tracking_number, v_reason);
    ELSE
      UPDATE public.lost_and_found_items
         SET status = 'stored', shipped_at = NULL, shipping_carrier = NULL, shipping_tracking = NULL, shipped_location = NULL,
             returned_to = NULL, returned_at = NULL, return_id_checked = NULL, discarded_at = NULL, discard_reason = NULL
       WHERE id = p_id;
      v_line := format('%s (%s) back in storage', v_item.item_name, v_item.tracking_number);
  END CASE;

  IF v_item.room_id IS NOT NULL THEN
    INSERT INTO public.room_history (hotel_id, room_id, reservation_id, user_id, event_type, description)
    VALUES (v_hotel, v_item.room_id, v_item.reservation_id, auth.uid(), 'lost_and_found', v_line);
  END IF;
END;
$$;
