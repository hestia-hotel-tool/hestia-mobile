-- A record of every flag, so "which rooms were flagged this month, and why"
-- has an answer.
--
-- `rooms.flagged` / `flag_reason` hold only the current state: once a room is
-- unflagged, or re-flagged with a new reason, the earlier flag is gone. This
-- trigger appends one `room_history` row per change instead:
--
--   event_type          when                                  description
--   room_flagged        flagged false -> true                 the reason
--   room_flag_updated   reason or mentions changed, still on  the new reason
--   room_unflagged      flagged true -> false                 the reason it had
--
-- `user_id` is whoever made the change; `attachments` carries the @mentioned
-- staff as [{"kind":"mention","user_id":…,"name":…}].
--
-- Only changes from now on are recorded — earlier flags were never stored.
-- The app's History tab reads `activity_logs`, not this table, so these rows
-- do not show up there twice.

CREATE OR REPLACE FUNCTION public._rooms_log_flag_history()
RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_was boolean := coalesce(OLD.flagged, false);
  v_is  boolean := coalesce(NEW.flagged, false);
  v_event text;
  v_reason text;
  v_mentions jsonb;
BEGIN
  IF v_is AND NOT v_was THEN
    v_event := 'room_flagged';
  ELSIF v_was AND NOT v_is THEN
    v_event := 'room_unflagged';
  ELSIF v_is AND (NEW.flag_reason IS DISTINCT FROM OLD.flag_reason
                  OR NEW.flag_mention_ids IS DISTINCT FROM OLD.flag_mention_ids) THEN
    v_event := 'room_flag_updated';
  ELSE
    RETURN NEW;
  END IF;

  v_reason := nullif(btrim(coalesce(
    CASE WHEN v_event = 'room_unflagged' THEN OLD.flag_reason ELSE NEW.flag_reason END, '')), '');

  SELECT coalesce(jsonb_agg(jsonb_build_object('kind', 'mention', 'user_id', u.id, 'name', u.full_name)), '[]'::jsonb)
    INTO v_mentions
    FROM public.users u
   WHERE v_event <> 'room_unflagged'
     AND u.id = ANY (coalesce(NEW.flag_mention_ids, '{}'::uuid[]));

  INSERT INTO public.room_history (room_id, hotel_id, user_id, event_type, description, attachments)
  VALUES (NEW.id, NEW.hotel_id, auth.uid(), v_event, v_reason, v_mentions);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rooms_log_flag_history ON public.rooms;
CREATE TRIGGER rooms_log_flag_history
  AFTER UPDATE OF flagged, flag_reason, flag_mention_ids ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public._rooms_log_flag_history();

CREATE INDEX IF NOT EXISTS idx_room_history_flag_events
  ON public.room_history (hotel_id, created_at DESC)
  WHERE event_type IN ('room_flagged', 'room_flag_updated', 'room_unflagged');
