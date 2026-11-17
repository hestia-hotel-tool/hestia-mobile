-- The Laundry Attendant gets its own Rooms layout, `laundry`.
--
-- Until now the title read `attendant`, which narrows the list to the rooms
-- assigned to the reader. Rooms are only ever assigned to Room Attendants
-- (`fetchRoomAttendants`), so a laundry attendant's list was always empty. They
-- need every room on the shift that is on now, read-only: which rooms are
-- departures, linen stayovers and arrivals, and how many guests are in each.
--
-- Presentation only: rights and role_permissions are unchanged. The role
-- already holds no `rooms.status.update` and no `rooms.reassign`.
--
-- The base schema (20260902000000) lists the value too, so a fresh install
-- accepts the seed; this delta is for databases that already ran it.

BEGIN;

ALTER TABLE public.job_titles
  DROP CONSTRAINT IF EXISTS job_titles_rooms_variant_check;
ALTER TABLE public.job_titles
  ADD CONSTRAINT job_titles_rooms_variant_check
  CHECK (rooms_variant IN ('default', 'leadership', 'supervisor', 'attendant', 'front_office', 'laundry'));

UPDATE public.job_titles
   SET rooms_variant = 'laundry'
 WHERE key = 'housekeeping_laundry_attendant'
   AND rooms_variant IS DISTINCT FROM 'laundry';

COMMIT;
