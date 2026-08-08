-- Reply to a message and tag a member
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tagged_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

COMMENT ON COLUMN messages.reply_to_id IS 'When set, this message is a reply to another message.';
COMMENT ON COLUMN messages.tagged_user_id IS 'When set, this message tags/mentions this user.';

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id);
