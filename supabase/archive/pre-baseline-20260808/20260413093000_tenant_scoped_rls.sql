-- Multi-tenant: tenant helper + tenant-scoped RLS

-- 1) Helper: derive current user's hotel_id from public.users
CREATE OR REPLACE FUNCTION public.auth_hotel_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.hotel_id
  FROM public.users u
  WHERE u.id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.auth_hotel_id() TO authenticated;

-- 2) Tenant-scoped policies
-- NOTE: We keep notifications/user_push_tokens scoped by auth.uid() as-is.

-- Users: only see staff in your hotel; only update yourself (already enforced) + stay in hotel.
DROP POLICY IF EXISTS "Users can read all users" ON public.users;
DROP POLICY IF EXISTS "Users can read users in same hotel" ON public.users;
CREATE POLICY "Users can read users in same hotel" ON public.users
  FOR SELECT TO authenticated
  USING (hotel_id = public.auth_hotel_id());

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id AND hotel_id = public.auth_hotel_id())
  WITH CHECK (auth.uid() = id AND hotel_id = public.auth_hotel_id());

-- Helper macro pattern: hotel-owned tables should match auth_hotel_id()
-- Rooms
DROP POLICY IF EXISTS "Authenticated users can manage rooms" ON public.rooms;
DROP POLICY IF EXISTS "Hotel users can manage rooms" ON public.rooms;
CREATE POLICY "Hotel users can manage rooms" ON public.rooms
  FOR ALL TO authenticated
  USING (hotel_id = public.auth_hotel_id())
  WITH CHECK (hotel_id = public.auth_hotel_id());

-- Shifts
DROP POLICY IF EXISTS "Authenticated users can read shifts" ON public.shifts;
DROP POLICY IF EXISTS "Hotel users can read shifts" ON public.shifts;
CREATE POLICY "Hotel users can read shifts" ON public.shifts
  FOR SELECT TO authenticated
  USING (hotel_id = public.auth_hotel_id());

-- Guests
DROP POLICY IF EXISTS "Authenticated users can manage guests" ON public.guests;
DROP POLICY IF EXISTS "Hotel users can manage guests" ON public.guests;
CREATE POLICY "Hotel users can manage guests" ON public.guests
  FOR ALL TO authenticated
  USING (hotel_id = public.auth_hotel_id())
  WITH CHECK (hotel_id = public.auth_hotel_id());

-- Reservations
DROP POLICY IF EXISTS "Authenticated users can manage reservations" ON public.reservations;
DROP POLICY IF EXISTS "Hotel users can manage reservations" ON public.reservations;
CREATE POLICY "Hotel users can manage reservations" ON public.reservations
  FOR ALL TO authenticated
  USING (hotel_id = public.auth_hotel_id())
  WITH CHECK (hotel_id = public.auth_hotel_id());

-- Reservation guests
DROP POLICY IF EXISTS "Authenticated users can manage reservation_guests" ON public.reservation_guests;
DROP POLICY IF EXISTS "Hotel users can manage reservation_guests" ON public.reservation_guests;
CREATE POLICY "Hotel users can manage reservation_guests" ON public.reservation_guests
  FOR ALL TO authenticated
  USING (hotel_id = public.auth_hotel_id())
  WITH CHECK (hotel_id = public.auth_hotel_id());

-- Room assignments
DROP POLICY IF EXISTS "Authenticated users can manage room_assignments" ON public.room_assignments;
DROP POLICY IF EXISTS "Hotel users can manage room_assignments" ON public.room_assignments;
CREATE POLICY "Hotel users can manage room_assignments" ON public.room_assignments
  FOR ALL TO authenticated
  USING (hotel_id = public.auth_hotel_id())
  WITH CHECK (hotel_id = public.auth_hotel_id());

DROP POLICY IF EXISTS "Anon can manage room_assignments" ON public.room_assignments;

-- Consumables (read-only in initial policies; keep read, tenant-scoped)
DROP POLICY IF EXISTS "Authenticated users can read consumables" ON public.consumables;
DROP POLICY IF EXISTS "Hotel users can read consumables" ON public.consumables;
CREATE POLICY "Hotel users can read consumables" ON public.consumables
  FOR SELECT TO authenticated
  USING (hotel_id = public.auth_hotel_id());

-- Tickets
DROP POLICY IF EXISTS "Authenticated users can manage tickets" ON public.tickets;
DROP POLICY IF EXISTS "Hotel users can manage tickets" ON public.tickets;
CREATE POLICY "Hotel users can manage tickets" ON public.tickets
  FOR ALL TO authenticated
  USING (hotel_id = public.auth_hotel_id())
  WITH CHECK (hotel_id = public.auth_hotel_id());

-- Consumptions
DROP POLICY IF EXISTS "Authenticated users can manage consumptions" ON public.consumptions;
DROP POLICY IF EXISTS "Hotel users can manage consumptions" ON public.consumptions;
CREATE POLICY "Hotel users can manage consumptions" ON public.consumptions
  FOR ALL TO authenticated
  USING (hotel_id = public.auth_hotel_id())
  WITH CHECK (hotel_id = public.auth_hotel_id());

-- Lost & found
DROP POLICY IF EXISTS "Authenticated users can manage lost_and_found" ON public.lost_and_found_items;
DROP POLICY IF EXISTS "Hotel users can manage lost_and_found" ON public.lost_and_found_items;
CREATE POLICY "Hotel users can manage lost_and_found" ON public.lost_and_found_items
  FOR ALL TO authenticated
  USING (hotel_id = public.auth_hotel_id())
  WITH CHECK (hotel_id = public.auth_hotel_id());

