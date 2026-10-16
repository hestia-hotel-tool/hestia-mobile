-- Back office: live operations backend (Step 4.1, docs/04-backend-changes.md §B5).
--
-- B0.1 (DND stored two ways) needed no change: tested on development, a
-- room_action('dnd') sets dnd_at through _rooms_service_exceptions, the
-- re-check notice fires from process_room_service_timers, and dnd_clear
-- resets it. The refusal's reason stays the source of truth.
--
-- 1. _hotel_current_shift(): the AM or PM shift on now, mobile's rule
--    (src/lib/hotelShifts.ts currentShiftNow).
-- 2. Room assignment notices go through one formatter. A bulk assign sends
--    each attendant ONE notice ("You have been assigned 12 rooms (AM shift)"),
--    with data.roomIds, which mobile's Tasks screen already opens as "View
--    Rooms". A single room reads exactly as before (data.roomId).
-- 3. assign_rooms(): assign or unassign many rooms in one transaction.
-- 4. room_board(): everything the live board needs, in one call.
-- 5. dashboard_summary(), dashboard_series(), attention_items().
--
-- Mobile impact: only the notice for a bulk assign changes (one notice, with
-- roomIds); mobile's own single assignments are unchanged.

-- ===========================================================================
-- 1. The shift on now
-- ===========================================================================

