-- Apply the rooms_variant work to project nkawubpnwkhzvwqkxhaz.
--
-- Trimmed for the Supabase SQL editor. The full seed opens with a TEMP TABLE
-- declared ON COMMIT DROP, which the editor's transaction handling drops before
-- the later step that reads it ("relation legacy_user_roles does not exist").
-- Those steps retire the pre-RBAC vocabulary and backfill users' job titles, and
-- both already ran on this database — so this skips them and applies only what
-- is actually missing.
--
-- Idempotent. Safe to re-run.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. The rooms_variant column and its reader.
-- ---------------------------------------------------------------------------

ALTER TABLE public.job_titles
  ADD COLUMN IF NOT EXISTS rooms_variant text NOT NULL DEFAULT 'default';

ALTER TABLE public.job_titles
  DROP CONSTRAINT IF EXISTS job_titles_rooms_variant_check;
ALTER TABLE public.job_titles
  ADD CONSTRAINT job_titles_rooms_variant_check
  CHECK (rooms_variant IN ('default', 'supervisor', 'attendant'));

COMMENT ON COLUMN public.job_titles.rooms_variant IS
  'Which Rooms list layout this title sees. Presentation only; see matrix.json.';

CREATE OR REPLACE FUNCTION public.get_my_rooms_variant() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT coalesce(jt.rooms_variant, 'default')
  FROM public.users u
  LEFT JOIN public.job_titles jt ON jt.id = u.job_title_id
  WHERE u.id = auth.uid();
$$;

ALTER FUNCTION public.get_my_rooms_variant() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.get_my_rooms_variant() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Rebuild role grants. This is what removes tab.home.view from attendants.
-- ---------------------------------------------------------------------------

