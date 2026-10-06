-- WhatsApp-style access: only participants see chats and messages.
-- - Direct chats: only the two participants see the chat and messages.
-- - Group chats: only members see the group, its participants, and messages.
-- - You can only add participants to a chat you are already in (or add yourself when creating).

-- Restrict chat_participants INSERT: add yourself (create/join) or add others only if you're in the chat
DROP POLICY IF EXISTS "Authenticated users can add chat participants" ON chat_participants;
CREATE POLICY "Users can add self or add others when in chat" ON chat_participants
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.auth_user_is_participant_in_chat(chat_id)
  );

COMMENT ON POLICY "Users can add self or add others when in chat" ON chat_participants IS
  'WhatsApp-style: add yourself when creating/joining; add others only if you are already a participant (e.g. group admin).';
