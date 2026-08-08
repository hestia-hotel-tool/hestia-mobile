-- Triggers to populate activity_logs for any create/update/delete
-- Everything is logged against the associated room:
--   table_name = 'rooms'
--   record_id  = <room_id>

CREATE OR REPLACE FUNCTION public._hestia_snippet(txt text, max_len int DEFAULT 80)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE
      WHEN txt IS NULL THEN ''
      WHEN length(btrim(regexp_replace(txt, '\s+', ' ', 'g'))) <= max_len
        THEN btrim(regexp_replace(txt, '\s+', ' ', 'g'))
      ELSE left(btrim(regexp_replace(txt, '\s+', ' ', 'g')), GREATEST(max_len - 1, 0)) || '…'
    END;
$$;

CREATE OR REPLACE FUNCTION public._log_room_activity(room_id uuid, action text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF room_id IS NULL OR action IS NULL OR btrim(action) = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.activity_logs (user_id, action, table_name, record_id, created_at)
  VALUES (auth.uid(), action, 'rooms', room_id, now());
END;
$$;

-- -----------------------
-- tickets (direct -> room)
-- -----------------------
CREATE OR REPLACE FUNCTION public._tickets_activity_logs_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  rid uuid;
  ttitle text;
  action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    rid := NEW.room_id;
    ttitle := COALESCE(NEW.title, '');
    action := CASE
      WHEN btrim(ttitle) <> '' THEN 'Created a ticket: ' || btrim(ttitle)
      ELSE 'Created a ticket'
    END;
    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    rid := COALESCE(NEW.room_id, OLD.room_id);
    ttitle := COALESCE(NEW.title, OLD.title, '');

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      action := 'Updated ticket status to ' || COALESCE(NEW.status, 'unknown');
    ELSIF NEW.due_at IS DISTINCT FROM OLD.due_at THEN
      action := 'Updated ticket due time';
    ELSIF NEW.assigned_to_id IS DISTINCT FROM OLD.assigned_to_id THEN
      action := 'Updated ticket assignee';
    ELSIF NEW.priority IS DISTINCT FROM OLD.priority THEN
      action := 'Updated ticket priority';
    ELSE
      action := 'Updated a ticket';
    END IF;

    IF btrim(ttitle) <> '' THEN
      action := action || ' (' || btrim(ttitle) || ')';
    END IF;

    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    rid := OLD.room_id;
    ttitle := COALESCE(OLD.title, '');
    action := CASE
      WHEN btrim(ttitle) <> '' THEN 'Deleted a ticket (' || btrim(ttitle) || ')'
      ELSE 'Deleted a ticket'
    END;
    PERFORM public._log_room_activity(rid, action);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS tickets_activity_logs_trg ON public.tickets;
CREATE TRIGGER tickets_activity_logs_trg
AFTER INSERT OR UPDATE OR DELETE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public._tickets_activity_logs_trg();

-- -------------------------
-- room_notes (direct -> room)
-- -------------------------
CREATE OR REPLACE FUNCTION public._room_notes_activity_logs_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  rid uuid;
  action text;
  txt text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    rid := NEW.room_id;
    txt := public._hestia_snippet(NEW.text, 80);
    action := CASE
      WHEN btrim(txt) <> '' THEN 'Added a note: “' || txt || '”'
      ELSE 'Added a note'
    END;
    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    rid := COALESCE(NEW.room_id, OLD.room_id);
    action := 'Updated a note';
    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    rid := OLD.room_id;
    action := 'Deleted a note';
    PERFORM public._log_room_activity(rid, action);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS room_notes_activity_logs_trg ON public.room_notes;
CREATE TRIGGER room_notes_activity_logs_trg
AFTER INSERT OR UPDATE OR DELETE ON public.room_notes
FOR EACH ROW EXECUTE FUNCTION public._room_notes_activity_logs_trg();

-- ----------------------------
-- room_assignments (direct -> room)
-- ----------------------------
CREATE OR REPLACE FUNCTION public._room_assignments_activity_logs_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  rid uuid;
  action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    rid := NEW.room_id;
    action := 'Assigned the room';
    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    rid := COALESCE(NEW.room_id, OLD.room_id);
    IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      action := 'Updated room assignment';
    ELSIF NEW.work_status IS DISTINCT FROM OLD.work_status THEN
      action := 'Updated room work status';
    ELSE
      action := 'Updated room assignment';
    END IF;
    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    rid := OLD.room_id;
    action := 'Removed room assignment';
    PERFORM public._log_room_activity(rid, action);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS room_assignments_activity_logs_trg ON public.room_assignments;
CREATE TRIGGER room_assignments_activity_logs_trg
AFTER INSERT OR UPDATE OR DELETE ON public.room_assignments
FOR EACH ROW EXECUTE FUNCTION public._room_assignments_activity_logs_trg();

-- -------------
-- rooms (direct)
-- -------------
CREATE OR REPLACE FUNCTION public._rooms_activity_logs_trg()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  rid uuid;
  action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    rid := NEW.id;
    action := 'Created room';
    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    rid := NEW.id;
    IF NEW.house_keeping_status IS DISTINCT FROM OLD.house_keeping_status THEN
      action := 'Updated housekeeping status to ' || COALESCE(NEW.house_keeping_status, 'unknown');
    ELSIF NEW.flagged IS DISTINCT FROM OLD.flagged THEN
      action := CASE WHEN NEW.flagged THEN 'Flagged the room' ELSE 'Removed the room flag' END;
    ELSIF NEW.priority IS DISTINCT FROM OLD.priority THEN
      action := CASE WHEN NEW.priority = 'high' THEN 'Marked the room as priority' ELSE 'Removed the priority mark' END;
    ELSIF NEW.return_later_at IS DISTINCT FROM OLD.return_later_at THEN
      action := 'Updated Return Later';
    ELSE
      action := 'Updated room';
    END IF;
    PERFORM public._log_room_activity(rid, action);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    rid := OLD.id;
    action := 'Deleted room';
    PERFORM public._log_room_activity(rid, action);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS rooms_activity_logs_trg ON public.rooms;
CREATE TRIGGER rooms_activity_logs_trg
AFTER INSERT OR UPDATE OR DELETE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public._rooms_activity_logs_trg();