-- Chats
DROP POLICY IF EXISTS "Authenticated users can manage chats" ON public.chats;
DROP POLICY IF EXISTS "Hotel users can manage chats" ON public.chats;
CREATE POLICY "Hotel users can manage chats" ON public.chats
  FOR ALL TO authenticated
  USING (hotel_id = public.auth_hotel_id())
  WITH CHECK (hotel_id = public.auth_hotel_id());

-- Chat participants: enforce tenant isolation regardless of other participant policies.
DROP POLICY IF EXISTS "Tenant isolation for chat_participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Tenant isolation for chat_participants" ON public.chat_participants;
CREATE POLICY "Tenant isolation for chat_participants" ON public.chat_participants
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (hotel_id = public.auth_hotel_id())
  WITH CHECK (hotel_id = public.auth_hotel_id());

-- Messages
DROP POLICY IF EXISTS "Authenticated users can manage messages" ON public.messages;
DROP POLICY IF EXISTS "Hotel users can manage messages" ON public.messages;
CREATE POLICY "Hotel users can manage messages" ON public.messages
  FOR ALL TO authenticated
  USING (hotel_id = public.auth_hotel_id())
  WITH CHECK (hotel_id = public.auth_hotel_id());

-- Messages: enforce tenant isolation regardless of other message policies.
DROP POLICY IF EXISTS "Tenant isolation for messages" ON public.messages;
DROP POLICY IF EXISTS "Tenant isolation for messages" ON public.messages;
CREATE POLICY "Tenant isolation for messages" ON public.messages
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (hotel_id = public.auth_hotel_id())
  WITH CHECK (hotel_id = public.auth_hotel_id());

-- Chats: enforce tenant isolation regardless of other chat policies.
DROP POLICY IF EXISTS "Tenant isolation for chats" ON public.chats;
DROP POLICY IF EXISTS "Tenant isolation for chats" ON public.chats;
CREATE POLICY "Tenant isolation for chats" ON public.chats
  AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (hotel_id = public.auth_hotel_id())
  WITH CHECK (hotel_id = public.auth_hotel_id());

-- Room history
DROP POLICY IF EXISTS "Authenticated users can read room_history" ON public.room_history;
DROP POLICY IF EXISTS "Authenticated users can insert room_history" ON public.room_history;
DROP POLICY IF EXISTS "Hotel users can read room_history" ON public.room_history;
DROP POLICY IF EXISTS "Hotel users can insert room_history" ON public.room_history;
CREATE POLICY "Hotel users can read room_history" ON public.room_history
  FOR SELECT TO authenticated
  USING (hotel_id = public.auth_hotel_id());
CREATE POLICY "Hotel users can insert room_history" ON public.room_history
  FOR INSERT TO authenticated
  WITH CHECK (hotel_id = public.auth_hotel_id());

-- Room notes: replace permissive read with tenant-scoped; keep ownership restrictions for update/delete.
DROP POLICY IF EXISTS "Authenticated users can read room_notes" ON public.room_notes;
DROP POLICY IF EXISTS "Hotel users can read room_notes" ON public.room_notes;
CREATE POLICY "Hotel users can read room_notes" ON public.room_notes
  FOR SELECT TO authenticated
  USING (hotel_id = public.auth_hotel_id());

DROP POLICY IF EXISTS "Authenticated users can insert room_notes" ON public.room_notes;
DROP POLICY IF EXISTS "Hotel users can insert room_notes" ON public.room_notes;
CREATE POLICY "Hotel users can insert room_notes" ON public.room_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    hotel_id = public.auth_hotel_id()
    AND (auth.uid() = created_by_id OR created_by_id IS NULL)
  );

DROP POLICY IF EXISTS "Authenticated users can update own room_notes" ON public.room_notes;
DROP POLICY IF EXISTS "Hotel users can update own room_notes" ON public.room_notes;
CREATE POLICY "Hotel users can update own room_notes" ON public.room_notes
  FOR UPDATE TO authenticated
  USING (hotel_id = public.auth_hotel_id() AND auth.uid() = created_by_id)
  WITH CHECK (hotel_id = public.auth_hotel_id() AND auth.uid() = created_by_id);

DROP POLICY IF EXISTS "Authenticated users can delete own room_notes" ON public.room_notes;
DROP POLICY IF EXISTS "Hotel users can delete own room_notes" ON public.room_notes;
CREATE POLICY "Hotel users can delete own room_notes" ON public.room_notes
  FOR DELETE TO authenticated
  USING (hotel_id = public.auth_hotel_id() AND auth.uid() = created_by_id);

-- Ticket tags: replace permissive policies with tenant-scoped.
DROP POLICY IF EXISTS "Users can read ticket tags for tickets they can read" ON public.ticket_tags;
DROP POLICY IF EXISTS "Authenticated users can tag staff on tickets" ON public.ticket_tags;
DROP POLICY IF EXISTS "Hotel users can read ticket tags" ON public.ticket_tags;
DROP POLICY IF EXISTS "Hotel users can tag staff on tickets" ON public.ticket_tags;
CREATE POLICY "Hotel users can read ticket tags" ON public.ticket_tags
  FOR SELECT TO authenticated
  USING (hotel_id = public.auth_hotel_id());
CREATE POLICY "Hotel users can tag staff on tickets" ON public.ticket_tags
  FOR INSERT TO authenticated
  WITH CHECK (hotel_id = public.auth_hotel_id() AND tagged_by_id = auth.uid());

-- Activity logs: tenant scoped
DROP POLICY IF EXISTS "Authenticated users can read activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can insert activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Hotel users can read activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Hotel users can insert activity_logs" ON public.activity_logs;
CREATE POLICY "Hotel users can read activity_logs" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (hotel_id = public.auth_hotel_id());
CREATE POLICY "Hotel users can insert activity_logs" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (hotel_id = public.auth_hotel_id());

