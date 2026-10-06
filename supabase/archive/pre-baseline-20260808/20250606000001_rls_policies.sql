-- Hestia PMS - Row Level Security (RLS) Policies
-- Enable RLS on all tables and add basic policies

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lost_and_found_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_history ENABLE ROW LEVEL SECURITY;

-- POLICIES: Allow authenticated users to read/write (customize per your needs)
-- For production, add role-based policies using user's role_id from users table.

-- Departments: read for all authenticated
CREATE POLICY "Authenticated users can read departments" ON departments
  FOR SELECT TO authenticated USING (true);

-- Roles: read for all authenticated
CREATE POLICY "Authenticated users can read roles" ON roles
  FOR SELECT TO authenticated USING (true);

-- Permissions: read for all authenticated
CREATE POLICY "Authenticated users can read permissions" ON permissions
  FOR SELECT TO authenticated USING (true);

-- Role permissions: read for all authenticated
CREATE POLICY "Authenticated users can read role_permissions" ON role_permissions
  FOR SELECT TO authenticated USING (true);

-- Users: users can read their own profile, read others for staff list
CREATE POLICY "Users can read all users" ON users
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Rooms: read/write for authenticated
CREATE POLICY "Authenticated users can manage rooms" ON rooms
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Shifts: read for authenticated
CREATE POLICY "Authenticated users can read shifts" ON shifts
  FOR SELECT TO authenticated USING (true);

-- Guests: read/write for authenticated
CREATE POLICY "Authenticated users can manage guests" ON guests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Reservations: read/write for authenticated
CREATE POLICY "Authenticated users can manage reservations" ON reservations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Reservation guests: read/write for authenticated
CREATE POLICY "Authenticated users can manage reservation_guests" ON reservation_guests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Room assignments: read/write for authenticated
CREATE POLICY "Authenticated users can manage room_assignments" ON room_assignments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Consumables: read for authenticated
CREATE POLICY "Authenticated users can read consumables" ON consumables
  FOR SELECT TO authenticated USING (true);

-- Tickets: read/write for authenticated
CREATE POLICY "Authenticated users can manage tickets" ON tickets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Consumptions: read/write for authenticated
CREATE POLICY "Authenticated users can manage consumptions" ON consumptions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Lost & found: read/write for authenticated
CREATE POLICY "Authenticated users can manage lost_and_found" ON lost_and_found_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Chats: read/write for authenticated
CREATE POLICY "Authenticated users can manage chats" ON chats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Chat participants: read/write for authenticated
CREATE POLICY "Authenticated users can manage chat_participants" ON chat_participants
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Messages: read/write for authenticated
CREATE POLICY "Authenticated users can manage messages" ON messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Room history: read for authenticated (typically insert-only via triggers)
CREATE POLICY "Authenticated users can read room_history" ON room_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert room_history" ON room_history
  FOR INSERT TO authenticated WITH CHECK (true);
