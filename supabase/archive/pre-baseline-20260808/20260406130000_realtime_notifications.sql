-- Enable Realtime on notifications so clients can react to new inbox rows
-- (toast, vibration, badge refresh) even when push is unavailable.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
