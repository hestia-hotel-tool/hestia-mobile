-- Deleting chats (client request, 2026-10-26), and closing the policies that
-- made deleting anyone's chat possible.
--
-- Delete for me — the messaging-app standard:
--   direct chat  hides it from my list and clears my copy of the history
--                (chat_participants.cleared_at / hidden_at). The other person
--                keeps theirs. A new message brings the chat back, showing
--                only what came after.
--   group        I leave it (my participant row goes). The last one out
--                takes the chat with them; a group left without an admin
--                gets one.
-- Delete for everyone — groups only, by a group admin (or its creator).
--
-- Security: three permissive policies granted far more than their names say.
--   chats    "Hotel users can manage chats"     ALL, hotel only
--   messages "Hotel users can manage messages"  ALL, hotel only
--   chats    "Participants can delete chat"     any member, for everyone
-- Policies are OR'd, so the first two let any staff member read, edit or
-- delete every chat and message in the hotel — including conversations they
-- are not in. They are dropped; the participant-scoped policies that remain
-- were already the intended rules, and group-wide deletion goes through
-- chat_delete_for_everyone() instead.

BEGIN;

-- 1. Per-person state ---------------------------------------------------------
ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS cleared_at timestamptz,
  ADD COLUMN IF NOT EXISTS hidden_at  timestamptz;
COMMENT ON COLUMN public.chat_participants.cleared_at IS 'Messages up to this time are deleted for this person.';
COMMENT ON COLUMN public.chat_participants.hidden_at  IS 'Hidden from this person''s chat list until a new message arrives.';

-- 2. Close the over-broad policies ------------------------------------------------
DROP POLICY IF EXISTS "Hotel users can manage chats" ON public.chats;
DROP POLICY IF EXISTS "Hotel users can manage messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can delete chat" ON public.chats;

-- 3. Delete for me ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_delete_for_me(p_chat_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_chat public.chats%ROWTYPE;
  v_me   public.chat_participants%ROWTYPE;
  v_left int;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_chat FROM public.chats WHERE id = p_chat_id AND hotel_id = public.auth_hotel_id();
  SELECT * INTO v_me FROM public.chat_participants WHERE chat_id = p_chat_id AND user_id = v_uid;
  IF v_chat.id IS NULL OR v_me.id IS NULL THEN
    RAISE EXCEPTION 'Chat not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Its unread badges go with it.
  UPDATE public.notifications SET read_at = now()
   WHERE user_id = v_uid AND type = 'chat_message' AND read_at IS NULL
     AND data ->> 'chatId' = p_chat_id::text;

  IF v_chat.type = 'group' THEN
    DELETE FROM public.chat_participants WHERE id = v_me.id;
    SELECT count(*) INTO v_left FROM public.chat_participants WHERE chat_id = p_chat_id;
    IF v_left = 0 THEN
      DELETE FROM public.chats WHERE id = p_chat_id;
      RETURN 'deleted';
    END IF;
    -- Never leave a group with nobody to run it: the longest-standing member takes over.
    IF NOT EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = p_chat_id AND role = 'admin') THEN
      UPDATE public.chat_participants SET role = 'admin'
       WHERE id = (SELECT id FROM public.chat_participants WHERE chat_id = p_chat_id ORDER BY joined_at NULLS LAST, id LIMIT 1);
    END IF;
    RETURN 'left';
  END IF;

  UPDATE public.chat_participants SET cleared_at = now(), hidden_at = now() WHERE id = v_me.id;
  RETURN 'hidden';
END;
$$;
REVOKE ALL ON FUNCTION public.chat_delete_for_me(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chat_delete_for_me(uuid) TO authenticated;

-- 4. Delete for everyone (groups, admins) -------------------------------------------
CREATE OR REPLACE FUNCTION public.chat_delete_for_everyone(p_chat_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_chat public.chats%ROWTYPE;
BEGIN
  SELECT * INTO v_chat FROM public.chats WHERE id = p_chat_id AND hotel_id = public.auth_hotel_id();
  IF v_uid IS NULL OR v_chat.id IS NULL THEN
    RAISE EXCEPTION 'Chat not found.' USING ERRCODE = 'P0002';
  END IF;
  IF v_chat.type <> 'group' THEN
    RAISE EXCEPTION 'Only a group can be deleted for everyone.' USING ERRCODE = '22023';
  END IF;
  IF NOT (v_chat.created_by_id = v_uid OR EXISTS (
    SELECT 1 FROM public.chat_participants WHERE chat_id = p_chat_id AND user_id = v_uid AND role = 'admin'
  )) THEN
    RAISE EXCEPTION 'Only a group admin can delete it for everyone.' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.chats WHERE id = p_chat_id;
END;
$$;
REVOKE ALL ON FUNCTION public.chat_delete_for_everyone(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.chat_delete_for_everyone(uuid) TO authenticated;

-- 5. A new message brings a hidden chat back ----------------------------------------
CREATE OR REPLACE FUNCTION public._messages_unhide_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.chat_participants SET hidden_at = NULL
   WHERE chat_id = NEW.chat_id AND hidden_at IS NOT NULL;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS messages_unhide_chat ON public.messages;
CREATE TRIGGER messages_unhide_chat
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public._messages_unhide_chat();

COMMIT;
