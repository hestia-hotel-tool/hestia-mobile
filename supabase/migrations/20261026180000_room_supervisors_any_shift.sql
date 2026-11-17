-- Room notifications reach housekeeping leaders whatever shift they are
-- rostered on (client request, 2026-10-26: "notifications should be received
-- for as long as someone is signed in — regardless of the shift — as long as
-- it concerns them").
--
-- _room_supervisor_ids decides who hears about a room (cleaning started,
-- cleaned, Do Not Disturb, refused, return later, overdue, …). It took only
-- the leaders whose users.shift_id matched the room assignment's shift, so an
-- AM Executive Housekeeper heard nothing about PM rooms while signed in and
-- responsible for them. Now: whoever assigned the room, plus every active
-- housekeeping leader (full_access in Housekeeping), any shift.
--
-- Unchanged: the caller is never notified of their own action
-- (_notify_user), and a push reaches only signed-in devices — signing out
-- removes the device token. Every other notifier already targets specific
-- people (the room's attendant, the assigner, a ticket's assignee) with no
-- shift test.

BEGIN;

CREATE OR REPLACE FUNCTION public._room_supervisor_ids(p_room_id uuid)
RETURNS SETOF uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ra room_assignments := public._current_room_assignment(p_room_id);
  v_hotel uuid := (SELECT hotel_id FROM rooms WHERE id = p_room_id);
BEGIN
  RETURN QUERY
  SELECT DISTINCT x.id FROM (
    SELECT ra.assigned_by_id AS id WHERE ra.assigned_by_id IS NOT NULL
    UNION ALL
    SELECT u.id
      FROM users u
      JOIN job_titles jt ON jt.id = u.job_title_id
      JOIN roles r ON r.id = jt.role_id
      JOIN departments d ON d.id = jt.department_id
     WHERE u.hotel_id = v_hotel
       AND u.active
       AND r.key = 'full_access'
       AND d.key = 'housekeeping'
  ) x;
END;
$function$;

COMMIT;
