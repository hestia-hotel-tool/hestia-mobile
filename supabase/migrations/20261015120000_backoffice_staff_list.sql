-- Back office Step 2.2: the staff list leaves out the platform team.
--
-- Platform admins have a users row in whichever hotel they are working in,
-- but they are Hestia staff, not the hotel's. platform_admins itself is not
-- readable by apps; this returns only the ids, so lists can exclude them.
--
-- Mobile impact: none (nothing on mobile calls it yet).

CREATE OR REPLACE FUNCTION public.platform_team_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT coalesce(array_agg(user_id), '{}') FROM public.platform_admins;
$$;
COMMENT ON FUNCTION public.platform_team_ids() IS
  'User ids of the platform team, for leaving them out of a hotel''s staff lists.';
REVOKE ALL ON FUNCTION public.platform_team_ids() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.platform_team_ids() TO authenticated;
