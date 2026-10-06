-- Only holders of rooms.reassign may decide who a room is assigned to.
--
-- The app now withholds every Assign / Reassign control from room attendants
-- (who lack rooms.reassign), but that only removes the button. The
-- `room_assignments` RLS policy is tenant-scoped and nothing else, so any
-- signed-in user could still insert, delete or re-point an assignment through
-- the API.
--
-- A blanket policy on the permission would break the attendant's own work:
-- starting, pausing and finishing a room update their assignment row
-- (work_status, start_time, end_time, pause_reason). So this guards exactly
-- the assignment itself — creating one, removing one, or changing its user,
-- room or shift — and leaves the progress columns alone.
--
-- Service-role / server writes (no auth.uid()) are not affected.

CREATE OR REPLACE FUNCTION public._room_assignments_require_reassign()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL OR public.auth_has_permission('rooms.reassign') THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
     AND NEW.room_id IS NOT DISTINCT FROM OLD.room_id
     AND NEW.shift_id IS NOT DISTINCT FROM OLD.shift_id THEN
    RETURN NEW; -- progress on the attendant's own room, not a reassignment
  END IF;

  RAISE EXCEPTION 'You are not allowed to assign rooms' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS room_assignments_require_reassign ON public.room_assignments;
CREATE TRIGGER room_assignments_require_reassign
  BEFORE INSERT OR UPDATE OR DELETE ON public.room_assignments
  FOR EACH ROW EXECUTE FUNCTION public._room_assignments_require_reassign();
