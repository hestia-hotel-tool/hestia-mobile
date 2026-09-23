import {
  getAssignedRoomIdsForUserAndShiftOrderedByAssignmentCreatedAt,
  getFullRoomDetails,
  fullRoomDetailsToRoomCardData,
} from '@features/rooms/services/rooms';
import type { RoomCardData } from '@features/rooms/types/allRooms.types';

/**
 * The rooms one member of staff holds for one shift, as Rooms-list cards.
 *
 * ## Why there is almost nothing here
 *
 * The Staff Rooms screen (Figma 3810:173) draws the *same* cards, in the same
 * status bands, as the Rooms list. So this does not build a view model — it
 * borrows the Rooms feature's own: `getAssignedRoomIdsForUserAndShift…` already
 * answers "which rooms", `getFullRoomDetails` already loads them, and
 * `fullRoomDetailsToRoomCardData` already maps them. Three calls, no new
 * shapes, and the two screens cannot drift apart because there is only one
 * mapper.
 *
 * The alternative — a `StaffAssignedRoomCard` type of our own — would have
 * meant re-deriving front-office status, guest slots, VIP codes, paused state,
 * linen days and the assignee's elapsed time, all of which
 * `fullRoomDetailsToRoomCardData` gets right today.
 *
 * ## Two queries, not one
 *
 * `room_assignments` is the authority on who holds what, and it is a separate
 * table from `rooms`. Resolving the ids first keeps `getFullRoomDetails`
 * fetching only the handful of rooms this person actually has, rather than the
 * estate.
 *
 * Ordering is **the rooms' own**, not the assignment order that the id query
 * returns: `getFullRoomDetails` sorts by `room_number`, and the screen groups
 * by status afterwards anyway, so "most recently assigned first" would not
 * survive the grouping and would only make the order inside a band look random.
 */
export async function loadStaffAssignedRooms(
  userId: string,
  shift: 'AM' | 'PM'
): Promise<RoomCardData[]> {
  const roomIds = await getAssignedRoomIdsForUserAndShiftOrderedByAssignmentCreatedAt(
    userId,
    shift
  );
  if (roomIds.length === 0) return [];

  const full = await getFullRoomDetails(roomIds);
  return full.map((details) => fullRoomDetailsToRoomCardData(details, shift));
}

export default loadStaffAssignedRooms;
