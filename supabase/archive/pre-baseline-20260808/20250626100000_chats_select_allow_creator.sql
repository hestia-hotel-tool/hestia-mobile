-- Fix: allow SELECT on chats when user is the creator, so INSERT ... RETURNING works
-- before participant rows exist (new chat / new group creation).
DROP POLICY IF EXISTS "Users can view chats they participate in" ON chats;
DROP POLICY IF EXISTS "Users can view chats they participate in or created" ON chats;
CREATE POLICY "Users can view chats they participate in or created" ON chats
  FOR SELECT TO authenticated
  USING (
    created_by_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
    )
  );
