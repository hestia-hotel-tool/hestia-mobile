-- Hestia PMS - Seed Data
-- Run AFTER migrations (including 20250606000004_remove_key_from_roles_permissions)
-- Order: 1. Permissions, 2. Roles, 3. role_permissions, 4. Departments, 5. Shifts, 6. Consumables

-- ============================================
-- 1. PERMISSIONS (name = permission name, description = description)
-- ============================================
WITH perm_rows(name, description) AS (
  VALUES
    ('view_dashboard', 'View system dashboard'),
    ('view_rooms', 'View room details'),
    ('assign_rooms', 'Assign rooms to staff'),
    ('update_room_status', 'Update room work status'),
    ('view_reservations', 'View reservations'),
    ('create_ticket', 'Create tickets'),
    ('update_ticket', 'Update ticket status or details'),
    ('close_ticket', 'Close tickets'),
    ('record_consumption', 'Record guest consumptions'),
    ('bill_consumption', 'Bill guest consumptions'),
    ('report_lost_found', 'Report lost and found items'),
    ('update_lost_found', 'Update lost and found status'),
    ('view_room_history', 'View room activity history'),
    ('send_message', 'Send chat messages'),
    ('view_chats', 'View chats'),
    ('manage_users', 'Manage system users'),
    ('manage_roles', 'Manage roles and permissions'),
    ('system_settings', 'Manage system settings')
)
INSERT INTO public.permissions (name, description)
SELECT pr.name, pr.description
FROM perm_rows pr
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p WHERE p.name = pr.name
);

-- ============================================
-- 2. ROLES (name and description)
-- ============================================
WITH role_rows(name, description) AS (
  VALUES
    ('Executive Housekeeper', 'Executive Housekeeper'),
    ('Housekeeping Manager', 'Housekeeping Manager'),
    ('Assistant Housekeeping Manager', 'Assistant Housekeeping Manager'),
    ('Senior Supervisor', 'Senior Supervisor'),
    ('Supervisor', 'Supervisor'),
    ('Coordinator', 'Coordinator'),
    ('Housekeeping Room Attendant', 'Housekeeping Room Attendant'),
    ('Housekeeping Portier / Houseman', 'Housekeeping Portier / Houseman'),
    ('Housekeeping Laundry Attendant', 'Housekeeping Laundry Attendant'),
    ('Housekeeping Public Area Attendant', 'Housekeeping Public Area Attendant'),
    ('Director of Rooms', 'Director of Rooms'),
    ('Assistant Director of Rooms', 'Assistant Director of Rooms'),
    ('Director of Front Office', 'Director of Front Office'),
    ('Front Office Manager', 'Front Office Manager'),
    ('Front Office Supervisor', 'Front Office Supervisor'),
    ('Front Office Agent', 'Front Office Agent'),
    ('Front Office Trainee', 'Front Office Trainee'),
    ('Night Manager', 'Night Manager'),
    ('Night Auditor', 'Night Auditor'),
    ('Night Agent', 'Night Agent'),
    ('Director of Engineering', 'Director of Engineering'),
    ('Engineering Supervisor', 'Engineering Supervisor'),
    ('Shift Engineer', 'Shift Engineer'),
    ('IT Manager', 'IT Manager'),
    ('General Manager', 'General Manager'),
    ('Hotel Manager', 'Hotel Manager')
)
INSERT INTO public.roles (name, description)
SELECT rr.name, rr.description
FROM role_rows rr
WHERE NOT EXISTS (
  SELECT 1 FROM public.roles r WHERE r.name = rr.name
);

