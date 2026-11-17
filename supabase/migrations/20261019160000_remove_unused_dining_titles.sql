-- In Room Dining keeps three titles (2026-10-19): In Room Dining Manager,
-- In Room Dining Supervisor, In Room Dining Waiter/Waitress. The other four
-- are removed, as in 20261019140000 — scripts/rbac/parse-spec.py
-- REMOVED_TITLES keeps them out of the seed; this removes them from databases
-- seeded before that.
--
-- Order Taker and Butler were the only titles on the `ird_service` role; the
-- role itself stays (it is part of the generated matrix), it just has no
-- titles until one is given it.
--
-- Refuses to run while anyone still holds one of them (users.job_title_id is
-- ON DELETE SET NULL, and a person with no title has no permissions).

BEGIN;

DO $$
DECLARE
  v_held text;
BEGIN
  SELECT string_agg(u.email || ' (' || jt.name || ')', ', ')
    INTO v_held
    FROM public.users u
    JOIN public.job_titles jt ON jt.id = u.job_title_id
   WHERE jt.key IN (
     'director_of_in_room_dining', 'in_room_dining_assistant_manager',
     'in_room_dining_order_taker', 'butler_in_room_dining'
   );
  IF v_held IS NOT NULL THEN
    RAISE EXCEPTION 'Job titles still held: %', v_held;
  END IF;
END $$;

DELETE FROM public.job_titles
 WHERE key IN (
   'director_of_in_room_dining', 'in_room_dining_assistant_manager',
   'in_room_dining_order_taker', 'butler_in_room_dining'
 );

COMMIT;
