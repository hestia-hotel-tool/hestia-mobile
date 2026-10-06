-- Performance: each chat's latest message, without downloading the history.
--
-- The chat list needs one message per chat (its preview). It used to read
-- every message of every chat the user is in, newest first, and keep the first
-- per chat in the app — a payload that grows with every message ever sent.
-- This returns exactly one row per chat, served by idx_messages_chat_created.
--
-- SECURITY INVOKER (the default): the caller's RLS on messages and users
-- still decides what they may see.

CREATE OR REPLACE FUNCTION public.latest_messages_for_chats(p_chat_ids uuid[])
RETURNS TABLE (id uuid, chat_id uuid, content text, created_at timestamptz, sender_id uuid, sender_name text)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT DISTINCT ON (m.chat_id)
         m.id, m.chat_id, m.content, m.created_at, m.sender_id, u.full_name
    FROM public.messages m
    LEFT JOIN public.users u ON u.id = m.sender_id
   WHERE m.chat_id = ANY (p_chat_ids)
   ORDER BY m.chat_id, m.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.latest_messages_for_chats(uuid[]) TO authenticated;
