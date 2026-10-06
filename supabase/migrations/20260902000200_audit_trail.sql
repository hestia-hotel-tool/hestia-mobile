-- Generic audit trail: one trigger function for every table.
--
-- Context
-- -------
-- activity_logs already existed, with four hand-written triggers (rooms,
-- tickets, room_notes, room_assignments) that all funnel through
-- _log_room_activity(). Those record a human-readable sentence but no before/
-- after state, and they always write table_name='rooms' with record_id set to
-- the ROOM — even for a ticket or a note — because the Room History screen
-- reads them as a room-scoped feed.
--
-- That is good for the feed and useless as an audit trail: you cannot answer
-- "what changed" or "who touched this guest record". This migration keeps the
-- readable sentence, adds the diff, records the true entity, and extends
-- coverage to every table that carries tenant data.
--
-- Design notes
-- ------------
-- * record_id/table_name now identify the row that actually changed. A new
--   room_id column carries the room correlation the feed needs, backfilled
--   from the existing rows so history survives.
-- * One function, not one per table. Per-table wording lives in _audit_label().
-- * SECURITY DEFINER with a pinned search_path, matching auth_hotel_id().
--   Without the pin, a caller-controlled schema can hijack the function.
-- * Logging never breaks the write it is observing: the whole body is wrapped
--   so an audit failure is a warning, not a failed room status change.
-- * NEW is unassigned during DELETE and OLD during INSERT, so everything goes
--   through to_jsonb() per TG_OP rather than coalesce(new.x, old.x), which
--   raises "record new is not assigned yet".

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Extend activity_logs
-- ---------------------------------------------------------------------------

ALTER TABLE public.activity_logs
  ADD COLUMN IF NOT EXISTS operation      text,
  ADD COLUMN IF NOT EXISTS old_data       jsonb,
  ADD COLUMN IF NOT EXISTS new_data       jsonb,
  ADD COLUMN IF NOT EXISTS changed_fields text[],
  ADD COLUMN IF NOT EXISTS room_id        uuid;

COMMENT ON COLUMN public.activity_logs.operation IS 'INSERT | UPDATE | DELETE for trigger rows; NULL for app-authored events.';
COMMENT ON COLUMN public.activity_logs.record_id IS 'Primary key of the row that changed.';
COMMENT ON COLUMN public.activity_logs.room_id IS 'Room this activity relates to, when any. Powers the Room History feed.';
COMMENT ON COLUMN public.activity_logs.changed_fields IS 'Columns that actually differed on UPDATE.';

