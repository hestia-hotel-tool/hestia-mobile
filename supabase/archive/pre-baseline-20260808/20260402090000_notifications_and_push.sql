-- Notifications + push tokens + ticket tags
-- Adds:
-- - user_push_tokens: store Expo push tokens per device
-- - notifications: in-app notification inbox
-- - ticket_tags: ticket -> tagged staff (multi-tag)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Push tokens (Expo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  device_os TEXT,
  device_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expo_push_token)
);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);

DROP TRIGGER IF EXISTS update_user_push_tokens_updated_at ON user_push_tokens;
CREATE TRIGGER update_user_push_tokens_updated_at
  BEFORE UPDATE ON user_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS: user can manage only their tokens
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their push tokens" ON user_push_tokens;
CREATE POLICY "Users can read their push tokens" ON user_push_tokens
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can upsert their push tokens" ON user_push_tokens;
CREATE POLICY "Users can upsert their push tokens" ON user_push_tokens
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their push tokens" ON user_push_tokens;
CREATE POLICY "Users can update their push tokens" ON user_push_tokens
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their push tokens" ON user_push_tokens;
CREATE POLICY "Users can delete their push tokens" ON user_push_tokens
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- In-app notifications inbox
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- chat_message | ticket_tag | room_assignment
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their notifications" ON notifications;
CREATE POLICY "Users can read their notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark their notifications read" ON notifications;
CREATE POLICY "Users can mark their notifications read" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Inserts are server-driven (Edge Function / service role), so we do not allow client inserts by default.

-- ---------------------------------------------------------------------------
-- Ticket tags (multi-tagging staff on a ticket)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tagged_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tagged_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ticket_id, tagged_user_id)
);

CREATE INDEX IF NOT EXISTS idx_ticket_tags_ticket ON ticket_tags(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_tags_tagged_user ON ticket_tags(tagged_user_id);

ALTER TABLE ticket_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read ticket tags for tickets they can read" ON ticket_tags;
CREATE POLICY "Users can read ticket tags for tickets they can read" ON ticket_tags
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tickets t WHERE t.id = ticket_id)
  );

DROP POLICY IF EXISTS "Authenticated users can tag staff on tickets" ON ticket_tags;
CREATE POLICY "Authenticated users can tag staff on tickets" ON ticket_tags
  FOR INSERT TO authenticated
  WITH CHECK (tagged_by_id = auth.uid());

