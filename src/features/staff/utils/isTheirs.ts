import type { RoomChange } from '@/hooks/useLiveRoomChanges';

/**
 * Whether a live room change concerns one attendant's screen: an assignment
 * row that is theirs (given, taken or updated), or a change to one of the
 * rooms they hold now. Everything else in the hotel is ignored, so their
 * Activity and See rooms do not reload for other people's rooms.
 */
export function isTheirs(
  change: RoomChange,
  staffId: string | null,
  rooms: readonly { id: string }[] | null
): boolean {
  if (!staffId) return false;
  if (change.table === 'room_assignments') return change.row.user_id === staffId;
  const id = change.row.id;
  return !!rooms && rooms.some((room) => room.id === id);
}
