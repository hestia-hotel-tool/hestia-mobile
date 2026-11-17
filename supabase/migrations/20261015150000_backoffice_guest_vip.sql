-- Back office Step 3.2: guests.vip_code is a VIP level number.
--
-- Mobile reads it with parseInt and shows the number on the room card
-- (SingleGuestRoomCard / ArrivalDepartureRoomCard), and every existing value
-- is a number (1–22). A label such as "VIP1" would show as nothing on phones,
-- so only whole numbers 1–999 are allowed.
--
-- Mobile impact: none (it already expects numbers).

ALTER TABLE public.guests DROP CONSTRAINT IF EXISTS guests_vip_code_check;
ALTER TABLE public.guests ADD CONSTRAINT guests_vip_code_check
  CHECK (vip_code IS NULL OR vip_code ~ '^[1-9][0-9]{0,2}$');
COMMENT ON COLUMN public.guests.vip_code IS 'VIP level, a whole number 1–999 (mobile parses it as a number).';

-- upsert_guest: the same rule, with a message instead of a constraint error.
CREATE OR REPLACE FUNCTION public._guest_vip(p_vip text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text := nullif(btrim(coalesce(p_vip, '')), '');
BEGIN
  IF v IS NOT NULL AND v !~ '^[1-9][0-9]{0,2}$' THEN
    RAISE EXCEPTION 'The VIP level is a whole number from 1 to 999.' USING ERRCODE = '22023';
  END IF;
  RETURN v;
END;
$$;

DO $$
DECLARE
  v_def text := pg_get_functiondef('public.upsert_guest(uuid, text, text, text, text, text, text, date, text)'::regprocedure);
BEGIN
  v_def := replace(v_def, 'nullif(btrim(coalesce(p_vip_code, '''')), '''')', 'public._guest_vip(p_vip_code)');
  EXECUTE v_def;
END $$;
