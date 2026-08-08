-- Fix notifications/push/tags foreign keys to reference auth.users
-- This prevents 500s in the notify Edge Function when a recipient exists in auth.users
-- but doesn't yet have a row in public.users (profile/staff table).

ALTER TABLE IF EXISTS public.user_push_tokens
  DROP CONSTRAINT IF EXISTS user_push_tokens_user_id_fkey;
ALTER TABLE IF EXISTS public.user_push_tokens
  ADD CONSTRAINT user_push_tokens_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE IF EXISTS public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.ticket_tags
  DROP CONSTRAINT IF EXISTS ticket_tags_tagged_user_id_fkey;
ALTER TABLE IF EXISTS public.ticket_tags
  ADD CONSTRAINT ticket_tags_tagged_user_id_fkey
  FOREIGN KEY (tagged_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.ticket_tags
  DROP CONSTRAINT IF EXISTS ticket_tags_tagged_by_id_fkey;
ALTER TABLE IF EXISTS public.ticket_tags
  ADD CONSTRAINT ticket_tags_tagged_by_id_fkey
  FOREIGN KEY (tagged_by_id) REFERENCES auth.users(id) ON DELETE SET NULL;

