-- Room reports: which checklist a report came from.
--
-- `room_cleaning_reports` (20260929000700) was written by the Clean Checklist
-- only. The Inspection Checklist (Figma 2702-1025) files the same shape —
-- ticks, optional photos and a note — when a supervisor marks a room
-- Inspected, so the row says which of the two it is.

ALTER TABLE public.room_cleaning_reports
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'clean';

ALTER TABLE public.room_cleaning_reports
  DROP CONSTRAINT IF EXISTS room_cleaning_reports_kind_check;
ALTER TABLE public.room_cleaning_reports
  ADD CONSTRAINT room_cleaning_reports_kind_check CHECK (kind IN ('clean', 'inspection'));

COMMENT ON COLUMN public.room_cleaning_reports.kind IS 'clean: the attendant''s Clean Checklist; inspection: the supervisor''s Inspection Checklist.';
