-- Add role to chat_participants: 'member' | 'admin'. Group creator is admin; they can promote others.
ALTER TABLE chat_participants ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';

-- Constrain to valid roles
ALTER TABLE chat_participants DROP CONSTRAINT IF EXISTS chat_participants_role_check;
ALTER TABLE chat_participants ADD CONSTRAINT chat_participants_role_check CHECK (role IN ('member', 'admin'));

-- Backfill: group creator is admin (for existing rows before role column)
UPDATE chat_participants cp
SET role = 'admin'
FROM chats c
WHERE cp.chat_id = c.id
  AND c.type = 'group'
  AND cp.user_id = c.created_by_id;

COMMENT ON COLUMN chat_participants.role IS 'member or admin; only admins can edit group name; only creator can delete group or promote to admin.';
