-- Performance: evaluate the access-rule helpers once per query, not per row.
--
-- Policies were written `hotel_id = auth_hotel_id()`, `user_id = auth.uid()`,
-- `auth_has_permission('x')`. Postgres calls a function used that way for
-- every row it checks (on dev, 1.5M index lookups on `users` came from
-- auth_hotel_id alone). Wrapped in a sub-select — `(SELECT auth_hotel_id())` —
-- it becomes an init-plan, run once per statement. This is Supabase's own
-- guidance for RLS performance. The rules mean exactly what they meant.
--
-- Rewrites every policy in public and storage in place; already-wrapped
-- calls are left alone, so it is safe to run more than once.

DO $$
DECLARE
  p record;
  q text;
  c text;
  pattern constant text := '(?<!SELECT )((public\.)?auth_hotel_id\(\)|auth\.uid\(\)|(public\.)?auth_has_permission\(''[^'']*''::text\)|(public\.)?auth_has_permission\(''[^'']*''\))';
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname, qual, with_check
      FROM pg_policies
     WHERE schemaname IN ('public', 'storage')
  LOOP
    q := CASE WHEN p.qual IS NULL THEN NULL ELSE regexp_replace(p.qual, pattern, '(SELECT \1)', 'g') END;
    c := CASE WHEN p.with_check IS NULL THEN NULL ELSE regexp_replace(p.with_check, pattern, '(SELECT \1)', 'g') END;
    IF q IS DISTINCT FROM p.qual THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', p.policyname, p.schemaname, p.tablename, q);
    END IF;
    IF c IS DISTINCT FROM p.with_check THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)', p.policyname, p.schemaname, p.tablename, c);
    END IF;
  END LOOP;
END;
$$;
