import type { RoomChange } from '@/hooks/useLiveRoomChanges';

/**
 * Whether a live room change concerns one attendant's screen: an assignment
 * row that is theirs before or after (given, taken away or updated), any
 * change to a room they hold now, or a delete it cannot read (under RLS a
 * delete carries only the row's id — an unassignment must not be missed, so
 * it counts). Everything else in the hotel is ignored.
 */
export function isTheirs(
  change: RoomChange,
  staffId: string | null,
  rooms: readonly { id: string }[] | null
): boolean {
  if (!staffId) return false;
  const holds = (id: unknown) => !!rooms && rooms.some((room) => room.id === id);
  if (change.table === 'room_assignments') {
    if (change.event === 'DELETE' && change.old.user_id === undefined) return true;
    return (
      change.row.user_id === staffId ||
      change.old.user_id === staffId ||
      holds(change.row.room_id) ||
      holds(change.old.room_id)
    );
  }
  return holds(change.row.id);
}
