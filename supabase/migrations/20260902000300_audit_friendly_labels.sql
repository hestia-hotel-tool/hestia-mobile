-- Human-readable wording for every audited action.
--
-- The first cut of _audit_label() only had real sentences for the four tables
-- that previously had hand-written triggers. Everything else fell through to a
-- generic "Updated a " || rtrim(table,'s'), which produced things nobody wants
-- to read in an activity feed: "Updated a consumption", "Updated a user",
-- "Created a reservation guest".
--
-- Now every table gets wording written for a person, and the label resolves
-- names rather than showing ids: "Assigned the room to Zoe Cakeri",
-- "Charged 2 x Coca-Cola to the room", "Changed Brian Osei's job title to
-- IT Manager".
--
-- The function becomes STABLE rather than IMMUTABLE because it now reads
-- lookup rows. That is one indexed primary-key lookup per audited write, on
-- tables that are not hot. Names for the audited row itself always come from
-- the jsonb payload, never a lookup -- on DELETE the row is already gone by the
-- time this AFTER trigger runs.

BEGIN;

-- ---------------------------------------------------------------------------
-- Lookup helpers. All return a sensible fallback so a label is never blank.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._audit_pretty(v text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  -- 'in_progress' -> 'In Progress'
  SELECT CASE WHEN v IS NULL OR btrim(v) = '' THEN NULL
              ELSE initcap(replace(btrim(v), '_', ' ')) END;
$$;

CREATE OR REPLACE FUNCTION public._audit_user_name(p_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(NULLIF(btrim(u.full_name), ''), 'someone')
  FROM public.users u WHERE u.id = p_id;
$$;

CREATE OR REPLACE FUNCTION public._audit_room_label(p_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT 'Room ' || r.room_number FROM public.rooms r WHERE r.id = p_id;
$$;

CREATE OR REPLACE FUNCTION public._audit_guest_name(p_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(NULLIF(btrim(g.full_name), ''), 'a guest')
  FROM public.guests g WHERE g.id = p_id;
$$;

CREATE OR REPLACE FUNCTION public._audit_consumable_name(p_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(NULLIF(btrim(c.name), ''), 'an item')
  FROM public.consumables c WHERE c.id = p_id;
$$;

CREATE OR REPLACE FUNCTION public._audit_job_title_name(p_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT jt.name FROM public.job_titles jt WHERE jt.id = p_id;
$$;

CREATE OR REPLACE FUNCTION public._audit_department_name(p_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT d.name FROM public.departments d WHERE d.id = p_id;
$$;

-- ---------------------------------------------------------------------------
-- The label
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._audit_label(p_table text, p_op text, o jsonb, n jsonb)
RETURNS text
LANGUAGE plpgsql STABLE
SET search_path TO 'public'
AS $$
DECLARE
  name  text;   -- the audited row's own display name, from the payload
  who   text;
  extra text;
BEGIN
  ---------------------------------------------------------------- rooms ------
  -- Room History is already room-scoped, so wording stays room-relative and
  -- does not repeat the room number on every line.
  IF p_table = 'rooms' THEN
    IF p_op = 'INSERT' THEN RETURN 'Added the room'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Removed the room'; END IF;
    IF n->>'house_keeping_status' IS DISTINCT FROM o->>'house_keeping_status' THEN
      RETURN 'Marked the room as ' ||
             COALESCE(public._audit_pretty(n->>'house_keeping_status'), 'unknown');
    ELSIF n->>'flagged' IS DISTINCT FROM o->>'flagged' THEN
      RETURN CASE WHEN (n->>'flagged')::boolean THEN 'Flagged the room' ELSE 'Removed the flag' END;
    ELSIF n->>'priority' IS DISTINCT FROM o->>'priority' THEN
      RETURN CASE WHEN n->>'priority' = 'high' THEN 'Marked the room as priority'
                  ELSE 'Removed the priority' END;
    ELSIF n->>'return_later_at' IS DISTINCT FROM o->>'return_later_at' THEN
      RETURN CASE WHEN n->>'return_later_at' IS NULL THEN 'Cleared return later'
                  ELSE 'Set the room to return later' END;
    END IF;
    RETURN 'Updated the room';

  -------------------------------------------------------------- tickets ------
  ELSIF p_table = 'tickets' THEN
    name := NULLIF(btrim(COALESCE(n->>'title', o->>'title', '')), '');
    extra := CASE WHEN name IS NOT NULL THEN ' "' || name || '"' ELSE '' END;

    IF p_op = 'INSERT' THEN
      RETURN 'Raised a ticket' || COALESCE(': ' || name, '');
    ELSIF p_op = 'DELETE' THEN
      RETURN 'Deleted the ticket' || extra;
    END IF;

    IF n->>'status' IS DISTINCT FROM o->>'status' THEN
      RETURN 'Marked ticket' || extra || ' as ' ||
             COALESCE(public._audit_pretty(n->>'status'), 'unknown');
    ELSIF n->>'assigned_to_id' IS DISTINCT FROM o->>'assigned_to_id' THEN
      RETURN CASE
        WHEN n->>'assigned_to_id' IS NULL THEN 'Unassigned ticket' || extra
        ELSE 'Assigned ticket' || extra || ' to ' ||
             public._audit_user_name((n->>'assigned_to_id')::uuid)
      END;
    ELSIF n->>'due_at' IS DISTINCT FROM o->>'due_at' THEN
      RETURN 'Changed the due time on ticket' || extra;
    ELSIF n->>'priority' IS DISTINCT FROM o->>'priority' THEN
      RETURN 'Set ticket' || extra || ' priority to ' ||
             COALESCE(public._audit_pretty(n->>'priority'), 'normal');
    END IF;
    RETURN 'Updated ticket' || extra;

  ----------------------------------------------------------- room_notes ------
  ELSIF p_table = 'room_notes' THEN
    IF p_op = 'INSERT' THEN
      name := public._hestia_snippet(n->>'text', 80);
      RETURN CASE WHEN NULLIF(btrim(COALESCE(name, '')), '') IS NOT NULL
                  THEN 'Added a note: “' || name || '”' ELSE 'Added a note' END;
    ELSIF p_op = 'DELETE' THEN RETURN 'Deleted a note';
    END IF;
    RETURN 'Edited a note';

  ---------------------------------------------------- room_assignments ------
  ELSIF p_table = 'room_assignments' THEN
    IF p_op = 'INSERT' THEN
      RETURN 'Assigned the room to ' || public._audit_user_name((n->>'user_id')::uuid);
    ELSIF p_op = 'DELETE' THEN
      RETURN 'Unassigned ' || public._audit_user_name((o->>'user_id')::uuid) || ' from the room';
    END IF;
    IF n->>'user_id' IS DISTINCT FROM o->>'user_id' THEN
      RETURN 'Reassigned the room to ' || public._audit_user_name((n->>'user_id')::uuid);
    ELSIF n->>'work_status' IS DISTINCT FROM o->>'work_status' THEN
      RETURN 'Marked the room as ' ||
             COALESCE(public._audit_pretty(n->>'work_status'), 'updated');
    ELSIF n->>'refuse_reason' IS DISTINCT FROM o->>'refuse_reason'
          AND n->>'refuse_reason' IS NOT NULL THEN
      RETURN 'Recorded a refused service: ' || (n->>'refuse_reason');
    ELSIF n->>'pause_reason' IS DISTINCT FROM o->>'pause_reason'
          AND n->>'pause_reason' IS NOT NULL THEN
      RETURN 'Paused cleaning: ' || (n->>'pause_reason');
    END IF;
    RETURN 'Updated the room assignment';

  --------------------------------------------------------------- guests ------
  ELSIF p_table = 'guests' THEN
    name := COALESCE(NULLIF(btrim(COALESCE(n->>'full_name', o->>'full_name', '')), ''), 'a guest');
    IF p_op = 'INSERT' THEN RETURN 'Added guest ' || name; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Removed guest ' || name; END IF;
    IF n->>'image_url' IS DISTINCT FROM o->>'image_url' THEN
      RETURN 'Updated the photo for ' || name;
    ELSIF n->>'vip_code' IS DISTINCT FROM o->>'vip_code' THEN
      RETURN 'Changed the VIP status for ' || name;
    ELSIF n->>'primary_email' IS DISTINCT FROM o->>'primary_email'
       OR n->>'address' IS DISTINCT FROM o->>'address'
       OR n->>'company' IS DISTINCT FROM o->>'company' THEN
      RETURN 'Updated contact details for ' || name;
    ELSIF n->>'full_name' IS DISTINCT FROM o->>'full_name' THEN
      RETURN 'Renamed guest ' || COALESCE(o->>'full_name', 'a guest') || ' to ' || name;
    END IF;
    RETURN 'Updated guest ' || name;

  --------------------------------------------------------- reservations ------
  ELSIF p_table = 'reservations' THEN
    IF p_op = 'INSERT' THEN RETURN 'Created a reservation'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Removed a reservation'; END IF;
    IF n->>'front_office_status' IS DISTINCT FROM o->>'front_office_status' THEN
      RETURN 'Set the front office status to ' ||
             COALESCE(public._audit_pretty(n->>'front_office_status'), 'unknown');
    ELSIF n->>'reservation_status' IS DISTINCT FROM o->>'reservation_status' THEN
      RETURN 'Set the reservation status to ' ||
             COALESCE(public._audit_pretty(n->>'reservation_status'), 'unknown');
    ELSIF n->>'room_id' IS DISTINCT FROM o->>'room_id' THEN
      RETURN 'Moved the reservation to ' ||
             COALESCE(public._audit_room_label((n->>'room_id')::uuid), 'another room');
    ELSIF n->>'arrival_date' IS DISTINCT FROM o->>'arrival_date'
       OR n->>'departure_date' IS DISTINCT FROM o->>'departure_date' THEN
      RETURN 'Changed the reservation dates';
    ELSIF n->>'eta' IS DISTINCT FROM o->>'eta' THEN
      RETURN 'Updated the guest arrival time';
    ELSIF n->>'promised_time' IS DISTINCT FROM o->>'promised_time' THEN
      RETURN 'Updated the promised time';
    ELSIF n->>'adults' IS DISTINCT FROM o->>'adults'
       OR n->>'kids' IS DISTINCT FROM o->>'kids' THEN
      RETURN 'Changed the number of guests';
    END IF;
    RETURN 'Updated the reservation';

  --------------------------------------------------- reservation_guests ------
  ELSIF p_table = 'reservation_guests' THEN
    name := public._audit_guest_name(COALESCE(n->>'guest_id', o->>'guest_id')::uuid);
    IF p_op = 'INSERT' THEN RETURN 'Added ' || name || ' to the reservation'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Removed ' || name || ' from the reservation'; END IF;
    RETURN 'Updated ' || name || ' on the reservation';

  ------------------------------------------------- lost_and_found_items ------
  ELSIF p_table = 'lost_and_found_items' THEN
    name := COALESCE(NULLIF(btrim(COALESCE(n->>'item_name', o->>'item_name', '')), ''), 'an item');
    IF p_op = 'INSERT' THEN RETURN 'Registered a found item: ' || name; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Deleted the lost & found entry for ' || name; END IF;
    IF n->>'status' IS DISTINCT FROM o->>'status' THEN
      RETURN 'Marked ' || name || ' as ' ||
             COALESCE(public._audit_pretty(n->>'status'), 'updated');
    ELSIF n->>'shipped_location' IS DISTINCT FROM o->>'shipped_location'
          AND n->>'shipped_location' IS NOT NULL THEN
      RETURN 'Shipped ' || name || ' to ' || (n->>'shipped_location');
    ELSIF n->>'storage_location' IS DISTINCT FROM o->>'storage_location' THEN
      RETURN 'Moved ' || name || ' to ' ||
             COALESCE(n->>'storage_location', 'a new location');
    END IF;
    RETURN 'Updated the lost & found entry for ' || name;

  --------------------------------------------------------- consumptions ------
  ELSIF p_table = 'consumptions' THEN
    name := public._audit_consumable_name(COALESCE(n->>'consumable_id', o->>'consumable_id')::uuid);
    IF p_op = 'INSERT' THEN
      RETURN 'Charged ' || COALESCE(n->>'quantity', '1') || ' x ' || name || ' to the room';
    ELSIF p_op = 'DELETE' THEN
      RETURN 'Removed the charge for ' || name;
    END IF;
    IF n->>'status' IS DISTINCT FROM o->>'status' THEN
      RETURN 'Marked the ' || name || ' charge as ' ||
             COALESCE(public._audit_pretty(n->>'status'), 'updated');
    ELSIF n->>'quantity' IS DISTINCT FROM o->>'quantity' THEN
      RETURN 'Changed the ' || name || ' quantity to ' || COALESCE(n->>'quantity', '0');
    END IF;
    RETURN 'Updated the charge for ' || name;

  ---------------------------------------------------------- consumables ------
  ELSIF p_table = 'consumables' THEN
    name := COALESCE(NULLIF(btrim(COALESCE(n->>'name', o->>'name', '')), ''), 'an item');
    IF p_op = 'INSERT' THEN RETURN 'Added ' || name || ' to the minibar list'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Removed ' || name || ' from the minibar list'; END IF;
    IF n->>'unit_price' IS DISTINCT FROM o->>'unit_price' THEN
      RETURN 'Changed the price of ' || name;
    ELSIF n->>'billable' IS DISTINCT FROM o->>'billable' THEN
      RETURN CASE WHEN (n->>'billable')::boolean
                  THEN 'Made ' || name || ' billable'
                  ELSE 'Made ' || name || ' non-billable' END;
    END IF;
    RETURN 'Updated ' || name;

  --------------------------------------------------------------- shifts ------
  ELSIF p_table = 'shifts' THEN
    name := COALESCE(NULLIF(btrim(COALESCE(n->>'name', o->>'name', '')), ''), 'a');
    IF p_op = 'INSERT' THEN RETURN 'Created the ' || name || ' shift'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Deleted the ' || name || ' shift'; END IF;
    IF n->>'start_time' IS DISTINCT FROM o->>'start_time'
       OR n->>'end_time' IS DISTINCT FROM o->>'end_time' THEN
      RETURN 'Changed the hours for the ' || name || ' shift';
    END IF;
    RETURN 'Updated the ' || name || ' shift';

  ---------------------------------------------------------- ticket_tags ------
  ELSIF p_table = 'ticket_tags' THEN
    who := public._audit_user_name(COALESCE(n->>'tagged_user_id', o->>'tagged_user_id')::uuid);
    IF p_op = 'INSERT' THEN RETURN 'Tagged ' || who || ' on a ticket'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Removed ' || who || ' from a ticket'; END IF;
    RETURN 'Updated a ticket tag for ' || who;

  ---------------------------------------------------------------- users ------
  ELSIF p_table = 'users' THEN
    name := COALESCE(NULLIF(btrim(COALESCE(n->>'full_name', o->>'full_name', '')), ''), 'a team member');
    IF p_op = 'INSERT' THEN RETURN 'Added ' || name || ' to the team'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Removed ' || name || ' from the team'; END IF;
    IF n->>'job_title_id' IS DISTINCT FROM o->>'job_title_id' THEN
      RETURN 'Changed the job title for ' || name || ' to ' ||
             COALESCE(public._audit_job_title_name((n->>'job_title_id')::uuid), 'none');
    ELSIF n->>'department_id' IS DISTINCT FROM o->>'department_id' THEN
      RETURN 'Moved ' || name || ' to ' ||
             COALESCE(public._audit_department_name((n->>'department_id')::uuid), 'another department');
    ELSIF n->>'hotel_id' IS DISTINCT FROM o->>'hotel_id' THEN
      RETURN 'Moved ' || name || ' to another hotel';
    ELSIF n->>'avatar_url' IS DISTINCT FROM o->>'avatar_url' THEN
      RETURN 'Updated the photo for ' || name;
    ELSIF n->>'full_name' IS DISTINCT FROM o->>'full_name' THEN
      RETURN 'Renamed ' || COALESCE(o->>'full_name', 'a team member') || ' to ' || name;
    END IF;
    RETURN 'Updated the profile for ' || name;
  END IF;

  ------------------------------------------------------------- fallback ------
  -- Reached only if a table is audited without wording added above. Kept
  -- readable rather than clever; add a branch instead of relying on this.
  RETURN CASE p_op
    WHEN 'INSERT' THEN 'Created a record in '
    WHEN 'DELETE' THEN 'Deleted a record in '
    ELSE 'Updated a record in '
  END || replace(p_table, '_', ' ');
END;
$$;

ALTER FUNCTION public._audit_label(text, text, jsonb, jsonb) OWNER TO postgres;

COMMENT ON FUNCTION public._audit_label(text, text, jsonb, jsonb) IS
  'Human-readable sentence for an audited change. One branch per audited table.';

COMMIT;
