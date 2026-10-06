-- Assign role_id and department_id to users by email
-- Inserts missing roles and departments, then updates public.users

-- 1. Insert missing roles (ON CONFLICT or unique name check)
INSERT INTO public.roles (name, description)
SELECT r.role_name, NULL
FROM (VALUES
  ('General Manager'),
  ('Hotel Manager'),
  ('Executive Housekeeper'),
  ('Housekeeping Manager'),
  ('Assistant Housekeeping Manager'),
  ('Senior Supervisor'),
  ('Supervisor'),
  ('Coordinator'),
  ('Housekeeping Room Attendant'),
  ('Housekeeping Portier / Houseman'),
  ('Housekeeping Laundry Attendant'),
  ('Housekeeping Public Area Attendant'),
  ('Director of Rooms'),
  ('Assistant Director of Rooms'),
  ('Director of Front Office'),
  ('Front Office Manager'),
  ('Front Office Supervisor'),
  ('Front Office Agent'),
  ('Front Office Trainee'),
  ('Night Manager'),
  ('Night Auditor'),
  ('Night Agent'),
  ('Director of Engineering'),
  ('Engineering Supervisor'),
  ('Shift Engineer'),
  ('IT Administrator')
) AS r(role_name)
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = r.role_name);

-- 2. Insert missing departments (ON CONFLICT or existence check)
INSERT INTO public.departments (name, description)
SELECT d.dept_name, NULL
FROM (VALUES
  ('Executive Addministration'),
  ('Hsk Portier'),
  ('Laundary'),
  ('Reception'),
  ('Font Office'),
  ('Engineering'),
  ('IT')
) AS d(dept_name)
WHERE NOT EXISTS (SELECT 1 FROM public.departments WHERE name = d.dept_name);

-- 3. Update users with role_id and department_id by email
WITH user_assignments AS (
  SELECT * FROM (VALUES
    ('wallace@hestia.ch'::text, 'General Manager'::text, 'Executive Addministration'::text),
    ('stella@hestia.ch'::text, 'Hotel Manager'::text, 'Executive Addministration'::text),
    ('henry@hestia.ch'::text, 'Executive Housekeeper'::text, 'Hsk Portier'::text),
    ('gio@hestia.ch'::text, 'Housekeeping Manager'::text, 'Hsk Portier'::text),
    ('leon@hestia.ch'::text, 'Assistant Housekeeping Manager'::text, 'Hsk Portier'::text),
    ('etleva@hestia.ch'::text, 'Senior Supervisor'::text, 'Hsk Portier'::text),
    ('alex@hestia.ch'::text, 'Supervisor'::text, 'Hsk Portier'::text),
    ('maria@hestia.ch'::text, 'Coordinator'::text, 'Hsk Portier'::text),
    ('zoe@hestia.ch'::text, 'Housekeeping Room Attendant'::text, 'Hsk Portier'::text),
    ('jordan@hestia.ch'::text, 'Housekeeping Portier / Houseman'::text, 'Hsk Portier'::text),
    ('sam@hestia.ch'::text, 'Housekeeping Laundry Attendant'::text, 'Laundary'::text),
    ('taylor@hestia.ch'::text, 'Housekeeping Public Area Attendant'::text, 'Hsk Portier'::text),
    ('chris@hestia.ch'::text, 'Director of Rooms'::text, 'Reception'::text),
    ('morgan@hestia.ch'::text, 'Assistant Director of Rooms'::text, 'Reception'::text),
    ('chi@hestia.ch'::text, 'Director of Front Office'::text, 'Font Office'::text),
    ('alexm@hestia.ch'::text, 'Front Office Manager'::text, 'Font Office'::text),
    ('sofia@hestia.ch'::text, 'Front Office Supervisor'::text, 'Font Office'::text),
    ('noah@hestia.ch'::text, 'Front Office Agent'::text, 'Reception'::text),
    ('emma@hestia.ch'::text, 'Front Office Trainee'::text, 'Reception'::text),
    ('lucas@hestia.ch'::text, 'Night Manager'::text, 'Reception'::text),
    ('nina@hestia.ch'::text, 'Night Auditor'::text, 'Reception'::text),
    ('paul@hestia.ch'::text, 'Night Agent'::text, 'Reception'::text),
    ('david@hestia.ch'::text, 'Director of Engineering'::text, 'Engineering'::text),
    ('marco@hestia.ch'::text, 'Engineering Supervisor'::text, 'Engineering'::text),
    ('ivan@hestia.ch'::text, 'Shift Engineer'::text, 'Engineering'::text),
    ('brian@hestia.ch'::text, 'IT Administrator'::text, 'IT'::text)
  ) AS t(email, role_name, department_name)
)
UPDATE public.users u
SET
  role_id = r.id,
  department_id = d.id,
  updated_at = NOW()
FROM user_assignments ua
JOIN auth.users au ON au.email = ua.email
JOIN public.roles r ON r.name = ua.role_name
JOIN public.departments d ON d.name = ua.department_name
WHERE u.id = au.id;