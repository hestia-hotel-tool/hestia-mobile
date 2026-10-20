-- Back office: a hotel's name is 1–40 characters, trimmed.
--
-- The name heads the back office sidebar (and later reports and the platform
-- hotel list). 40 characters always fits there in full, wrapped, so it is never
-- cut off. Existing names are 22 and 16 characters; the database's own
-- fallback is "Default Hotel".
--
-- Mobile impact: none (mobile never writes a hotel's name).

ALTER TABLE public.hotels DROP CONSTRAINT IF EXISTS hotels_name_length;
ALTER TABLE public.hotels
  ADD CONSTRAINT hotels_name_length CHECK (char_length(btrim(name)) BETWEEN 1 AND 40);
