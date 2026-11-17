-- VIP codes and tiers (user decision, 2026-11-06).
--
-- Hotels keep their own VIP codes: whole numbers 1–10, 1 the most important
-- (the operational data; room 102's code-1 guest is the "Top Vip Guest").
-- Hestia groups those codes into five tiers, per hotel, which drive the
-- colour on the room card and the VIP filter. A guest with no code is a
-- regular guest.
--
-- Default grouping, seeded for every hotel and editable later (back office):
--   V1  Very Very Important  codes 1–2
--   V2  Very Important       codes 3–4
--   V3  Important            codes 5–6
--   V4  Recognition          codes 7–8
--   V5  Valued Guest         codes 9–10
--
-- Data change: codes outside 1–10 (e.g. demo values like 22) are cleared,
-- making those guests regular guests.
--
-- Mobile impact: reads vip_tiers (falls back to the same defaults when the
-- table is missing or empty) and reads vip_code as text.

BEGIN;

-- 1. Tiers, per hotel ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.vip_tiers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    uuid NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  tier        smallint NOT NULL CHECK (tier BETWEEN 1 AND 5),
  name        text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 40),
  color       text NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  min_code    smallint NOT NULL,
  max_code    smallint NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, tier),
  CHECK (min_code BETWEEN 1 AND 10 AND max_code BETWEEN min_code AND 10)
);
COMMENT ON TABLE public.vip_tiers IS
  'Hestia VIP tiers per hotel: which of the hotel''s VIP codes (1–10) fall in each tier, its name and colour.';

ALTER TABLE public.vip_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS vip_tiers_select ON public.vip_tiers;
CREATE POLICY vip_tiers_select ON public.vip_tiers
  FOR SELECT TO authenticated USING (hotel_id = (SELECT public.auth_hotel_id()));
-- No write policies yet: the back office will get functions to edit tiers.
REVOKE ALL ON public.vip_tiers FROM anon;

CREATE OR REPLACE FUNCTION public._vip_tiers_seed(p_hotel uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
  INSERT INTO public.vip_tiers (hotel_id, tier, name, color, min_code, max_code)
  VALUES (p_hotel, 1, 'Very Very Important', '#A0760A', 1, 2),
         (p_hotel, 2, 'Very Important',      '#6D3FD9', 3, 4),
         (p_hotel, 3, 'Important',           '#2F6FD6', 5, 6),
         (p_hotel, 4, 'Recognition',         '#0F8A7E', 7, 8),
         (p_hotel, 5, 'Valued Guest',        '#5A759D', 9, 10)
  ON CONFLICT (hotel_id, tier) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION public._vip_tiers_seed(uuid) FROM PUBLIC, anon, authenticated;

-- Every hotel now…
SELECT public._vip_tiers_seed(h.id) FROM public.hotels h;

-- …and every hotel created later.
CREATE OR REPLACE FUNCTION public._hotels_seed_vip_tiers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  PERFORM public._vip_tiers_seed(NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS hotels_seed_vip_tiers ON public.hotels;
CREATE TRIGGER hotels_seed_vip_tiers AFTER INSERT ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION public._hotels_seed_vip_tiers();

-- 2. Codes are 1–10 --------------------------------------------------------------

-- Anything else becomes a regular guest (no code).
UPDATE public.guests
   SET vip_code = NULL
 WHERE vip_code IS NOT NULL AND btrim(vip_code) !~ '^([1-9]|10)$';
UPDATE public.guests
   SET vip_code = btrim(vip_code)
 WHERE vip_code IS NOT NULL AND vip_code <> btrim(vip_code);

ALTER TABLE public.guests DROP CONSTRAINT IF EXISTS guests_vip_code_check;
ALTER TABLE public.guests ADD CONSTRAINT guests_vip_code_check
  CHECK (vip_code IS NULL OR vip_code ~ '^([1-9]|10)$');
COMMENT ON COLUMN public.guests.vip_code IS
  'The hotel''s VIP code, 1–10 (1 most important); null for a regular guest. Grouped into tiers by vip_tiers.';

-- upsert_guest validates through this (20261015150000); same rule, readable message.
CREATE OR REPLACE FUNCTION public._guest_vip(p_vip text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text := nullif(btrim(coalesce(p_vip, '')), '');
BEGIN
  IF v IS NOT NULL AND v !~ '^([1-9]|10)$' THEN
    RAISE EXCEPTION 'The VIP code is a whole number from 1 to 10, or empty for a regular guest.' USING ERRCODE = '22023';
  END IF;
  RETURN v;
END;
$$;

COMMIT;