-- ============================================
-- 3. ROLE_PERMISSIONS (map permissions to roles by name)
-- ============================================
WITH role_perms(role_name, perm_name) AS (
  VALUES
    ('Executive Housekeeper','view_dashboard'),('Executive Housekeeper','view_rooms'),('Executive Housekeeper','assign_rooms'),('Executive Housekeeper','update_room_status'),('Executive Housekeeper','create_ticket'),('Executive Housekeeper','close_ticket'),('Executive Housekeeper','bill_consumption'),('Executive Housekeeper','update_lost_found'),('Executive Housekeeper','view_room_history'),('Executive Housekeeper','send_message'),('Executive Housekeeper','view_chats'),
    ('Housekeeping Manager','view_rooms'),('Housekeeping Manager','assign_rooms'),('Housekeeping Manager','update_room_status'),('Housekeeping Manager','create_ticket'),('Housekeeping Manager','update_ticket'),('Housekeeping Manager','bill_consumption'),('Housekeeping Manager','update_lost_found'),('Housekeeping Manager','view_room_history'),('Housekeeping Manager','send_message'),('Housekeeping Manager','view_chats'),
    ('Assistant Housekeeping Manager','view_rooms'),('Assistant Housekeeping Manager','assign_rooms'),('Assistant Housekeeping Manager','update_room_status'),('Assistant Housekeeping Manager','create_ticket'),('Assistant Housekeeping Manager','update_ticket'),('Assistant Housekeeping Manager','update_lost_found'),('Assistant Housekeeping Manager','view_room_history'),('Assistant Housekeeping Manager','send_message'),('Assistant Housekeeping Manager','view_chats'),
    ('Senior Supervisor','view_rooms'),('Senior Supervisor','assign_rooms'),('Senior Supervisor','update_room_status'),('Senior Supervisor','create_ticket'),('Senior Supervisor','update_ticket'),('Senior Supervisor','view_room_history'),('Senior Supervisor','send_message'),('Senior Supervisor','view_chats'),
    ('Supervisor','view_rooms'),('Supervisor','assign_rooms'),('Supervisor','update_room_status'),('Supervisor','create_ticket'),('Supervisor','update_ticket'),('Supervisor','send_message'),('Supervisor','view_chats'),
    ('Coordinator','view_rooms'),('Coordinator','assign_rooms'),('Coordinator','send_message'),('Coordinator','view_chats'),
    ('Housekeeping Room Attendant','view_rooms'),('Housekeeping Room Attendant','update_room_status'),('Housekeeping Room Attendant','record_consumption'),('Housekeeping Room Attendant','report_lost_found'),('Housekeeping Room Attendant','send_message'),('Housekeeping Room Attendant','view_chats'),
    ('Housekeeping Portier / Houseman','view_rooms'),('Housekeeping Portier / Houseman','update_room_status'),('Housekeeping Portier / Houseman','send_message'),('Housekeeping Portier / Houseman','view_chats'),
    ('Housekeeping Laundry Attendant','view_rooms'),('Housekeeping Laundry Attendant','record_consumption'),('Housekeeping Laundry Attendant','send_message'),('Housekeeping Laundry Attendant','view_chats'),
    ('Housekeeping Public Area Attendant','view_rooms'),('Housekeeping Public Area Attendant','update_room_status'),('Housekeeping Public Area Attendant','send_message'),('Housekeeping Public Area Attendant','view_chats'),
    ('Director of Rooms','view_dashboard'),('Director of Rooms','view_rooms'),('Director of Rooms','assign_rooms'),('Director of Rooms','view_reservations'),('Director of Rooms','close_ticket'),('Director of Rooms','bill_consumption'),('Director of Rooms','view_room_history'),('Director of Rooms','send_message'),('Director of Rooms','view_chats'),
    ('Assistant Director of Rooms','view_rooms'),('Assistant Director of Rooms','assign_rooms'),('Assistant Director of Rooms','view_reservations'),('Assistant Director of Rooms','update_ticket'),('Assistant Director of Rooms','view_room_history'),('Assistant Director of Rooms','send_message'),('Assistant Director of Rooms','view_chats'),
    ('Director of Front Office','view_dashboard'),('Director of Front Office','view_rooms'),('Director of Front Office','view_reservations'),('Director of Front Office','create_ticket'),('Director of Front Office','close_ticket'),('Director of Front Office','bill_consumption'),('Director of Front Office','view_room_history'),('Director of Front Office','send_message'),('Director of Front Office','view_chats'),
    ('Front Office Manager','view_rooms'),('Front Office Manager','view_reservations'),('Front Office Manager','create_ticket'),('Front Office Manager','update_ticket'),('Front Office Manager','bill_consumption'),('Front Office Manager','send_message'),('Front Office Manager','view_chats'),
    ('Front Office Supervisor','view_rooms'),('Front Office Supervisor','view_reservations'),('Front Office Supervisor','create_ticket'),('Front Office Supervisor','update_ticket'),('Front Office Supervisor','send_message'),('Front Office Supervisor','view_chats'),
    ('Front Office Agent','view_rooms'),('Front Office Agent','view_reservations'),('Front Office Agent','create_ticket'),('Front Office Agent','record_consumption'),('Front Office Agent','send_message'),('Front Office Agent','view_chats'),
    ('Front Office Trainee','view_rooms'),('Front Office Trainee','view_reservations'),('Front Office Trainee','send_message'),('Front Office Trainee','view_chats'),
    ('Night Manager','view_dashboard'),('Night Manager','view_rooms'),('Night Manager','view_reservations'),('Night Manager','close_ticket'),('Night Manager','bill_consumption'),('Night Manager','view_room_history'),('Night Manager','send_message'),('Night Manager','view_chats'),
    ('Night Auditor','view_rooms'),('Night Auditor','view_reservations'),('Night Auditor','bill_consumption'),('Night Auditor','send_message'),('Night Auditor','view_chats'),
    ('Night Agent','view_rooms'),('Night Agent','create_ticket'),('Night Agent','send_message'),('Night Agent','view_chats'),
    ('Director of Engineering','view_dashboard'),('Director of Engineering','view_rooms'),('Director of Engineering','update_ticket'),('Director of Engineering','close_ticket'),('Director of Engineering','view_room_history'),('Director of Engineering','send_message'),('Director of Engineering','view_chats'),
    ('Engineering Supervisor','view_rooms'),('Engineering Supervisor','update_ticket'),('Engineering Supervisor','close_ticket'),('Engineering Supervisor','send_message'),('Engineering Supervisor','view_chats'),
    ('Shift Engineer','view_rooms'),('Shift Engineer','update_ticket'),('Shift Engineer','send_message'),('Shift Engineer','view_chats'),
    ('IT Manager','view_dashboard'),('IT Manager','manage_users'),('IT Manager','manage_roles'),('IT Manager','system_settings'),('IT Manager','send_message'),('IT Manager','view_chats'),
    ('General Manager','view_dashboard'),('General Manager','manage_users'),('General Manager','manage_roles'),('General Manager','view_rooms'),('General Manager','view_reservations'),('General Manager','close_ticket'),('General Manager','bill_consumption'),('General Manager','system_settings'),('General Manager','view_room_history'),('General Manager','send_message'),('General Manager','view_chats'),
    ('Hotel Manager','view_dashboard'),('Hotel Manager','view_rooms'),('Hotel Manager','view_reservations'),('Hotel Manager','close_ticket'),('Hotel Manager','bill_consumption'),('Hotel Manager','view_room_history'),('Hotel Manager','send_message'),('Hotel Manager','view_chats')
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM role_perms rp
JOIN public.roles r ON r.name = rp.role_name
JOIN public.permissions p ON p.name = rp.perm_name
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- 4. DEPARTMENTS (extracted from users)
-- ============================================
WITH dept_rows(name, description) AS (
  VALUES
    ('Management', 'Hotel management'),
    ('Housekeeping', 'Room cleaning and maintenance'),
    ('Rooms Division', 'Rooms and guest services'),
    ('Front Office', 'Guest check-in and reservations'),
    ('Night Team', 'Night shift operations'),
    ('Engineering', 'Maintenance and repairs'),
    ('Information Technology', 'IT systems and support')
)
INSERT INTO public.departments (name, description)
SELECT dr.name, dr.description
FROM dept_rows dr
WHERE NOT EXISTS (
  SELECT 1 FROM public.departments d WHERE d.name = dr.name
);

-- ============================================
-- 5. SHIFTS
-- ============================================
-- Hotel-scoped: seed shifts for every hotel
DO $$
BEGIN
  -- Only run when tenant schema exists (shifts.hotel_id + hotels table).
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='shifts' AND column_name='hotel_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='hotels'
  ) THEN
    WITH shift_rows(name, start_time, end_time) AS (
      VALUES
        ('AM', '06:00'::time, '14:00'::time),
        ('PM', '14:00'::time, '22:00'::time),
        ('Night', '22:00'::time, '06:00'::time)
    )
    INSERT INTO public.shifts (hotel_id, name, start_time, end_time)
    SELECT h.id AS hotel_id, sr.name, sr.start_time, sr.end_time
    FROM public.hotels h
    CROSS JOIN shift_rows sr
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.shifts s
      WHERE s.hotel_id = h.id
        AND s.name ILIKE sr.name
    );
  END IF;
