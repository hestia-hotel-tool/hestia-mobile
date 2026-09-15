-- In Room Dining reads the ticket dashboard.
--
-- All seven titles in the in_room_dining department move from the housekeeping
-- category dashboard to `dining`: "Tickets Overview", an {n} Tickets card
-- counting Priority / Unsolved / Solved / Out of Order, then Recent activity
-- with a Load more. Figma 3859:3355, which is the engineering frame (3843-52)
-- with the header text changed.
--
-- The same dashboard engineering reads, over this department's tickets. It is a
-- separate value rather than reusing 'engineering' because the department whose
-- tickets are counted is part of what the variant means, and because the two
-- differ elsewhere: engineering has no Rooms tab so its search field looks
-- through tickets, while dining keeps the rooms search the frame draws.
--
-- The whole department, following engineering: all four engineering titles took
-- that variant while IT — a separate department on the same spec vector —
-- stayed on 'default'. These seven share one department and already hold the
-- frame's exact tab set, so splitting them by seniority would be arbitrary.
--
-- Presentation only. No rights change: home_variant says which dashboard a
-- person reads, not what they may do. role_permissions is untouched and the
-- seed's grant count is unchanged at 230.
--
-- Order matters: widen the CHECK first. Updating first would write a value the
-- old constraint forbids and the statement would fail. Same shape as
-- 20260910000000_rooms_variant_leadership.sql.
--
-- The generated seed (20260902000100_rbac_seed.sql) already encodes this, but
-- Supabase never re-runs an applied migration, so a deployed database needs the
-- delta spelled out.

BEGIN;

ALTER TABLE public.job_titles
  DROP CONSTRAINT IF EXISTS job_titles_home_variant_check;
ALTER TABLE public.job_titles
  ADD CONSTRAINT job_titles_home_variant_check
  CHECK (home_variant IN ('default', 'engineering', 'dining', 'hsk_portier'));

UPDATE public.job_titles
   SET home_variant = 'dining'
 WHERE key IN (
         'director_of_in_room_dining',
         'in_room_dining_manager',
         'in_room_dining_assistant_manager',
         'in_room_dining_supervisor',
         'in_room_dining_waiter_waitress',
         'in_room_dining_order_taker',
         'butler_in_room_dining'
       )
   AND home_variant IS DISTINCT FROM 'dining';

COMMIT;
