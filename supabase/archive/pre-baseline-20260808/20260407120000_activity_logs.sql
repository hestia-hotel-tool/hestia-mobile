-- Global activity logs (room-scoped via table_name + record_id)
-- Keeps an audit trail of user actions in a consistent structure.

-- gen_random_uuid() lives in pgcrypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_table_record_created
  ON activity_logs(table_name, record_id, created_at DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read activity logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'Authenticated users can read activity_logs'
  ) THEN
    CREATE POLICY "Authenticated users can read activity_logs" ON activity_logs
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'Authenticated users can insert activity_logs'
  ) THEN
    CREATE POLICY "Authenticated users can insert activity_logs" ON activity_logs
      FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

