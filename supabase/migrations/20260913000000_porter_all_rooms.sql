-- The porter reads every room, not just their own.
--
-- The porter was given the `attendant` Rooms list along with the other three
-- attendant titles, which narrows the list to the reader's own assignments and
-- puts a finished/total counter beside the title. The product decision is that
-- the porter works the whole floor rather than a room list of their own, so
-- they see all rooms.
--
-- That is the `leadership` layout: the same banded screen, minus the
-- assigned-only narrowing and its pill, and without the supervisor's pinned
-- In Progress band. It is what the porter's frame (Figma 3859-1041) draws — a
-- copy of the executive housekeeper's screen, with cards assigned to other
-- people and no counter beside "Rooms".
--
-- This is presentation only. No right changes: the porter keeps exactly the
-- permissions they had, including no `tab.home.view`, so they still have no
-- Home tab and still land on Rooms. `role_permissions` is untouched and the
-- seed's grant count is unchanged.
--
-- 'leadership' is already an allowed value of the CHECK constraint
-- (20260910000000_rooms_variant_leadership.sql widened it), so nothing needs
-- dropping or recreating here.
--
-- The generated seed (20260902000100_rbac_seed.sql) already encodes this, but
-- Supabase never re-runs an applied migration, so a deployed database needs the
-- delta spelled out. Same reason as 20260912000000_engineering_role_split.sql.

BEGIN;

UPDATE public.job_titles
   SET rooms_variant = 'leadership'
 WHERE key = 'housekeeping_porter_houseman'
   AND rooms_variant IS DISTINCT FROM 'leadership';

COMMIT;
