-- Remove key column from roles and permissions; use name for identification
-- Permissions: name is already UNIQUE (initial schema)
-- Roles: add unique on name for upsert support

ALTER TABLE permissions DROP CONSTRAINT IF EXISTS permissions_key_key;
ALTER TABLE permissions DROP COLUMN IF EXISTS key;

ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_key_key;
ALTER TABLE roles DROP COLUMN IF EXISTS key;
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_key;
ALTER TABLE roles ADD CONSTRAINT roles_name_key UNIQUE (name);
