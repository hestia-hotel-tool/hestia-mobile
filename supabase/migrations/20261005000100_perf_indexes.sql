-- Performance: a chat's messages in time order.
--
-- The app reads a chat's messages newest-first (the chat list's last message)
-- and oldest-first (the conversation), always by chat_id. There was an index
-- on chat_id alone, so each read sorted the chat's rows; this serves both
-- directions straight from the index.

CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON public.messages (chat_id, created_at DESC);
