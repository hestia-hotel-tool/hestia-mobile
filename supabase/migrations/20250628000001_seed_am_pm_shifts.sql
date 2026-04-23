-- Ensure AM and PM shifts exist so staff assignment can persist (app looks up shift by name).
-- Multi-tenant: shifts are hotel-scoped, so seed per-hotel.
-- Idempotent: inserts only if no row with that name exists for that hotel.

WITH shift_rows(name, start_time, end_time) AS (
  VALUES
    ('AM', '06:00'::time, '14:00'::time),
    ('PM', '14:00'::time, '22:00'::time)
)
INSERT INTO public.shifts (hotel_id, name, start_time, end_time)
SELECT h.id AS hotel_id, sr.name, sr.start_time, sr.end_time
FROM public.hotels h
CROSS JOIN shift_rows sr
WHERE NOT EXISTS (
  SELECT 1
  FROM public.shifts s
  WHERE s.hotel_id = h.id
    AND s.name ILIKE sr.name
);
