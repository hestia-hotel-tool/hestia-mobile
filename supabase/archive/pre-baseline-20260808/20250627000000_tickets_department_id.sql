-- Add department_id to tickets so we know which department the ticket is for
-- and can tag staff from that department.
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

COMMENT ON COLUMN tickets.department_id IS 'Department the ticket is assigned to; staff tagging is limited to this department.';
