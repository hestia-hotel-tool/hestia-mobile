-- Breaks: the rules per shift, and staff taking them.
--
--   shift_breaks  what a shift allows — "Lunch, 30 min, between 11:00 and
--                 13:00". Set by staff managers (Settings › Shifts).
--   staff_breaks  a break someone is taking or took: started_at, ended_at
--                 (null while on it), and how long it was meant to be.
--
-- A person has at most one open break. Staff start and end their own through
-- `start_break` / `end_break`; nobody can put someone else on break. The
-- hotel can read who is on break (Staff screen, Reassign sheet).

-- ---------------------------------------------------------------------------
-- Rules
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shift_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 40),
  duration_minutes integer NOT NULL CHECK (duration_minutes BETWEEN 5 AND 180),
  -- When it may be taken. Both null = any time during the shift.
  window_start time,
  window_end time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((window_start IS NULL) = (window_end IS NULL)),
  CHECK (window_start IS NULL OR window_start <> window_end)
);

COMMENT ON TABLE public.shift_breaks IS 'Breaks a shift allows (name, length, optional window). Managed in Settings › Shifts.';

CREATE INDEX IF NOT EXISTS idx_shift_breaks_shift ON public.shift_breaks (shift_id);

DROP TRIGGER IF EXISTS update_shift_breaks_updated_at ON public.shift_breaks;
CREATE TRIGGER update_shift_breaks_updated_at BEFORE UPDATE ON public.shift_breaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.shift_breaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hotel users can read shift breaks" ON public.shift_breaks;
CREATE POLICY "Hotel users can read shift breaks" ON public.shift_breaks
  FOR SELECT TO authenticated USING (hotel_id = public.auth_hotel_id());

DROP POLICY IF EXISTS "Staff managers can manage shift breaks" ON public.shift_breaks;
CREATE POLICY "Staff managers can manage shift breaks" ON public.shift_breaks
  FOR ALL TO authenticated
  USING (hotel_id = public.auth_hotel_id() AND public.auth_has_permission('staff.manage'))
  WITH CHECK (
    hotel_id = public.auth_hotel_id()
    AND public.auth_has_permission('staff.manage')
    AND EXISTS (SELECT 1 FROM public.shifts s WHERE s.id = shift_id AND s.hotel_id = public.auth_hotel_id())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_breaks TO authenticated;

-- ---------------------------------------------------------------------------
-- Breaks taken
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.staff_breaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shift_break_id uuid REFERENCES public.shift_breaks(id) ON DELETE SET NULL,
  -- Kept on the row, so history survives the rule being edited or deleted.
  name text NOT NULL,
  planned_minutes integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  CHECK (ended_at IS NULL OR ended_at >= started_at)
);

COMMENT ON TABLE public.staff_breaks IS 'Breaks staff take. ended_at null = on break now. Written by start_break / end_break.';

-- At most one open break per person.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_staff_breaks_open ON public.staff_breaks (user_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_staff_breaks_hotel_open ON public.staff_breaks (hotel_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_staff_breaks_user_started ON public.staff_breaks (user_id, started_at DESC);

ALTER TABLE public.staff_breaks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Hotel users can read staff breaks" ON public.staff_breaks;
CREATE POLICY "Hotel users can read staff breaks" ON public.staff_breaks
  FOR SELECT TO authenticated USING (hotel_id = public.auth_hotel_id());

-- No write policies: rows are written only by the functions below.
GRANT SELECT ON public.staff_breaks TO authenticated;

-- ---------------------------------------------------------------------------
-- Start / end
-- ---------------------------------------------------------------------------

-- Start a break for yourself: one of your shift's breaks, or (null) a short
-- break of `p_minutes` (default 15).
CREATE OR REPLACE FUNCTION public.start_break(p_shift_break_id uuid DEFAULT NULL, p_minutes integer DEFAULT NULL)
RETURNS public.staff_breaks
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user uuid := auth.uid();
  v_hotel uuid := public.auth_hotel_id();
  v_rule shift_breaks;
  v_row staff_breaks;
BEGIN
  IF v_user IS NULL OR v_hotel IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to take a break.' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (SELECT 1 FROM staff_breaks WHERE user_id = v_user AND ended_at IS NULL) THEN
    RAISE EXCEPTION 'You are already on a break.' USING ERRCODE = '23505';
  END IF;

  IF p_shift_break_id IS NOT NULL THEN
    SELECT * INTO v_rule FROM shift_breaks WHERE id = p_shift_break_id AND hotel_id = v_hotel;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'That break was not found.' USING ERRCODE = 'P0002';
    END IF;
    INSERT INTO staff_breaks (hotel_id, user_id, shift_break_id, name, planned_minutes)
    VALUES (v_hotel, v_user, v_rule.id, v_rule.name, v_rule.duration_minutes)
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO staff_breaks (hotel_id, user_id, name, planned_minutes)
    VALUES (v_hotel, v_user, 'Break', greatest(5, least(coalesce(p_minutes, 15), 180)))
    RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END;
$$;

-- End your open break, if any. Returns it (null when there was none).
CREATE OR REPLACE FUNCTION public.end_break()
RETURNS public.staff_breaks
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row staff_breaks;
BEGIN
  UPDATE staff_breaks SET ended_at = now()
   WHERE user_id = auth.uid() AND ended_at IS NULL
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.start_break(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.end_break() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_break(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_break() TO authenticated;

-- Staff screen and Reassign sheet update live when someone goes on break.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'staff_breaks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_breaks;
  END IF;
END $$;
