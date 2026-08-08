-- Optional absolute due time for tickets (Change Status → Due time in app).
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tickets.due_at IS 'When the ticket should be completed (optional).';
