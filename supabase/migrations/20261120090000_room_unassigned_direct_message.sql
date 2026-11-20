-- When a room is taken off someone, the person who did it also sends them a
-- short chat message (client, 2026-11-20: "When Stella unassigns a room, Mei
-- should not only receive a notification, but a short message saying that the
-- room is no longer assigned to her").
--
-- Hooked on the 'room_unassigned' notification itself rather than on each
-- path that takes a room away, so every such path sends it:
--   unassigned (room_assignments row deleted)  _room_assignments_unassigned_notify
--   reassigned before cleaning started         _room_assignments_transfer
-- Several rooms in one go are one notification, so one message.
--
-- The message is an ordinary direct message from the actor (auth.uid()) in
-- their one-to-one chat with the attendant, created if they have none. The
-- usual chat trigger (_messages_notify) then alerts the attendant like any
-- other message, and a chat they had hidden comes back (_messages_unhide_chat).
-- No signed-in actor (automatic release at shift end) or a notification to
-- oneself: no message.

BEGIN;

-- The one-to-one chat between two people in a hotel, created when missing.
CREATE OR REPLACE FUNCTION public._direct_chat_between(p_a uuid, p_b uuid, p_hotel_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_chat uuid;
BEGIN
  SELECT c.id INTO v_chat
    FROM public.chats c
   WHERE c.type = 'direct'
     AND c.hotel_id = p_hotel_id
     AND EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = c.id AND user_id = p_a)
     AND EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = c.id AND user_id = p_b)
     AND (SELECT count(*) FROM public.chat_participants WHERE chat_id = c.id) = 2
   ORDER BY c.created_at
   LIMIT 1;
  IF v_chat IS NOT NULL THEN
    RETURN v_chat;
  END IF;

  INSERT INTO public.chats (type, created_by_id, hotel_id)
  VALUES ('direct', p_a, p_hotel_id)
  RETURNING id INTO v_chat;
  INSERT INTO public.chat_participants (chat_id, user_id, hotel_id)
  VALUES (v_chat, p_a, p_hotel_id), (v_chat, p_b, p_hotel_id);
  RETURN v_chat;
END;
$$;
REVOKE ALL ON FUNCTION public._direct_chat_between(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._notifications_room_unassigned_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_room_ids uuid[];
  v_numbers text;
  v_n integer;
  v_chat uuid;
BEGIN
  IF v_actor IS NULL OR v_actor = NEW.user_id THEN
    RETURN NULL;
  END IF;

  v_room_ids := CASE
    WHEN NEW.data ? 'roomIds' THEN ARRAY(SELECT jsonb_array_elements_text(NEW.data->'roomIds'))::uuid[]
    WHEN NEW.data ? 'roomId' THEN ARRAY[(NEW.data->>'roomId')::uuid]
    ELSE ARRAY[]::uuid[]
  END;
  SELECT string_agg(r.room_number, ', ' ORDER BY r.room_number), count(*)
    INTO v_numbers, v_n
    FROM public.rooms r
   WHERE r.id = ANY (v_room_ids);
  IF coalesce(v_n, 0) = 0 THEN
    RETURN NULL;
  END IF;

  v_chat := public._direct_chat_between(v_actor, NEW.user_id, NEW.hotel_id);
  INSERT INTO public.messages (chat_id, sender_id, type, content, hotel_id)
  VALUES (
    v_chat, v_actor, 'text',
    CASE WHEN v_n = 1
      THEN format('Room %s is no longer assigned to you.', v_numbers)
      ELSE format('Rooms %s are no longer assigned to you.', v_numbers)
    END,
    NEW.hotel_id
  );
  RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public._notifications_room_unassigned_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notifications_room_unassigned_message ON public.notifications;
CREATE TRIGGER notifications_room_unassigned_message
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  WHEN (NEW.type = 'room_unassigned')
  EXECUTE FUNCTION public._notifications_room_unassigned_message();

COMMIT;
