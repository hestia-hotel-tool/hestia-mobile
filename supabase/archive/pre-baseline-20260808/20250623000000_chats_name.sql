-- Add optional name to chats (group name for type='group')
ALTER TABLE chats ADD COLUMN IF NOT EXISTS name TEXT;

COMMENT ON COLUMN chats.name IS 'Display name for the chat; required for group chats, null for direct/room/ticket chats.';
