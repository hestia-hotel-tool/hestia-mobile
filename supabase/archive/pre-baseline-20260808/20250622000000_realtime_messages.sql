-- Enable Supabase Realtime for messages table (WhatsApp-style live updates)
-- Add messages to the realtime publication so clients can subscribe to INSERT/UPDATE/DELETE
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION
  WHEN duplicate_object THEN NULL; -- already in publication
END $$;
