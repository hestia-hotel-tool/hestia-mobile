-- Hestia PMS - Initial Schema
-- Run this migration in Supabase SQL Editor or via Supabase CLI

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. DEPARTMENTS
-- ============================================
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ROLES
-- ============================================
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. PERMISSIONS
-- ============================================
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction: Roles <-> Permissions (many-to-many)
CREATE TABLE role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ============================================
-- 4. USERS (STAFF) - links to auth.users
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. ROOMS
-- ============================================
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_number TEXT NOT NULL UNIQUE,
  category TEXT, -- e.g. standard, suite, deluxe
  credit INTEGER DEFAULT 0,
  linen_status TEXT,
  priority TEXT, -- e.g. high, normal, low
  flagged BOOLEAN DEFAULT FALSE,
  special_instructions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. SHIFTS
-- ============================================
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL, -- AM, PM, Night
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. GUESTS
-- ============================================
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  vip_code TEXT,
  address TEXT,
  company TEXT,
  primary_email TEXT,
  dob DATE,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. RESERVATIONS
-- ============================================
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  arrival_date DATE NOT NULL,
  departure_date DATE NOT NULL,
  eta TIME, -- Estimated time of arrival
  adults INTEGER DEFAULT 0,
  kids INTEGER DEFAULT 0,
  reservation_status TEXT, -- e.g. confirmed, checked_in, checked_out
  front_office_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction: Reservations <-> Guests (many-to-many)
CREATE TABLE reservation_guests (
  reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  PRIMARY KEY (reservation_id, guest_id)
);

-- ============================================
-- 7. ROOM ASSIGNMENTS
-- ============================================
CREATE TABLE room_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  work_status TEXT, -- e.g. in_progress, completed, paused, refused
  pause_reason TEXT,
  refuse_reason TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 11. CONSUMABLES
-- ============================================
CREATE TABLE consumables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT, -- mini_bar, laundry, towels, etc.
  unit_price DECIMAL(10, 2) DEFAULT 0,
  billable BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 10. TICKETS
-- ============================================
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT, -- maintenance, guest_request, etc.
  priority TEXT, -- low, normal, high
  status TEXT NOT NULL, -- open, in_progress, resolved
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  room_assignment_id UUID REFERENCES room_assignments(id) ON DELETE SET NULL,
  created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- ============================================
-- 12. CONSUMPTIONS
-- ============================================
CREATE TABLE consumptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  consumable_id UUID NOT NULL REFERENCES consumables(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2),
  total_amount DECIMAL(10, 2),
  status TEXT DEFAULT 'pending',
  reported_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consumed_at TIMESTAMPTZ DEFAULT NOW(),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 13. LOST & FOUND ITEMS
-- ============================================
CREATE TABLE lost_and_found_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name TEXT NOT NULL,
  description TEXT,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  found_location TEXT,
  found_at TIMESTAMPTZ DEFAULT NOW(),
  found_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT, -- e.g. stored, returned
  storage_location TEXT,
  return_info TEXT,
  notes TEXT,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 14. CHATS
-- ============================================
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- direct, group, room
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 15. CHAT PARTICIPANTS
-- ============================================
CREATE TABLE chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

-- ============================================
-- 16. MESSAGES
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'text', -- text, image, system
  content TEXT,
  room_assignment_id UUID REFERENCES room_assignments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 17. ROOM HISTORY
-- ============================================
CREATE TABLE room_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_id UUID, -- polymorphic: ticket_id, consumption_id, etc.
  description TEXT,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES for common queries
-- ============================================
CREATE INDEX idx_users_department ON users(department_id);
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_rooms_room_number ON rooms(room_number);
CREATE INDEX idx_rooms_flagged ON rooms(flagged);
CREATE INDEX idx_reservations_room ON reservations(room_id);
CREATE INDEX idx_reservations_dates ON reservations(arrival_date, departure_date);
CREATE INDEX idx_room_assignments_room ON room_assignments(room_id);
CREATE INDEX idx_room_assignments_user ON room_assignments(user_id);
CREATE INDEX idx_room_assignments_shift ON room_assignments(shift_id);
CREATE INDEX idx_tickets_room ON tickets(room_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_consumptions_room ON consumptions(room_id);
CREATE INDEX idx_consumptions_reservation ON consumptions(reservation_id);
CREATE INDEX idx_lost_and_found_room ON lost_and_found_items(room_id);
CREATE INDEX idx_chat_participants_chat ON chat_participants(chat_id);
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_room_history_room ON room_history(room_id);
CREATE INDEX idx_room_history_created ON room_history(created_at DESC);

-- ============================================
-- UPDATED_AT trigger helper
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_room_assignments_updated_at BEFORE UPDATE ON room_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_consumables_updated_at BEFORE UPDATE ON consumables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lost_and_found_updated_at BEFORE UPDATE ON lost_and_found_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