DELETE FROM public.role_permissions;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM public.roles r
  JOIN public.permissions p ON TRUE
 WHERE (r.key, p.name) IN (
  ('full_access', 'tab.home.view'),
  ('full_access', 'tab.rooms.view'),
  ('full_access', 'rooms.read'),
  ('full_access', 'tab.chat.view'),
  ('full_access', 'chat.create'),
  ('full_access', 'chat.groups.manage'),
  ('full_access', 'tab.tickets.view'),
  ('full_access', 'tickets.create'),
  ('full_access', 'tickets.update'),
  ('full_access', 'tab.lost_and_found.view'),
  ('full_access', 'lost_and_found.read'),
  ('full_access', 'lost_and_found.register'),
  ('full_access', 'tab.staff.view'),
  ('full_access', 'staff.read'),
  ('full_access', 'tab.settings.view'),
  ('full_access', 'rooms.reassign'),
  ('full_access', 'rooms.status.update'),
  ('full_access', 'rooms.notes.view'),
  ('full_access', 'rooms.notes.create'),
  ('full_access', 'rooms.special_instructions.view'),
  ('full_access', 'rooms.history.view'),
  ('full_access', 'rooms.history.export'),
  ('full_access', 'rooms.checklist.view'),
  ('full_access', 'rooms.checklist.complete'),
  ('full_access', 'rooms.credits.view'),
  ('full_access', 'rooms.credits.manage'),
  ('full_access', 'rooms.front_office_status.view'),
  ('full_access', 'rooms.reservation_status.view'),
  ('full_access', 'rooms.rush.toggle'),
  ('full_access', 'rooms.flag.toggle'),
  ('full_access', 'staff.manage'),
  ('full_access', 'settings.manage'),
  ('full_access', 'tickets.close'),
  ('full_access', 'lost_and_found.manage'),
  ('hk_room_attendant', 'tab.rooms.view'),
  ('hk_room_attendant', 'rooms.read'),
  ('hk_room_attendant', 'tab.chat.view'),
  ('hk_room_attendant', 'chat.create'),
  ('hk_room_attendant', 'chat.groups.manage'),
  ('hk_room_attendant', 'tab.tickets.view'),
  ('hk_room_attendant', 'tickets.create'),
  ('hk_room_attendant', 'tickets.update'),
  ('hk_room_attendant', 'tab.lost_and_found.view'),
  ('hk_room_attendant', 'lost_and_found.read'),
  ('hk_room_attendant', 'lost_and_found.register'),
  ('hk_room_attendant', 'tab.settings.view'),
  ('hk_room_attendant', 'rooms.status.update'),
  ('hk_room_attendant', 'rooms.notes.view'),
  ('hk_room_attendant', 'rooms.notes.create'),
  ('hk_room_attendant', 'rooms.history.view'),
  ('hk_room_attendant', 'rooms.history.export'),
  ('hk_room_attendant', 'rooms.checklist.view'),
  ('hk_room_attendant', 'rooms.checklist.complete'),
  ('hk_houseman', 'tab.home.view'),
  ('hk_houseman', 'tab.rooms.view'),
  ('hk_houseman', 'rooms.read'),
  ('hk_houseman', 'tab.chat.view'),
  ('hk_houseman', 'chat.create'),
  ('hk_houseman', 'chat.groups.manage'),
  ('hk_houseman', 'tab.tickets.view'),
  ('hk_houseman', 'tickets.create'),
  ('hk_houseman', 'tickets.update'),
  ('hk_houseman', 'tab.lost_and_found.view'),
  ('hk_houseman', 'lost_and_found.read'),
  ('hk_houseman', 'lost_and_found.register'),
  ('hk_houseman', 'tab.settings.view'),
  ('hk_houseman', 'rooms.notes.view'),
  ('hk_houseman', 'rooms.notes.create'),
  ('hk_houseman', 'rooms.history.view'),
  ('hk_houseman', 'rooms.history.export'),
  ('hk_laundry', 'tab.home.view'),
  ('hk_laundry', 'tab.rooms.view'),
  ('hk_laundry', 'rooms.read'),
  ('hk_laundry', 'tab.tickets.view'),
  ('hk_laundry', 'tickets.create'),
  ('hk_laundry', 'tickets.update'),
  ('hk_laundry', 'tab.lost_and_found.view'),
  ('hk_laundry', 'lost_and_found.read'),
  ('hk_laundry', 'lost_and_found.register'),
  ('hk_laundry', 'tab.settings.view'),
  ('hk_laundry', 'rooms.notes.view'),
  ('hk_laundry', 'rooms.notes.create'),
  ('hk_laundry', 'rooms.history.view'),
  ('hk_laundry', 'rooms.history.export'),
  ('hk_public_area', 'tab.home.view'),
  ('hk_public_area', 'tab.chat.view'),
  ('hk_public_area', 'chat.create'),
  ('hk_public_area', 'chat.groups.manage'),
  ('hk_public_area', 'tab.tickets.view'),
  ('hk_public_area', 'tickets.create'),
  ('hk_public_area', 'tickets.update'),
  ('hk_public_area', 'tab.lost_and_found.view'),
  ('hk_public_area', 'lost_and_found.read'),
  ('hk_public_area', 'lost_and_found.register'),
  ('hk_public_area', 'tab.settings.view'),
  ('ops_senior', 'tab.home.view'),
  ('ops_senior', 'tab.rooms.view'),
  ('ops_senior', 'rooms.read'),
  ('ops_senior', 'tab.chat.view'),
  ('ops_senior', 'chat.create'),
  ('ops_senior', 'chat.groups.manage'),
  ('ops_senior', 'tab.tickets.view'),
  ('ops_senior', 'tickets.create'),
  ('ops_senior', 'tickets.update'),
  ('ops_senior', 'tab.lost_and_found.view'),
  ('ops_senior', 'lost_and_found.read'),
  ('ops_senior', 'lost_and_found.register'),
  ('ops_senior', 'tab.settings.view'),
  ('ops_senior', 'rooms.notes.view'),
  ('ops_senior', 'rooms.notes.create'),
  ('ops_senior', 'rooms.special_instructions.view'),
  ('ops_senior', 'rooms.history.view'),
  ('ops_senior', 'rooms.history.export'),
  ('ops_senior', 'rooms.checklist.view'),
  ('ops_senior', 'rooms.checklist.complete'),
  ('ops_senior', 'rooms.front_office_status.view'),
  ('ops_senior', 'rooms.reservation_status.view'),
  ('ops_senior', 'rooms.rush.toggle'),
  ('ops_senior', 'rooms.flag.toggle'),
  ('fo_agent', 'tab.home.view'),
  ('fo_agent', 'tab.rooms.view'),
  ('fo_agent', 'rooms.read'),
  ('fo_agent', 'tab.chat.view'),
  ('fo_agent', 'chat.create'),
  ('fo_agent', 'chat.groups.manage'),
  ('fo_agent', 'tab.tickets.view'),
  ('fo_agent', 'tickets.create'),
  ('fo_agent', 'tickets.update'),
  ('fo_agent', 'tab.lost_and_found.view'),
  ('fo_agent', 'lost_and_found.read'),
  ('fo_agent', 'lost_and_found.register'),
  ('fo_agent', 'tab.settings.view'),
  ('fo_agent', 'rooms.notes.view'),
  ('fo_agent', 'rooms.notes.create'),
  ('fo_agent', 'rooms.special_instructions.view'),
  ('fo_agent', 'rooms.checklist.view'),
  ('fo_agent', 'rooms.checklist.complete'),
  ('concierge_agent', 'tab.home.view'),
  ('concierge_agent', 'tab.rooms.view'),
  ('concierge_agent', 'rooms.read'),
  ('concierge_agent', 'tab.chat.view'),
  ('concierge_agent', 'chat.create'),
  ('concierge_agent', 'chat.groups.manage'),
  ('concierge_agent', 'tab.tickets.view'),
  ('concierge_agent', 'tickets.create'),
  ('concierge_agent', 'tickets.update'),
  ('concierge_agent', 'tab.lost_and_found.view'),
  ('concierge_agent', 'lost_and_found.read'),
  ('concierge_agent', 'lost_and_found.register'),
  ('concierge_agent', 'tab.settings.view'),
  ('concierge_agent', 'rooms.notes.view'),
  ('concierge_agent', 'rooms.notes.create'),
  ('concierge_agent', 'rooms.special_instructions.view'),
  ('concierge_agent', 'rooms.front_office_status.view'),
  ('concierge_agent', 'rooms.reservation_status.view'),
  ('concierge_agent', 'rooms.rush.toggle'),
  ('concierge_agent', 'rooms.flag.toggle'),
  ('ird_service', 'tab.home.view'),
  ('ird_service', 'tab.rooms.view'),
  ('ird_service', 'rooms.read'),
  ('ird_service', 'tab.chat.view'),
  ('ird_service', 'chat.create'),
  ('ird_service', 'chat.groups.manage'),
  ('ird_service', 'tab.tickets.view'),
  ('ird_service', 'tickets.create'),
  ('ird_service', 'tickets.update'),
  ('ird_service', 'tab.lost_and_found.view'),
  ('ird_service', 'lost_and_found.read'),
  ('ird_service', 'lost_and_found.register'),
  ('ird_service', 'tab.settings.view'),
  ('ird_service', 'rooms.notes.view'),
  ('ird_service', 'rooms.notes.create'),
  ('ird_service', 'rooms.special_instructions.view'),
  ('ird_service', 'rooms.checklist.view'),
  ('ird_service', 'rooms.checklist.complete'),
  ('ird_service', 'rooms.front_office_status.view'),
  ('ird_service', 'rooms.reservation_status.view'),
  ('ird_service', 'rooms.rush.toggle'),
  ('ird_service', 'rooms.flag.toggle'),
  ('technical', 'tab.home.view'),
  ('technical', 'tab.rooms.view'),
  ('technical', 'rooms.read'),
  ('technical', 'tab.chat.view'),
  ('technical', 'chat.create'),
  ('technical', 'chat.groups.manage'),
  ('technical', 'tab.tickets.view'),
  ('technical', 'tickets.create'),
  ('technical', 'tickets.update'),
  ('technical', 'tab.lost_and_found.view'),
  ('technical', 'lost_and_found.read'),
  ('technical', 'lost_and_found.register'),
  ('technical', 'tab.settings.view'),
  ('technical', 'rooms.notes.view'),
  ('technical', 'rooms.notes.create'),
  ('technical', 'rooms.special_instructions.view'),
  ('technical', 'rooms.history.view'),
  ('technical', 'rooms.history.export'),
  ('technical', 'rooms.front_office_status.view'),
  ('technical', 'rooms.reservation_status.view'),
  ('technical', 'rooms.rush.toggle'),
  ('technical', 'rooms.flag.toggle'),
  ('fnb_kitchen', 'tab.chat.view'),
  ('fnb_kitchen', 'chat.create'),
  ('fnb_kitchen', 'chat.groups.manage'),
  ('fnb_kitchen', 'tab.tickets.view'),
  ('fnb_kitchen', 'tickets.create'),
  ('fnb_kitchen', 'tickets.update'),
  ('fnb_kitchen', 'tab.lost_and_found.view'),
  ('fnb_kitchen', 'lost_and_found.read'),
  ('fnb_kitchen', 'lost_and_found.register'),
  ('fnb_kitchen', 'tab.settings.view')
 )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Job titles, now carrying rooms_variant.
