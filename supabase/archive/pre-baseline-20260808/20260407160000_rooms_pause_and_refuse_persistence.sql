-- Persist Pause + Refuse Service room times/reasons.
-- Return Later is already persisted via `rooms.return_later_at`.

alter table public.rooms
  add column if not exists paused_at timestamptz null,
  add column if not exists refuse_service_at timestamptz null,
  add column if not exists refuse_service_reason text null;

comment on column public.rooms.paused_at is 'When housekeeping paused this room (Pause status).';
comment on column public.rooms.refuse_service_at is 'When housekeeping refused service for this room.';
comment on column public.rooms.refuse_service_reason is 'Reason for refusing service (free text).';

