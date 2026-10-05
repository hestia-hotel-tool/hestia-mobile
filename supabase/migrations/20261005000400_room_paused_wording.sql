-- "Cleaning on hold" → "Room Paused": the words the app uses everywhere else
-- for this state (the Paused band, the Paused status pill).
--
-- 1. The trigger. `_rooms_notify_activity()` is the only function that writes
--    the old title (both pause notifications: the assigner's and the
--    attendant's). It is rewritten from its live definition rather than
--    restated here, so nothing else in it can drift from what is deployed.
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef('public._rooms_notify_activity()'::regprocedure) INTO v_def;
  IF position('Cleaning on hold' IN v_def) > 0 THEN
    EXECUTE replace(v_def, '''Cleaning on hold''', '''Room Paused''');
  END IF;
END
$$;

-- 2. Refusals filed as pauses. Before 20260929000400 a Refuse Service was
--    stored as `room_paused`, so it read "Cleaning on hold" over "Room 207
--    refused service — …". Give those the type and title they describe.
UPDATE public.notifications
SET type = 'room_refused', title = 'Service refused'
WHERE type = 'room_paused'
  AND body ILIKE 'Room % refused service%';

-- 3. Real pauses already sent keep their type and get the new title.
UPDATE public.notifications
SET title = 'Room Paused'
WHERE type = 'room_paused'
  AND title = 'Cleaning on hold';
