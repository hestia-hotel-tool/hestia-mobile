-- Front Office reads the banded Rooms list.
--
-- All 14 titles in the front_office department move from the flat legacy list
-- to `leadership` — the same banded screen housekeeping leadership reads:
-- profile header, per-card status caps, bands Paused / In Progress / Priority /
-- Dirty / Cleaned / Inspected. Figma 3859:1919, which is the executive
-- housekeeper's frame duplicated with the header text changed.
--
-- The whole department, not just the front desk: the six front-desk titles, the
-- two Rooms-leadership ones, the three Night ones and the three Guest Relations
-- ones share two roles (ops_senior, fo_agent) and one department, so splitting
-- them would be arbitrary.
--
-- Presentation only. No rights change: `rooms_variant` says which list a person
-- reads, not what they may do with it. In particular none of these titles holds
-- `rooms.status.update`, and they still do not — the status pill on that screen
-- is gated on the permission in AllRoomsScreen, so it renders inert for them.
-- role_permissions is untouched and the seed's grant count is unchanged.
--
-- 'leadership' is already an allowed value of the CHECK constraint
-- (20260910000000_rooms_variant_leadership.sql widened it), so nothing needs
-- dropping or recreating here.
--
-- The generated seed (20260902000100_rbac_seed.sql) already encodes this, but
-- Supabase never re-runs an applied migration, so a deployed database needs the
-- delta spelled out. Same reason as 20260913000000_porter_all_rooms.sql.

BEGIN;

UPDATE public.job_titles
   SET rooms_variant = 'leadership'
 WHERE key IN (
         'director_of_rooms',
         'assistant_director_of_rooms',
         'director_of_front_office',
         'front_office_manager',
         'assistant_front_office_manager',
         'front_office_supervisor',
         'front_office_agent',
         'front_office_trainee',
         'night_manager',
         'night_auditor',
         'night_agent',
         'guest_relations_manager',
         'guest_relations_supervisor',
         'guest_relations_agent'
       )
   AND rooms_variant IS DISTINCT FROM 'leadership';

COMMIT;
