-- The two "rooms back in the pool" notices sent before 20261008000100 carried
-- no room ids, so "View Rooms" could only show every unassigned room. The
-- audit log recorded each freed assignment in the same transaction (same
-- now()), with its assigner: give those notices their rooms.
UPDATE public.notifications n
   SET data = coalesce(n.data, '{}'::jsonb) || jsonb_build_object('roomIds', x.room_ids)
  FROM (
    SELECT n2.id, jsonb_agg(DISTINCT (l.old_data->>'room_id')) AS room_ids
      FROM public.notifications n2
      JOIN public.activity_logs l
        ON l.table_name = 'room_assignments' AND l.operation = 'DELETE'
       AND l.created_at = n2.created_at
       AND l.old_data->>'assigned_by_id' = n2.user_id::text
     WHERE n2.type = 'room_pool' AND NOT (coalesce(n2.data, '{}'::jsonb) ? 'roomIds')
     GROUP BY n2.id
  ) x
 WHERE n.id = x.id;