CREATE OR REPLACE FUNCTION public._hotel_current_shift(p_hotel_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now time := public._hotel_local_now(p_hotel_id)::time;
  v_name text;
BEGIN
  -- The window holding the time; a Night shift falls to AM before noon, PM after.
  SELECT upper(btrim(name)) INTO v_name FROM public.shifts
   WHERE hotel_id = p_hotel_id
     AND CASE WHEN start_time <= end_time THEN v_now >= start_time AND v_now < end_time
              ELSE v_now >= start_time OR v_now < end_time END
   ORDER BY start_time LIMIT 1;
  IF v_name IS NULL OR v_name NOT IN ('AM', 'PM') THEN
    v_name := CASE WHEN v_now < time '12:00' THEN 'AM' ELSE 'PM' END;
  END IF;
  RETURN (SELECT id FROM public.shifts WHERE hotel_id = p_hotel_id AND upper(btrim(name)) = v_name LIMIT 1);
END;
$$;

-- ===========================================================================
-- 2. One formatter for assignment notices
-- ===========================================================================

CREATE OR REPLACE FUNCTION public._room_assignment_notice(p_user_id uuid, p_hotel_id uuid, p_room_ids uuid[], p_shift_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_shift text := (SELECT btrim(name) FROM public.shifts WHERE id = p_shift_id);
  v_suffix text;
  v_room text;
  v_promise timestamptz;
  v_status text;
  v_numbers text[];
  v_body text;
  v_data jsonb;
  v_n int := coalesce(array_length(p_room_ids, 1), 0);
BEGIN
  IF p_user_id IS NULL OR v_n = 0 THEN
    RETURN;
  END IF;
  v_suffix := CASE WHEN v_shift IS NOT NULL AND v_shift <> '' THEN format(' (%s shift)', v_shift) ELSE '' END;

  IF v_n = 1 THEN
    -- Exactly the notice mobile has always sent for one room.
    SELECT room_number, promise_time_at, house_keeping_status INTO v_room, v_promise, v_status
      FROM public.rooms WHERE id = p_room_ids[1];
    v_body := format('You have been assigned to Room %s%s.', v_room, v_suffix);
    v_data := jsonb_build_object('roomId', p_room_ids[1], 'shiftId', p_shift_id);
    IF v_promise IS NOT NULL AND v_status NOT IN ('Cleaned', 'Inspected') THEN
      v_body := v_body || format(' Promised ready by %s.', public._hotel_local_time_label(p_hotel_id, v_promise));
      v_data := v_data || jsonb_build_object('promiseTimeAt', v_promise);
    END IF;
  ELSE
    SELECT array_agg(room_number ORDER BY room_number_sort, room_number) INTO v_numbers
      FROM public.rooms WHERE id = ANY (p_room_ids);
    v_body := format('You have been assigned %s rooms%s: %s%s.', v_n, v_suffix,
      array_to_string(v_numbers[1:8], ', '),
      CASE WHEN v_n > 8 THEN format(' and %s more', v_n - 8) ELSE '' END);
    IF EXISTS (SELECT 1 FROM public.rooms WHERE id = ANY (p_room_ids) AND promise_time_at IS NOT NULL
                 AND house_keeping_status NOT IN ('Cleaned', 'Inspected')) THEN
      v_body := v_body || ' Some have a promised time.';
    END IF;
    v_data := jsonb_build_object('roomIds', to_jsonb(p_room_ids), 'shiftId', p_shift_id);
  END IF;

  PERFORM public._notify_user(p_user_id, p_hotel_id, 'room_assignment', 'Room assignment', v_body, v_data);
END;
$$;

CREATE OR REPLACE FUNCTION public._room_assignments_notify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- An upsert that re-saves the same person is not a new assignment.
  IF TG_OP = 'UPDATE' AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id THEN
    RETURN NEW;
  END IF;
  -- assign_rooms() sends one notice per person for the whole batch.
  IF current_setting('hestia.bulk_assign', true) = 'on' THEN
    RETURN NEW;
  END IF;
  PERFORM public._room_assignment_notice(NEW.user_id, NEW.hotel_id, ARRAY[NEW.room_id], NEW.shift_id);
  RETURN NEW;
END;
$$;

-- ===========================================================================
-- 3. assign_rooms
-- ===========================================================================

-- Assign rooms to a person for a shift (p_user_id NULL unassigns them).
-- Returns how many rooms changed. Rooms already theirs are left alone.
CREATE OR REPLACE FUNCTION public.assign_rooms(p_room_ids uuid[], p_user_id uuid, p_shift_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_ids uuid[];
  v_room record;
  v_changed uuid[] := '{}';
  v_name text;
  v_active boolean;
  v_n int;
BEGIN
  IF NOT public.auth_has_permission('rooms.reassign') THEN
    RAISE EXCEPTION 'Only supervisors can assign rooms.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.shifts WHERE id = p_shift_id AND hotel_id = v_hotel) THEN
    RAISE EXCEPTION 'That shift was not found.' USING ERRCODE = 'P0002';
  END IF;
  SELECT array_agg(DISTINCT x) INTO v_ids FROM unnest(coalesce(p_room_ids, '{}')) x;
  v_n := coalesce(array_length(v_ids, 1), 0);
  IF v_n = 0 THEN
    RAISE EXCEPTION 'Pick at least one room.' USING ERRCODE = '22023';
  END IF;
  IF v_n > 500 THEN
    RAISE EXCEPTION 'Assign up to 500 rooms at a time.' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM public.rooms WHERE id = ANY (v_ids) AND hotel_id = v_hotel AND active) <> v_n THEN
    RAISE EXCEPTION 'Some of those rooms no longer exist or are inactive.' USING ERRCODE = 'P0002';
  END IF;
  IF p_user_id IS NOT NULL THEN
    SELECT full_name, active INTO v_name, v_active FROM public.users WHERE id = p_user_id AND hotel_id = v_hotel;
    IF NOT FOUND OR p_user_id = ANY (public.platform_team_ids()) THEN
      RAISE EXCEPTION 'That person isn''t on this hotel''s staff.' USING ERRCODE = 'P0002';
    END IF;
    IF NOT v_active THEN
      RAISE EXCEPTION '%''s account is disabled.', v_name USING ERRCODE = 'P0001';
    END IF;
  END IF;

  PERFORM set_config('hestia.bulk_assign', 'on', true);
  FOR v_room IN SELECT id FROM public.rooms WHERE id = ANY (v_ids) ORDER BY room_number_sort, room_number LOOP
    IF p_user_id IS NULL THEN
      DELETE FROM public.room_assignments WHERE room_id = v_room.id AND shift_id = p_shift_id;
      IF FOUND THEN v_changed := v_changed || v_room.id; END IF;
    ELSIF NOT EXISTS (SELECT 1 FROM public.room_assignments WHERE room_id = v_room.id AND shift_id = p_shift_id AND user_id = p_user_id) THEN
      INSERT INTO public.room_assignments (hotel_id, room_id, shift_id, user_id)
      VALUES (v_hotel, v_room.id, p_shift_id, p_user_id)
      ON CONFLICT (room_id, shift_id) DO UPDATE SET user_id = EXCLUDED.user_id;
      v_changed := v_changed || v_room.id;
    END IF;
  END LOOP;
  PERFORM set_config('hestia.bulk_assign', '', true);

  IF p_user_id IS NOT NULL THEN
    PERFORM public._room_assignment_notice(p_user_id, v_hotel, v_changed, p_shift_id);
  END IF;
  RETURN coalesce(array_length(v_changed, 1), 0);
END;
$$;

-- ===========================================================================
-- 4. room_board
-- ===========================================================================

-- Every active room for the board, with its assignment for p_shift_id (the
-- shift on now when NULL) and the stays touching the service day. The guest
-- kind is worked out in the app with mobile's own util (pickerGuestKind).
CREATE OR REPLACE FUNCTION public.room_board(p_shift_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_shift uuid := coalesce(p_shift_id, public._hotel_current_shift(public.auth_hotel_id()));
  v_day date := public.hotel_service_day(public.auth_hotel_id());
BEGIN
  IF NOT public.auth_has_permission('rooms.read') THEN
    RAISE EXCEPTION 'You can''t see the rooms.' USING ERRCODE = '42501';
  END IF;
  IF p_shift_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.shifts WHERE id = p_shift_id AND hotel_id = v_hotel) THEN
    RAISE EXCEPTION 'That shift was not found.' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'service_day', v_day,
    'shift_id', v_shift,
    'rooms', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'room_number', r.room_number,
        'room_number_sort', r.room_number_sort,
        'floor', CASE WHEN f.id IS NULL THEN NULL ELSE jsonb_build_object('id', f.id, 'name', f.name, 'sort_order', f.sort_order) END,
        'section', r.section,
        'type', CASE WHEN rt.id IS NULL THEN NULL ELSE jsonb_build_object('code', rt.code, 'name', rt.name) END,
        'credit', r.credit,
        'linen_status', r.linen_status,
        'state', public._room_state(r.house_keeping_status, r.paused_at, r.refuse_service_at, r.refuse_service_reason, r.return_later_at),
        'house_keeping_status', r.house_keeping_status,
        'priority', r.priority,
        'flagged', r.flagged,
        'flag_reason', r.flag_reason,
        'promise_time_at', r.promise_time_at,
        'paused_at', r.paused_at,
        'dnd_at', r.dnd_at,
        'dnd_next_check_at', r.dnd_next_check_at,
        'refuse_service_at', r.refuse_service_at,
        'refuse_service_reason', r.refuse_service_reason,
        'return_later_at', r.return_later_at,
        'return_later_reason', r.return_later_reason,
        'in_progress_started_at', r.in_progress_started_at,
        'cleaning_started_at', r.cleaning_started_at,
        'cleaning_elapsed_seconds', r.cleaning_elapsed_seconds,
        'out_of_order', r.out_of_order_from IS NOT NULL AND r.out_of_order_from <= v_day AND v_day <= r.out_of_order_to,
        'out_of_order_reason', r.out_of_order_reason,
        'assignment', (
          SELECT jsonb_build_object('user_id', ra.user_id, 'full_name', u.full_name, 'avatar_url', u.avatar_url, 'work_status', ra.work_status)
            FROM public.room_assignments ra LEFT JOIN public.users u ON u.id = ra.user_id
           WHERE ra.room_id = r.id AND ra.shift_id = v_shift
           LIMIT 1),
        'reservations', coalesce((
          SELECT jsonb_agg(jsonb_build_object(
                   'id', s.id, 'reference', s.reference, 'arrival_date', s.arrival_date, 'departure_date', s.departure_date,
                   'eta', s.eta, 'adults', s.adults, 'kids', s.kids, 'stay_status', s.stay_status,
                   'front_office_status', s.front_office_status, 'reservation_status', s.reservation_status,
                   'guests', coalesce((
                     SELECT jsonb_agg(jsonb_build_object('full_name', g.full_name, 'vip_code', g.vip_code) ORDER BY rg.guest_order)
                       FROM public.reservation_guests rg JOIN public.guests g ON g.id = rg.guest_id
                      WHERE rg.reservation_id = s.id), '[]'::jsonb))
                 ORDER BY s.arrival_date)
            FROM public.reservations s
           WHERE s.room_id = r.id
             AND s.stay_status NOT IN ('cancelled', 'no_show')
             AND s.arrival_date <= v_day AND v_day <= s.departure_date), '[]'::jsonb),
        'notes_count', (SELECT count(*) FROM public.room_notes n WHERE n.room_id = r.id)
      ) ORDER BY f.sort_order NULLS LAST, r.room_number_sort, r.room_number)
        FROM public.rooms r
        LEFT JOIN public.floors f ON f.id = r.floor_id
        LEFT JOIN public.room_types rt ON rt.id = r.room_type_id
       WHERE r.hotel_id = v_hotel AND r.active), '[]'::jsonb)
  );
