-- Add key columns for programmatic reference (e.g. "general_manager", "view_dashboard")
ALTER TABLE permissions ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_key_key;
ALTER TABLE permissions ADD CONSTRAINT permissions_key_key UNIQUE (key);
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_key_key;
ALTER TABLE roles ADD CONSTRAINT roles_key_key UNIQUE (key);

-- Unique department names for ON CONFLICT in seed
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_key;
ALTER TABLE departments ADD CONSTRAINT departments_name_key UNIQUE (name);