END $$;

-- ============================================
-- 6. CONSUMABLES
-- ============================================
-- Hotel-scoped: seed consumables for every hotel
DO $$
BEGIN
  -- Only run when tenant schema exists (consumables.hotel_id + hotels table).
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='consumables' AND column_name='hotel_id'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='hotels'
  ) THEN
    WITH consumable_rows(name, category, unit_price, billable) AS (
      VALUES
        ('Mini Bar - Water', 'mini_bar', 5.00::numeric, true),
        ('Mini Bar - Coke', 'mini_bar', 4.00::numeric, true),
        ('Laundry - Shirt', 'laundry', 8.00::numeric, true),
        ('Towels - Extra', 'towels', 0::numeric, false)
    )
    INSERT INTO public.consumables (hotel_id, name, category, unit_price, billable)
    SELECT h.id AS hotel_id, cr.name, cr.category, cr.unit_price, cr.billable
    FROM public.hotels h
    CROSS JOIN consumable_rows cr
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.consumables c
      WHERE c.hotel_id = h.id
        AND c.name = cr.name
        AND c.category = cr.category
    );
  END IF;
END $$;

-- ============================================
-- 7. USERS (SYNC auth.users -> public.users)
-- ============================================
-- This DOES NOT create auth users (those must be created via Supabase Auth signup/invite or dashboard).
-- It ensures every existing authenticated user has a corresponding row in `public.users`,
-- which the app uses for staff lists, assignments, notes, etc.
DO $$
BEGIN
  -- Ensure Default Hotel exists for fallback (tenant schema).
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'hotels'
  ) THEN
    INSERT INTO public.hotels (name)
    VALUES ('Default Hotel')
    ON CONFLICT (name) DO NOTHING;
  END IF;

  -- Tenant schema (users.hotel_id exists)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'hotel_id'
  ) THEN
    INSERT INTO public.users (id, full_name, avatar_url, hotel_id)
    SELECT
      au.id,
      COALESCE(
        NULLIF(au.raw_user_meta_data->>'full_name', ''),
        NULLIF(au.raw_user_meta_data->>'name', ''),
        au.email,
        split_part(COALESCE(au.email, 'user'), '@', 1),
        'User'
      ) AS full_name,
      NULLIF(au.raw_user_meta_data->>'avatar_url', '') AS avatar_url,
      COALESCE(
        NULLIF(au.raw_user_meta_data->>'hotel_id', '')::uuid,
        (SELECT id FROM public.hotels WHERE name = 'Default Hotel' LIMIT 1)
      ) AS hotel_id
    FROM auth.users au
    ON CONFLICT (id) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      hotel_id = COALESCE(public.users.hotel_id, EXCLUDED.hotel_id);
  ELSE
    -- Legacy schema (users table without hotel_id)
    INSERT INTO public.users (id, full_name, avatar_url)
    SELECT
      au.id,
      COALESCE(
        NULLIF(au.raw_user_meta_data->>'full_name', ''),
        NULLIF(au.raw_user_meta_data->>'name', ''),
        au.email,
        split_part(COALESCE(au.email, 'user'), '@', 1),
        'User'
      ) AS full_name,
      NULLIF(au.raw_user_meta_data->>'avatar_url', '') AS avatar_url
    FROM auth.users au
    ON CONFLICT (id) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url;
  END IF;
END $$;