END;
$$;

-- ===========================================================================
-- 5. Dashboard
-- ===========================================================================

-- Seconds cleaned so far, the running stretch included.
CREATE OR REPLACE FUNCTION public._room_cleaned_seconds(p_elapsed integer, p_started timestamptz)
RETURNS integer
LANGUAGE sql
STABLE
AS $$ SELECT coalesce(p_elapsed, 0) + CASE WHEN p_started IS NULL THEN 0 ELSE floor(extract(epoch FROM now() - p_started))::int END $$;

CREATE OR REPLACE FUNCTION public.dashboard_summary(p_day date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_day date := coalesce(p_day, public.hotel_service_day(public.auth_hotel_id()));
  v_shift uuid := public._hotel_current_shift(public.auth_hotel_id());
BEGIN
  IF NOT (public.auth_has_permission('reports.view') OR public.auth_has_permission('rooms.read')) THEN
    RAISE EXCEPTION 'You can''t see the dashboard.' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'service_day', v_day,
    -- Rooms right now (the board's states), out of order apart.
    'rooms_by_state', (
      SELECT jsonb_build_object(
        'dirty', count(*) FILTER (WHERE st = 'dirty'), 'in_progress', count(*) FILTER (WHERE st = 'in_progress'),
        'paused', count(*) FILTER (WHERE st = 'paused'), 'cleaned', count(*) FILTER (WHERE st = 'cleaned'),
        'inspected', count(*) FILTER (WHERE st = 'inspected'), 'dnd', count(*) FILTER (WHERE st = 'dnd'),
        'refused', count(*) FILTER (WHERE st = 'refused'), 'return_later', count(*) FILTER (WHERE st = 'return_later'),
        'out_of_order', count(*) FILTER (WHERE st = 'out_of_order'), 'total', count(*))
        FROM (SELECT CASE WHEN r.out_of_order_from IS NOT NULL AND r.out_of_order_from <= v_day AND v_day <= r.out_of_order_to THEN 'out_of_order'
                          ELSE public._room_state(r.house_keeping_status, r.paused_at, r.refuse_service_at, r.refuse_service_reason, r.return_later_at) END st
                FROM public.rooms r WHERE r.hotel_id = v_hotel AND r.active) x),
    'arrivals', (
      SELECT jsonb_build_object('total', count(*), 'checked_in', count(*) FILTER (WHERE stay_status IN ('checked_in', 'checked_out')))
        FROM public.reservations WHERE hotel_id = v_hotel AND arrival_date = v_day AND stay_status NOT IN ('cancelled', 'no_show')),
    'departures', (
      SELECT jsonb_build_object('total', count(*), 'checked_out', count(*) FILTER (WHERE stay_status = 'checked_out'))
        FROM public.reservations WHERE hotel_id = v_hotel AND departure_date = v_day AND stay_status NOT IN ('cancelled', 'no_show')),
    'in_house', (SELECT count(*) FROM public.reservations WHERE hotel_id = v_hotel AND stay_status = 'checked_in'),
    'staff', jsonb_build_object(
      'shift_id', v_shift,
      'on_shift', (SELECT count(*) FROM public.users u WHERE u.hotel_id = v_hotel AND u.active AND u.shift_id = v_shift
                     AND NOT (u.id = ANY (public.platform_team_ids()))),
      'on_break', (SELECT count(DISTINCT b.user_id) FROM public.staff_breaks b WHERE b.hotel_id = v_hotel AND b.ended_at IS NULL
                     AND b.started_at > now() - interval '12 hours')),
    'tickets_open', (
      SELECT jsonb_build_object('urgent', count(*) FILTER (WHERE priority = 'urgent'), 'medium', count(*) FILTER (WHERE priority = 'medium'),
                                'not_urgent', count(*) FILTER (WHERE priority IS NULL OR priority NOT IN ('urgent', 'medium')))
        FROM public.tickets WHERE hotel_id = v_hotel AND status <> 'done'),
    'lost_found_stored', (SELECT count(*) FROM public.lost_and_found_items WHERE hotel_id = v_hotel AND status = 'stored'),
    'overdue_rooms', (
      SELECT count(*) FROM public.rooms r
       WHERE r.hotel_id = v_hotel AND r.active AND r.house_keeping_status = 'InProgress' AND coalesce(r.credit, 0) > 0
         AND public._room_cleaned_seconds(r.cleaning_elapsed_seconds, r.cleaning_started_at) > r.credit * 60),
    'promises_due_60', (
      SELECT count(*) FROM public.rooms r
       WHERE r.hotel_id = v_hotel AND r.active AND r.promise_time_at IS NOT NULL AND r.promise_time_at <= now() + interval '60 minutes'
         AND coalesce(r.house_keeping_status, 'Dirty') NOT IN ('Cleaned', 'Inspected'))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.dashboard_series(p_day date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_day date := coalesce(p_day, public.hotel_service_day(public.auth_hotel_id()));
  v_zone text := coalesce((SELECT timezone FROM public.hotels WHERE id = public.auth_hotel_id()), 'UTC');
BEGIN
  IF NOT (public.auth_has_permission('reports.view') OR public.auth_has_permission('rooms.read')) THEN
    RAISE EXCEPTION 'You can''t see the dashboard.' USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'service_day', v_day,
    -- Rooms cleaned per hotel-local hour (housekeeping_sessions, B0.3), today and the day before.
    'cleaned_per_hour', coalesce((
      SELECT jsonb_agg(jsonb_build_object('hour', h, 'count', n) ORDER BY h) FROM (
        SELECT extract(hour FROM cleaned_at AT TIME ZONE v_zone)::int h, count(*) n
          FROM public.housekeeping_sessions WHERE hotel_id = v_hotel AND service_day = v_day AND cleaned_at IS NOT NULL
         GROUP BY 1) x), '[]'::jsonb),
    'yesterday', coalesce((
      SELECT jsonb_agg(jsonb_build_object('hour', h, 'count', n) ORDER BY h) FROM (
        SELECT extract(hour FROM cleaned_at AT TIME ZONE v_zone)::int h, count(*) n
          FROM public.housekeeping_sessions WHERE hotel_id = v_hotel AND service_day = v_day - 1 AND cleaned_at IS NOT NULL
         GROUP BY 1) x), '[]'::jsonb),
    -- Rooms per floor right now; paused counts as in progress, DND / refused / return later as dirty.
    'by_floor', coalesce((
      SELECT jsonb_agg(jsonb_build_object('floor', name, 'dirty', d, 'in_progress', ip, 'cleaned', c, 'inspected', i) ORDER BY so NULLS LAST, name)
        FROM (SELECT coalesce(f.name, '—') name, f.sort_order so,
                     count(*) FILTER (WHERE st IN ('dirty', 'dnd', 'refused', 'return_later')) d,
                     count(*) FILTER (WHERE st IN ('in_progress', 'paused')) ip,
                     count(*) FILTER (WHERE st = 'cleaned') c,
                     count(*) FILTER (WHERE st = 'inspected') i
                FROM (SELECT r.floor_id, public._room_state(r.house_keeping_status, r.paused_at, r.refuse_service_at, r.refuse_service_reason, r.return_later_at) st
                        FROM public.rooms r WHERE r.hotel_id = v_hotel AND r.active) rs
                LEFT JOIN public.floors f ON f.id = rs.floor_id
               GROUP BY f.id, f.name, f.sort_order) y), '[]'::jsonb),
    -- Today's arrivals by ETA hour (null when none given) and how many of their rooms are Inspected.
    'arrivals_by_eta', coalesce((
      SELECT jsonb_agg(jsonb_build_object('hour', h, 'arrivals', n, 'rooms_ready', ready) ORDER BY h NULLS LAST) FROM (
        SELECT extract(hour FROM s.eta)::int h, count(*) n, count(*) FILTER (WHERE r.house_keeping_status = 'Inspected') ready
          FROM public.reservations s JOIN public.rooms r ON r.id = s.room_id
         WHERE s.hotel_id = v_hotel AND s.arrival_date = v_day AND s.stay_status = 'confirmed'
         GROUP BY 1) z), '[]'::jsonb)
  );
END;
$$;

-- What needs someone's attention now, oldest first.
CREATE OR REPLACE FUNCTION public.attention_items(p_limit integer DEFAULT 50)
RETURNS TABLE (kind text, room_id uuid, room_number text, since timestamptz, detail text, owner_id uuid, owner_name text, ref_id uuid)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
  v_zone text := coalesce((SELECT timezone FROM public.hotels WHERE id = public.auth_hotel_id()), 'UTC');
  v_day_start timestamptz := (SELECT (public.hotel_service_day(h.id) + h.service_day_starts) AT TIME ZONE coalesce(h.timezone, 'UTC')
                                FROM public.hotels h WHERE h.id = public.auth_hotel_id());
BEGIN
  IF NOT public.auth_has_permission('rooms.read') THEN
    RAISE EXCEPTION 'You can''t see the rooms.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH owner AS (
    SELECT DISTINCT ON (ra.room_id) ra.room_id, ra.user_id, u.full_name
      FROM public.room_assignments ra JOIN public.users u ON u.id = ra.user_id
     WHERE ra.hotel_id = v_hotel AND ra.shift_id = public._hotel_current_shift(v_hotel)
     ORDER BY ra.room_id, ra.updated_at DESC NULLS LAST
  ), items AS (
    -- Cleaning past its credit.
    SELECT 'overdue'::text k, r.id rid, r.room_number rn,
           now() - make_interval(secs => public._room_cleaned_seconds(r.cleaning_elapsed_seconds, r.cleaning_started_at) - r.credit * 60) at_time,
           format('%s min over its %s min', (public._room_cleaned_seconds(r.cleaning_elapsed_seconds, r.cleaning_started_at) - r.credit * 60) / 60, r.credit) txt,
           NULL::uuid ref
      FROM public.rooms r
     WHERE r.hotel_id = v_hotel AND r.active AND r.house_keeping_status = 'InProgress' AND coalesce(r.credit, 0) > 0
       AND public._room_cleaned_seconds(r.cleaning_elapsed_seconds, r.cleaning_started_at) > r.credit * 60
    UNION ALL
    -- Promised within the hour (or already late) and not ready.
    SELECT 'promise_due', r.id, r.room_number, r.promise_time_at,
           format('Promised for %s', to_char(r.promise_time_at AT TIME ZONE v_zone, 'HH24:MI')), NULL
      FROM public.rooms r
     WHERE r.hotel_id = v_hotel AND r.active AND r.promise_time_at IS NOT NULL AND r.promise_time_at <= now() + interval '60 minutes'
       AND coalesce(r.house_keeping_status, 'Dirty') NOT IN ('Cleaned', 'Inspected')
    UNION ALL
    -- A DND sign due another look.
    SELECT 'dnd_recheck', r.id, r.room_number, r.dnd_next_check_at,
           format('DND since %s (%s %s)', to_char(r.dnd_at AT TIME ZONE v_zone, 'HH24:MI'), r.dnd_check_count,
                  CASE WHEN r.dnd_check_count = 1 THEN 'check' ELSE 'checks' END), NULL
      FROM public.rooms r
     WHERE r.hotel_id = v_hotel AND r.active AND r.dnd_at IS NOT NULL AND r.dnd_next_check_at <= now()
    UNION ALL
    -- The guest's "come back later" time has come.
    SELECT 'return_due', r.id, r.room_number, r.return_later_at,
           format('Guest asked for service at %s', to_char(r.return_later_at AT TIME ZONE v_zone, 'HH24:MI')), NULL
      FROM public.rooms r
     WHERE r.hotel_id = v_hotel AND r.active AND r.return_later_at IS NOT NULL AND r.return_later_at <= now()
    UNION ALL
    -- Sent back (or reopened) this service day and not clean again yet.
    (SELECT DISTINCT ON (r.id) 'sent_back', r.id, r.room_number, h.created_at, h.description, NULL::uuid
       FROM public.room_history h JOIN public.rooms r ON r.id = h.room_id
      WHERE h.hotel_id = v_hotel AND h.created_at >= v_day_start
        AND (h.description LIKE 'Sent the room back to Dirty%' OR h.description LIKE 'Reopened the room%')
        AND coalesce(r.house_keeping_status, 'Dirty') NOT IN ('Cleaned', 'Inspected')
      ORDER BY r.id, h.created_at DESC)
    UNION ALL
    -- Open urgent tickets.
    SELECT 'urgent_ticket', t.room_id, r.room_number, t.created_at, t.title, t.id
      FROM public.tickets t LEFT JOIN public.rooms r ON r.id = t.room_id
     WHERE t.hotel_id = v_hotel AND t.status <> 'done' AND t.priority = 'urgent'
  )
  SELECT i.k, i.rid, i.rn, i.at_time, i.txt,
         CASE WHEN i.k = 'urgent_ticket' THEN t.assigned_to_id ELSE o.user_id END,
         CASE WHEN i.k = 'urgent_ticket' THEN tu.full_name ELSE o.full_name END,
         i.ref
    FROM items i
    LEFT JOIN owner o ON o.room_id = i.rid
    LEFT JOIN public.tickets t ON t.id = i.ref
    LEFT JOIN public.users tu ON tu.id = t.assigned_to_id
   ORDER BY i.at_time ASC NULLS LAST
   LIMIT greatest(1, least(coalesce(p_limit, 50), 200));
END;
$$;

REVOKE ALL ON FUNCTION public._hotel_current_shift(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public._room_assignment_notice(uuid, uuid, uuid[], uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.assign_rooms(uuid[], uuid, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.room_board(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.dashboard_summary(date) FROM public, anon;
REVOKE ALL ON FUNCTION public.dashboard_series(date) FROM public, anon;
REVOKE ALL ON FUNCTION public.attention_items(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.assign_rooms(uuid[], uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.room_board(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_summary(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_series(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attention_items(integer) TO authenticated;
