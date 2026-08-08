-- Add housekeeping and reservation fields for room-card / operational data
-- Supports data from mockAllRoomsData (room status, promised time per reservation)

-- Rooms: current housekeeping state (Dirty, InProgress, Cleaned, Inspected)
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS house_keeping_status TEXT;

-- Reservations: promised ready time (e.g. 12:00, 13:00) when set by front office
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS promised_time TIME;

-- Index for filtering rooms by housekeeping status
CREATE INDEX IF NOT EXISTS idx_rooms_house_keeping_status ON rooms(house_keeping_status);
