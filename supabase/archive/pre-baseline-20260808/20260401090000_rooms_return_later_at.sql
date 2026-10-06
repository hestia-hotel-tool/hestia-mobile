-- Add "Return later" persistence for rooms.
-- Stored as an absolute timestamp (timestamptz) so clients can compute remaining time.

alter table public.rooms
add column if not exists return_later_at timestamptz null;

comment on column public.rooms.return_later_at is 'When housekeeping should return to this room (Return Later).';

