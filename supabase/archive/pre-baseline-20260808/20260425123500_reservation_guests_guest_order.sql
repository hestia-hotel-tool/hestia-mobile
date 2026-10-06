-- Ensure deterministic guest ordering per reservation.
-- For Arrival/Departure rooms, the app expects:
-- - guest_order = 0 => Arrival (first guest)
-- - guest_order = 1 => Departure (second guest)
--
-- We add `guest_order` to reservation_guests and backfill existing rows.

ALTER TABLE public.reservation_guests
  ADD COLUMN IF NOT EXISTS guest_order integer;

-- Backfill: stable order per reservation using guest_id (best available surrogate).
-- If the table later gains a created_at, we can re-backfill using that instead.
WITH ranked AS (
  SELECT
    reservation_id,
    guest_id,
    row_number() OVER (PARTITION BY reservation_id ORDER BY guest_id) - 1 AS rn
  FROM public.reservation_guests
)
UPDATE public.reservation_guests rg
SET guest_order = ranked.rn
FROM ranked
WHERE rg.reservation_id = ranked.reservation_id
  AND rg.guest_id = ranked.guest_id
  AND rg.guest_order IS NULL;

-- Default any remaining nulls to 0 (safety).
UPDATE public.reservation_guests
SET guest_order = 0
WHERE guest_order IS NULL;

ALTER TABLE public.reservation_guests
  ALTER COLUMN guest_order SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reservation_guests_reservation_guest_order
  ON public.reservation_guests(reservation_id, guest_order);

