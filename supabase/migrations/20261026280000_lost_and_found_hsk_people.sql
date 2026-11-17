-- Housekeeping registers lost & found items for Housekeeping people only
-- (client change, 2026-10-26): a Supervisor or Executive Housekeeper may pick
-- Found by / Registered by, but only from the Housekeeping department. The
-- app's pickers list only them; this holds it on the server.
--
-- Builds on 20261026260000 (line staff register as themselves). Other
-- departments are unchanged — a front desk registers what a housekeeper found
-- and handed in — and the Hotel Manager (hotel-wide) is not limited.

BEGIN;

CREATE OR REPLACE FUNCTION public._user_in_department(p_user_id uuid, p_department_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_user_id IS NULL OR EXISTS (
    SELECT 1 FROM public.users u
      LEFT JOIN public.job_titles jt ON jt.id = u.job_title_id
     WHERE u.id = p_user_id AND coalesce(jt.department_id, u.department_id) = p_department_id
  );
$$;
REVOKE ALL ON FUNCTION public._user_in_department(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public._user_in_department(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Hotel users can register lost_and_found" ON public.lost_and_found_items;
CREATE POLICY "Hotel users can register lost_and_found" ON public.lost_and_found_items
  FOR INSERT
  WITH CHECK (
    hotel_id = (SELECT public.auth_hotel_id())
    AND (
      -- Line staff: themselves only (20261026260000).
      (
        NOT public.auth_has_permission('lost_and_found.read_all')
        AND coalesce(found_by_id, (SELECT auth.uid())) = (SELECT auth.uid())
        AND coalesce(registered_by_id, (SELECT auth.uid())) = (SELECT auth.uid())
      )
      OR (
        public.auth_has_permission('lost_and_found.read_all')
        AND (
          -- Housekeeping leaders: Housekeeping people only.
          public.auth_tickets_hotel_wide()
          OR public.auth_department_id() IS DISTINCT FROM (SELECT id FROM public.departments WHERE key = 'housekeeping')
          OR (
            public._user_in_department(found_by_id, public.auth_department_id())
            AND public._user_in_department(registered_by_id, public.auth_department_id())
          )
        )
      )
    )
  );

COMMIT;