-- Existing rows stored the room in record_id with table_name='rooms'. Move that
-- correlation into room_id so the feed keeps working after the semantics change.
UPDATE public.activity_logs
   SET room_id = record_id
 WHERE room_id IS NULL
   AND table_name = 'rooms'
   AND record_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_logs_room     ON public.activity_logs(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity   ON public.activity_logs(table_name, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_hotel    ON public.activity_logs(hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor    ON public.activity_logs(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Columns never worth recording
--
-- Noise (timestamps we already have) and secrets. Push tokens are credentials —
-- copying them into a table every hotel user can read would be a real leak.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._audit_strip(p_table text, j jsonb)
RETURNS jsonb
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN j IS NULL THEN NULL
    ELSE j - 'updated_at' - 'created_at'
           - CASE WHEN p_table = 'user_push_tokens' THEN 'expo_push_token' ELSE '' END
  END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Human-readable label
--
-- Preserves the wording the Room History screen already shows, so the feed
-- reads the same after the switch.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._audit_label(p_table text, p_op text, o jsonb, n jsonb)
RETURNS text
LANGUAGE plpgsql IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  title text;
BEGIN
  IF p_table = 'rooms' THEN
    IF p_op = 'INSERT' THEN RETURN 'Created room'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Deleted room'; END IF;
    IF n->>'house_keeping_status' IS DISTINCT FROM o->>'house_keeping_status' THEN
      RETURN 'Updated housekeeping status to ' || COALESCE(n->>'house_keeping_status', 'unknown');
    ELSIF n->>'flagged' IS DISTINCT FROM o->>'flagged' THEN
      RETURN CASE WHEN (n->>'flagged')::boolean THEN 'Flagged the room' ELSE 'Removed the room flag' END;
    ELSIF n->>'priority' IS DISTINCT FROM o->>'priority' THEN
      RETURN CASE WHEN n->>'priority' = 'high' THEN 'Marked the room as priority' ELSE 'Removed the priority mark' END;
    ELSIF n->>'return_later_at' IS DISTINCT FROM o->>'return_later_at' THEN
      RETURN 'Updated Return Later';
    END IF;
    RETURN 'Updated room';

  ELSIF p_table = 'tickets' THEN
    title := btrim(COALESCE(n->>'title', o->>'title', ''));
    IF p_op = 'INSERT' THEN
      RETURN CASE WHEN title <> '' THEN 'Created a ticket: ' || title ELSE 'Created a ticket' END;
    ELSIF p_op = 'DELETE' THEN
      RETURN CASE WHEN title <> '' THEN 'Deleted a ticket (' || title || ')' ELSE 'Deleted a ticket' END;
    END IF;
    IF n->>'status' IS DISTINCT FROM o->>'status' THEN
      title := 'Updated ticket status to ' || COALESCE(n->>'status', 'unknown')
               || CASE WHEN title <> '' THEN ' (' || title || ')' ELSE '' END;
    ELSIF n->>'due_at' IS DISTINCT FROM o->>'due_at' THEN
      title := 'Updated ticket due time' || CASE WHEN title <> '' THEN ' (' || title || ')' ELSE '' END;
    ELSIF n->>'assigned_to_id' IS DISTINCT FROM o->>'assigned_to_id' THEN
      title := 'Updated ticket assignee' || CASE WHEN title <> '' THEN ' (' || title || ')' ELSE '' END;
    ELSIF n->>'priority' IS DISTINCT FROM o->>'priority' THEN
      title := 'Updated ticket priority' || CASE WHEN title <> '' THEN ' (' || title || ')' ELSE '' END;
    ELSE
      title := 'Updated a ticket' || CASE WHEN title <> '' THEN ' (' || title || ')' ELSE '' END;
    END IF;
    RETURN title;

  ELSIF p_table = 'room_notes' THEN
    IF p_op = 'INSERT' THEN
      title := public._hestia_snippet(n->>'text', 80);
      RETURN CASE WHEN btrim(COALESCE(title, '')) <> ''
                  THEN 'Added a note: “' || title || '”' ELSE 'Added a note' END;
    ELSIF p_op = 'DELETE' THEN RETURN 'Deleted a note';
    END IF;
    RETURN 'Updated a note';

  ELSIF p_table = 'room_assignments' THEN
    IF p_op = 'INSERT' THEN RETURN 'Assigned the room'; END IF;
    IF p_op = 'DELETE' THEN RETURN 'Removed room assignment'; END IF;
    IF n->>'work_status' IS DISTINCT FROM o->>'work_status' THEN
      RETURN 'Updated room work status';
    END IF;
    RETURN 'Updated room assignment';

  ELSIF p_table = 'users' THEN
    IF n->>'job_title_id' IS DISTINCT FROM o->>'job_title_id' THEN
      RETURN 'Changed job title';
    END IF;
  END IF;

  -- Generic fallback: "Created a guest", "Updated a reservation", ...
  RETURN CASE p_op
    WHEN 'INSERT' THEN 'Created a '
    WHEN 'DELETE' THEN 'Deleted a '
    ELSE 'Updated a '
  END || replace(rtrim(p_table, 's'), '_', ' ');
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. The trigger function
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.audit_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o jsonb;
  n jsonb;
  changed text[];
  h_id uuid;
  rec_id uuid;
  rm_id uuid;
BEGIN
  BEGIN
    IF TG_OP = 'INSERT' THEN
      o := NULL;                        n := public._audit_strip(TG_TABLE_NAME, to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
      o := public._audit_strip(TG_TABLE_NAME, to_jsonb(OLD)); n := NULL;
    ELSE
      o := public._audit_strip(TG_TABLE_NAME, to_jsonb(OLD));
      n := public._audit_strip(TG_TABLE_NAME, to_jsonb(NEW));

      -- Which columns actually differ. An UPDATE that changed nothing but
      -- updated_at is not worth a row.
      SELECT array_agg(key ORDER BY key) INTO changed
      FROM jsonb_each(n)
      WHERE n -> key IS DISTINCT FROM o -> key;

      IF changed IS NULL OR array_length(changed, 1) IS NULL THEN
        RETURN NULL;
      END IF;
    END IF;

    h_id   := COALESCE(n->>'hotel_id', o->>'hotel_id')::uuid;
    rec_id := COALESCE(n->>'id', o->>'id')::uuid;

    -- Room correlation: the room itself, or the row's room_id.
    rm_id := CASE
      WHEN TG_TABLE_NAME = 'rooms' THEN rec_id
      ELSE COALESCE(n->>'room_id', o->>'room_id')::uuid
    END;

    -- hotel_id is NOT NULL. Fall back to the actor's hotel; if there is still
    -- none (a service-role script on a table without hotel_id) skip the row
    -- rather than abort the write.
    IF h_id IS NULL THEN
      h_id := public.auth_hotel_id();
    END IF;
    IF h_id IS NULL THEN
      RETURN NULL;
    END IF;

    INSERT INTO public.activity_logs (
      hotel_id, user_id, table_name, operation, action,
      record_id, room_id, old_data, new_data, changed_fields
    )
    VALUES (
      h_id,
      auth.uid(),
      TG_TABLE_NAME,
      TG_OP,
      public._audit_label(TG_TABLE_NAME, TG_OP, o, n),
      rec_id,
      rm_id,
      o,
      n,
      changed
    );

  EXCEPTION WHEN OTHERS THEN
    -- Auditing must never break the operation it is recording.
    RAISE WARNING '[audit_changes] % on % failed: %', TG_OP, TG_TABLE_NAME, SQLERRM;
  END;

  RETURN NULL; -- AFTER trigger; return value is ignored
END;
$$;

ALTER FUNCTION public.audit_changes()                                OWNER TO postgres;
ALTER FUNCTION public._audit_label(text, text, jsonb, jsonb)         OWNER TO postgres;
ALTER FUNCTION public._audit_strip(text, jsonb)                      OWNER TO postgres;

COMMENT ON FUNCTION public.audit_changes() IS
  'Generic audit trigger. Attach AFTER INSERT OR UPDATE OR DELETE FOR EACH ROW.';

-- ---------------------------------------------------------------------------
-- 5. Attach
--
-- Replaces the four hand-written triggers — the wording they produced now comes
-- from _audit_label(), so the Room History feed is unchanged while every row
-- also gains its diff.
--
-- Deliberately NOT audited:
--   messages / chats / chat_participants — high volume, and message bodies are
--     already the record; copying them doubles the PII surface.
--   notifications, user_push_tokens      — derived data and credentials.
--   activity_logs                        — would recurse.
--   roles / permissions / job_titles     — global reference data, seeded by
--                                          migration, no hotel_id.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS rooms_activity_logs_trg            ON public.rooms;
DROP TRIGGER IF EXISTS tickets_activity_logs_trg          ON public.tickets;
DROP TRIGGER IF EXISTS room_notes_activity_logs_trg       ON public.room_notes;
DROP TRIGGER IF EXISTS room_assignments_activity_logs_trg ON public.room_assignments;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'rooms', 'tickets', 'room_notes', 'room_assignments',
    'guests', 'reservations', 'reservation_guests',
    'lost_and_found_items', 'consumptions', 'consumables',
    'shifts', 'ticket_tags', 'users'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_audit_trg', t);
    EXECUTE format(
      'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.audit_changes()',
      t || '_audit_trg', t
    );
  END LOOP;
END $$;

-- The old per-table functions are now unreferenced.
DROP FUNCTION IF EXISTS public._rooms_activity_logs_trg();
DROP FUNCTION IF EXISTS public._tickets_activity_logs_trg();
DROP FUNCTION IF EXISTS public._room_notes_activity_logs_trg();
DROP FUNCTION IF EXISTS public._room_assignments_activity_logs_trg();

-- _log_room_activity() stays: the app still calls it indirectly for semantic
-- events that no table change represents (see logRoomHistoryEvent).

COMMIT;
