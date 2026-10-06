-- Fix infinite recursion: policies must not query the same table (or cycle) through RLS.
-- Use SECURITY DEFINER functions that read chat_participants without RLS.
--
-- REQUIRED for: chat list loading, opening direct/group chats, and viewing message history.
-- Without this migration, message load can fail (recursion or permission) and previous chats show empty.
--
-- Access model (WhatsApp-style):
-- - Chats: only participants (and creator for INSERT...RETURNING) can see/update/delete.
-- - Chat participants: only see rows for chats you are in; can add self or add others when already in chat.
-- - Messages: only participants can read/send/update/delete own.

-- Returns chat_ids where current user is a participant (for chat_participants SELECT policy).
CREATE OR REPLACE FUNCTION public.auth_user_chat_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid();
$$;

COMMENT ON FUNCTION public.auth_user_chat_ids() IS 'Returns chat_ids where current user is a participant; used by RLS to avoid self-reference recursion.';

-- Returns true if current user is a participant in the given chat (for chats/messages policies).
CREATE OR REPLACE FUNCTION public.auth_user_is_participant_in_chat(p_chat_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = p_chat_id AND user_id = auth.uid());
$$;

COMMENT ON FUNCTION public.auth_user_is_participant_in_chat(uuid) IS 'True if current user is in chat; used by RLS on chats/messages to avoid recursion.';

-- Chat participants: SELECT without self-reference
DROP POLICY IF EXISTS "Users can view participants of their chats" ON chat_participants;
CREATE POLICY "Users can view participants of their chats" ON chat_participants
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR chat_id IN (SELECT public.auth_user_chat_ids())
  );

-- Chats: SELECT/UPDATE/DELETE using definer function so we never read chat_participants through RLS here
DROP POLICY IF EXISTS "Users can view chats they participate in or created" ON chats;
CREATE POLICY "Users can view chats they participate in or created" ON chats
  FOR SELECT TO authenticated
  USING (
    created_by_id = auth.uid()
    OR public.auth_user_is_participant_in_chat(id)
  );

DROP POLICY IF EXISTS "Participants can update chat" ON chats;
CREATE POLICY "Participants can update chat" ON chats
  FOR UPDATE TO authenticated
  USING (public.auth_user_is_participant_in_chat(id))
  WITH CHECK (public.auth_user_is_participant_in_chat(id));

DROP POLICY IF EXISTS "Participants can delete chat" ON chats;
CREATE POLICY "Participants can delete chat" ON chats
  FOR DELETE TO authenticated
  USING (public.auth_user_is_participant_in_chat(id));

-- Messages: use same helper so we never read chat_participants through RLS
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
CREATE POLICY "Participants can view messages" ON messages
  FOR SELECT TO authenticated
  USING (public.auth_user_is_participant_in_chat(chat_id));

DROP POLICY IF EXISTS "Participants can insert messages" ON messages;
CREATE POLICY "Participants can insert messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.auth_user_is_participant_in_chat(chat_id)
  );

DROP POLICY IF EXISTS "Participants can update own messages" ON messages;
CREATE POLICY "Participants can update own messages" ON messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() AND public.auth_user_is_participant_in_chat(chat_id))
  WITH CHECK (sender_id = auth.uid() AND public.auth_user_is_participant_in_chat(chat_id));

DROP POLICY IF EXISTS "Participants can delete own messages" ON messages;
CREATE POLICY "Participants can delete own messages" ON messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid() AND public.auth_user_is_participant_in_chat(chat_id));
