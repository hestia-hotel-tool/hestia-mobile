-- Back office sidebar badges: "new since you last looked". Each person keeps
-- one last-seen time per section and hotel. The Tickets and Lost & found
-- badges count what someone else created after it, and opening the section
-- moves it to now. Stored server side so it follows the person across
-- devices; the clock is the database's, not the browser's.

CREATE TABLE IF NOT EXISTS public.backoffice_section_seen (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hotel_id uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('tickets', 'lost_and_found')),
  seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, hotel_id, section)
);

ALTER TABLE public.backoffice_section_seen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own seen times" ON public.backoffice_section_seen;
CREATE POLICY "Users read their own seen times" ON public.backoffice_section_seen
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
-- No write policies: writes go through backoffice_mark_seen.

CREATE OR REPLACE FUNCTION public.backoffice_mark_seen(p_section text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_hotel uuid := public.auth_hotel_id();
BEGIN
  IF auth.uid() IS NULL OR v_hotel IS NULL THEN
    RAISE EXCEPTION 'Not signed in to a hotel.' USING ERRCODE = '42501';
  END IF;
  IF p_section NOT IN ('tickets', 'lost_and_found') THEN
    RAISE EXCEPTION 'Unknown section "%".', p_section USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.backoffice_section_seen (user_id, hotel_id, section, seen_at)
  VALUES (auth.uid(), v_hotel, p_section, now())
  ON CONFLICT (user_id, hotel_id, section) DO UPDATE SET seen_at = excluded.seen_at;
END;
$$;

-- Counts under the caller's own row-level security. Someone who has never
-- opened a section sees the last 7 days, not the hotel's whole history.
CREATE OR REPLACE FUNCTION public.backoffice_new_counts()
RETURNS TABLE (new_tickets integer, new_items integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH seen AS (
    SELECT
      coalesce(max(seen_at) FILTER (WHERE section = 'tickets'), now() - interval '7 days') AS tickets,
      coalesce(max(seen_at) FILTER (WHERE section = 'lost_and_found'), now() - interval '7 days') AS items
    FROM public.backoffice_section_seen
    WHERE user_id = auth.uid() AND hotel_id = public.auth_hotel_id()
  )
  SELECT
    (SELECT count(*)::integer FROM public.tickets t, seen
      WHERE t.hotel_id = public.auth_hotel_id() AND t.created_at > seen.tickets
        AND t.created_by_id IS DISTINCT FROM auth.uid()),
    (SELECT count(*)::integer FROM public.lost_and_found_items i, seen
      WHERE i.hotel_id = public.auth_hotel_id() AND i.created_at > seen.items
        AND i.registered_by_id IS DISTINCT FROM auth.uid());
$$;

REVOKE ALL ON FUNCTION public.backoffice_mark_seen(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.backoffice_mark_seen(text) TO authenticated;
REVOKE ALL ON FUNCTION public.backoffice_new_counts() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.backoffice_new_counts() TO authenticated;
