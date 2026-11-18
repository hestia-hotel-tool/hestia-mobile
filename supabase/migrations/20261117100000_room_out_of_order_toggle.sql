-- Engineering takes a room out of order from its status menu (Figma 4686:686).
--
-- A room's out-of-order fields (out_of_order_from / _to / _reason) are room
-- setup: `_rooms_setup_guard` lets only `rooms.manage` (full_access) change
-- them. Engineering needs to switch a room out of order with a reason and back,
-- and nothing else about the room's setup, so:
--
--   1. a permission for exactly that, `rooms.out_of_order.toggle`
--      (engineering, full_access — EXTRA_GRANTS in scripts/rbac/parse-spec.py);
--   2. `set_room_out_of_order()`, which checks it and writes only those three
--      fields, for a room in the caller's hotel;
--   3. the setup guard lets that function's own write through (the same
--      transaction-local flag pattern as `hestia.type_sync` / `hestia.room_action`).
--
-- Switching on starts today (the caller's local date) with no end date: the
-- room stays out of order until someone switches it off. The app reads a null
-- `out_of_order_to` as open-ended.

BEGIN;

-- 1. The permission and its grants.
INSERT INTO public.permissions (name, description) VALUES
  ('rooms.out_of_order.toggle', 'Take a room out of order (with a reason) and put it back')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.roles r
  JOIN public.permissions p ON p.name = 'rooms.out_of_order.toggle'
 WHERE r.key IN ('engineering', 'full_access')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 2. The setup guard, unchanged except for the `hestia.out_of_order` pass.
CREATE OR REPLACE FUNCTION public._rooms_setup_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- System jobs, migrations and the room-type sync pass.
  IF auth.uid() IS NULL OR coalesce(current_setting('hestia.type_sync', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  -- set_room_out_of_order() has checked its own permission and touches only
  -- the out-of-order fields; everything else still needs rooms.manage.
  IF coalesce(current_setting('hestia.out_of_order', true), '') = 'on'
     AND (NEW.room_number, NEW.floor_id, NEW.section, NEW.room_type_id, NEW.active, NEW.hotel_id)
         IS NOT DISTINCT FROM
         (OLD.room_number, OLD.floor_id, OLD.section, OLD.room_type_id, OLD.active, OLD.hotel_id)
     AND NEW.credit IS NOT DISTINCT FROM OLD.credit
     AND NEW.credit_is_custom IS NOT DISTINCT FROM OLD.credit_is_custom THEN
    RETURN NEW;
  END IF;
  IF (NEW.room_number, NEW.floor_id, NEW.section, NEW.room_type_id, NEW.active,
      NEW.out_of_order_from, NEW.out_of_order_to, NEW.out_of_order_reason, NEW.hotel_id)
     IS DISTINCT FROM
     (OLD.room_number, OLD.floor_id, OLD.section, OLD.room_type_id, OLD.active,
      OLD.out_of_order_from, OLD.out_of_order_to, OLD.out_of_order_reason, OLD.hotel_id)
     AND NOT public.auth_has_permission('rooms.manage') THEN
    RAISE EXCEPTION 'Only a manager can change how rooms are set up.' USING ERRCODE = '42501';
  END IF;
  IF (NEW.credit IS DISTINCT FROM OLD.credit OR NEW.credit_is_custom IS DISTINCT FROM OLD.credit_is_custom)
     AND NOT (public.auth_has_permission('rooms.manage') OR public.auth_has_permission('rooms.credits.manage')) THEN
    RAISE EXCEPTION 'Only a manager can change cleaning credits.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

-- 3. The function.
CREATE OR REPLACE FUNCTION public.set_room_out_of_order(
  p_room_id uuid,
  p_out_of_order boolean,
  p_reason text DEFAULT NULL,
  p_from date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.auth_has_permission('rooms.out_of_order.toggle') OR public.auth_has_permission('rooms.manage')) THEN
    RAISE EXCEPTION 'You cannot take rooms out of order.' USING ERRCODE = '42501';
  END IF;
  IF p_out_of_order AND nullif(btrim(coalesce(p_reason, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Say why the room is out of order.' USING ERRCODE = '22023';
  END IF;

  PERFORM set_config('hestia.out_of_order', 'on', true);

  UPDATE public.rooms
     SET out_of_order_from   = CASE WHEN p_out_of_order THEN coalesce(p_from, current_date) END,
         out_of_order_to     = NULL,
         out_of_order_reason = CASE WHEN p_out_of_order THEN left(btrim(p_reason), 500) END
   WHERE id = p_room_id
     AND hotel_id = public.auth_hotel_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found.' USING ERRCODE = 'P0002';
  END IF;

  PERFORM set_config('hestia.out_of_order', 'off', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_room_out_of_order(uuid, boolean, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_room_out_of_order(uuid, boolean, text, date) TO authenticated;

COMMIT;
