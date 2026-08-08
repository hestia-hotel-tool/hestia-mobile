-- Chats and chat_participants: restrict viewing to participants only.
-- Group chats: visible to all members in the group.
-- Individual (direct) chats: visible to the logged-in user (as participant).
-- All operations require authenticated user.

-- Drop existing broad policies
DROP POLICY IF EXISTS "Authenticated users can manage chats" ON chats;
DROP POLICY IF EXISTS "Authenticated users can manage chat_participants" ON chat_participants;

-- Chats: SELECT if current user is a participant or the creator (creator so INSERT ... RETURNING works before participants exist)
CREATE POLICY "Users can view chats they participate in or created" ON chats
  FOR SELECT TO authenticated
  USING (
    created_by_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
    )
  );

-- Chats: INSERT for authenticated (creator will be added as participant by app)
CREATE POLICY "Authenticated users can create chats" ON chats
  FOR INSERT TO authenticated
  WITH CHECK (created_by_id = auth.uid());

-- Chats: UPDATE only if participant (e.g. group name by admin)
CREATE POLICY "Participants can update chat" ON chats
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
    )
  );

-- Chats: DELETE only if participant (app can restrict to creator/admin elsewhere)
CREATE POLICY "Participants can delete chat" ON chats
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
    )
  );

-- Chat participants: SELECT only rows for chats the user is in (see other participants)
CREATE POLICY "Users can view participants of their chats" ON chat_participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chat_participants.chat_id AND cp.user_id = auth.uid()
    )
  );

-- Chat participants: INSERT for authenticated (e.g. add self when creating/joining)
CREATE POLICY "Authenticated users can add chat participants" ON chat_participants
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Chat participants: UPDATE own membership only
CREATE POLICY "Users can update own participant row" ON chat_participants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Chat participants: DELETE own row (leave) or when adding/removing in a chat you're in
CREATE POLICY "Users can delete own participant row" ON chat_participants
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Messages: only participants of the chat can read/write (align with chat visibility)
DROP POLICY IF EXISTS "Authenticated users can manage messages" ON messages;

CREATE POLICY "Participants can view messages" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can insert messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update own messages" ON messages
  FOR UPDATE TO authenticated
  USING (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can delete own messages" ON messages
  FOR DELETE TO authenticated
  USING (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = messages.chat_id AND cp.user_id = auth.uid()
    )
  );