-- ---------------------------------------------------------------------------

-- 7. Job titles. Display identity; permissions come from the role.
INSERT INTO public.job_titles (key, name, department_id, role_id, home_variant, rooms_variant)
SELECT v.key, v.name, d.id, r.id, v.home_variant, v.rooms_variant
  FROM (VALUES
    ('executive_housekeeper', 'Executive Housekeeper', 'housekeeping', 'full_access', 'default', 'default'),
    ('housekeeping_manager', 'Housekeeping Manager', 'housekeeping', 'full_access', 'default', 'default'),
    ('assistant_housekeeping_manager', 'Assistant Housekeeping Manager', 'housekeeping', 'full_access', 'default', 'default'),
    ('senior_supervisor', 'Senior Supervisor', 'housekeeping', 'full_access', 'default', 'supervisor'),
    ('supervisor', 'Supervisor', 'housekeeping', 'full_access', 'default', 'supervisor'),
    ('coordinator', 'Coordinator', 'housekeeping', 'full_access', 'default', 'supervisor'),
    ('housekeeping_room_attendant', 'Housekeeping Room Attendant', 'housekeeping', 'hk_room_attendant', 'default', 'attendant'),
    ('housekeeping_porter_houseman', 'Housekeeping Porter / Houseman', 'housekeeping', 'hk_houseman', 'hsk_portier', 'default'),
    ('housekeeping_laundry_attendant', 'Housekeeping Laundry Attendant', 'housekeeping', 'hk_laundry', 'default', 'default'),
    ('housekeeping_public_area_attendant', 'Housekeeping Public Area Attendant', 'housekeeping', 'hk_public_area', 'default', 'default'),
    ('director_of_rooms', 'Director Of Rooms', 'front_office', 'ops_senior', 'default', 'default'),
    ('assistant_director_of_rooms', 'Assistant Director Of Rooms', 'front_office', 'ops_senior', 'default', 'default'),
    ('director_of_front_office', 'Director of Front Office', 'front_office', 'ops_senior', 'default', 'default'),
    ('front_office_manager', 'Front Office Manager', 'front_office', 'ops_senior', 'default', 'default'),
    ('assistant_front_office_manager', 'Assistant Front Office Manager', 'front_office', 'ops_senior', 'default', 'default'),
    ('front_office_supervisor', 'Front Office Supervisor', 'front_office', 'ops_senior', 'default', 'default'),
    ('front_office_agent', 'Front Office Agent', 'front_office', 'fo_agent', 'default', 'default'),
    ('front_office_trainee', 'Front Office Trainee', 'front_office', 'fo_agent', 'default', 'default'),
    ('night_manager', 'Night Manager', 'front_office', 'ops_senior', 'default', 'default'),
    ('night_auditor', 'Night Auditor', 'front_office', 'ops_senior', 'default', 'default'),
    ('night_agent', 'Night Agent', 'front_office', 'fo_agent', 'default', 'default'),
    ('guest_relations_manager', 'Guest Relations Manager', 'front_office', 'ops_senior', 'default', 'default'),
    ('guest_relations_supervisor', 'Guest Relations Supervisor', 'front_office', 'ops_senior', 'default', 'default'),
    ('guest_relations_agent', 'Guest Relations Agent', 'front_office', 'fo_agent', 'default', 'default'),
    ('head_concierge', 'Head Concierge', 'concierge', 'ops_senior', 'default', 'default'),
    ('chief_concierge', 'Chief Concierge', 'concierge', 'ops_senior', 'default', 'default'),
    ('concierge_manager', 'Concierge Manager', 'concierge', 'ops_senior', 'default', 'default'),
    ('assistant_concierge_manager', 'Assistant Concierge Manager', 'concierge', 'ops_senior', 'default', 'default'),
    ('concierge_supervisor', 'Concierge Supervisor', 'concierge', 'ops_senior', 'default', 'default'),
    ('concierge_agent', 'Concierge Agent', 'concierge', 'concierge_agent', 'default', 'default'),
    ('bellboy_supervisor', 'Bellboy Supervisor', 'concierge', 'concierge_agent', 'default', 'default'),
    ('bellboy_agent', 'Bellboy Agent', 'concierge', 'concierge_agent', 'default', 'default'),
    ('valet_supervisor', 'Valet Supervisor', 'concierge', 'concierge_agent', 'default', 'default'),
    ('valet_attendant', 'Valet Attendant', 'concierge', 'concierge_agent', 'default', 'default'),
    ('director_of_in_room_dining', 'Director Of In Room Dining', 'in_room_dining', 'ops_senior', 'default', 'default'),
    ('in_room_dining_manager', 'In Room Dining Manager', 'in_room_dining', 'ops_senior', 'default', 'default'),
    ('in_room_dining_assistant_manager', 'In Room Dining Assistant Manager', 'in_room_dining', 'ops_senior', 'default', 'default'),
    ('in_room_dining_supervisor', 'In Room Dining Supervisor', 'in_room_dining', 'ops_senior', 'default', 'default'),
    ('in_room_dining_waiter_waitress', 'In Room Dining Waiter/Waitress', 'in_room_dining', 'ops_senior', 'default', 'default'),
    ('in_room_dining_order_taker', 'In Room Dining Order Taker', 'in_room_dining', 'ird_service', 'default', 'default'),
    ('butler_in_room_dining', 'Butler In Room Dining', 'in_room_dining', 'ird_service', 'default', 'default'),
    ('director_of_engineering', 'Director of Engineering', 'engineering', 'technical', 'engineering', 'default'),
    ('assistant_director_of_engineering', 'Assistant Director Of Engineering', 'engineering', 'technical', 'engineering', 'default'),
    ('engineering_supervisor', 'Engineering Supervisor', 'engineering', 'technical', 'engineering', 'default'),
    ('shift_engineer', 'Shift Engineer', 'engineering', 'technical', 'engineering', 'default'),
    ('director_of_information_technology', 'Director Of Information Technology', 'it', 'technical', 'default', 'default'),
    ('it_manager', 'IT Manager', 'it', 'technical', 'default', 'default'),
    ('assistant_it_manager', 'Assistant IT Manager', 'it', 'technical', 'default', 'default'),
    ('it_supervisor', 'IT Supervisor', 'it', 'technical', 'default', 'default'),
    ('it_agent', 'IT Agent', 'it', 'technical', 'default', 'default'),
    ('general_manager', 'General Manager', 'executive', 'full_access', 'default', 'default'),
    ('hotel_manager', 'Hotel Manager', 'executive', 'full_access', 'default', 'default'),
    ('assistant_to_general_and_hotel_manager', 'Assistant to General & Hotel Manager', 'executive', 'full_access', 'default', 'default'),
    ('fandb_kitchen_staff', 'F&B / Kitchen Staff', 'food_beverage', 'fnb_kitchen', 'default', 'default')
  ) AS v(key, name, department_key, role_key, home_variant, rooms_variant)
  JOIN public.departments d ON d.key = v.department_key
  JOIN public.roles r       ON r.key = v.role_key
ON CONFLICT (key) DO UPDATE
  SET name          = EXCLUDED.name,
      department_id = EXCLUDED.department_id,
      role_id       = EXCLUDED.role_id,
      home_variant  = EXCLUDED.home_variant,
      rooms_variant = EXCLUDED.rooms_variant;

-- 9. Fail the migration if the seed did not land as expected.
DO $$
DECLARE n_roles int; n_titles int; n_perms int; n_grants int;
BEGIN
  SELECT count(*) INTO n_roles  FROM public.roles;
  SELECT count(*) INTO n_titles FROM public.job_titles;
  SELECT count(*) INTO n_perms  FROM public.permissions;
  SELECT count(*) INTO n_grants FROM public.role_permissions;
  IF n_roles  <> 11 THEN
    RAISE EXCEPTION 'expected 11 roles, found %', n_roles;
  END IF;
  IF n_titles <> 54 THEN
    RAISE EXCEPTION 'expected 54 job titles, found %', n_titles;
  END IF;
  IF n_perms  <> 34 THEN
    RAISE EXCEPTION 'expected 34 permissions, found %', n_perms;
  END IF;
  IF n_grants <> 211 THEN
    RAISE EXCEPTION 'expected 211 role_permissions, found %', n_grants;
  END IF;
END $$;


COMMIT;
