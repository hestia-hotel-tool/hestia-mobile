import { isRoomPaused } from '../types/allRooms.types';
import type { RoomCardData } from '../types/allRooms.types';

/**
 * The room already in progress that blocks starting another one.
 *
 * A room attendant works one room at a time: the rule exists so a shift cannot
 * end with three rooms half-cleaned and no record of which was actually being
 * worked. Returns the offending room so the caller can name it, or null when
 * nothing is in the way.
 *
 * Two things deliberately do not block:
 *   - the target room itself, so re-confirming a status on the room you are
 *     already in (Return Later, Refuse Service) still works;
 *   - paused rooms, which are the sanctioned way to put one down and pick up
 *     another.
 *
 * Reads both in-progress signals for the same reason `isRoomPaused` reads both
 * pause signals: `rooms.house_keeping_status` is written from the status modal
 * and `room_assignments.work_status` from the assignment flow, and the two are
 * never reconciled.
 *
 * NOT enforcement. Nothing in the schema prevents two rooms being in progress at
 * once, so a second device or a stale list can still get past this. It is a
 * guard rail on the UI, not a constraint.
 */
export function findBlockingInProgressRoom(
  rooms: readonly RoomCardData[],
  targetRoomId: string
): RoomCardData | null {
  for (const room of rooms) {
    if (String(room.id) === String(targetRoomId)) continue;
    if (isRoomPaused(room)) continue;

    const inProgress =
      room.houseKeepingStatus === 'InProgress' ||
      room.roomAttendantAssigned?.assignmentWorkStatus === 'in_progress';

    if (inProgress) return room;
  }
  return null;
}

/**
 * The same rule, when all you have is the whole hotel's room list.
 *
 * `AllRoomsScreen` knows exactly which rooms are assigned to the user, because
 * it queries `room_assignments`. Room Detail does not — it only has the store's
 * list — so it narrows by the assignee carried on each card first. That signal
 * is weaker: a room whose assignment has not loaded carries no `userId` and is
 * skipped, which means this can miss a blocking room rather than invent one.
 * Failing open is the right way round for a guard rail whose job is to catch a
 * mistake, not to police one.
 */
export function findBlockingInProgressRoomForUser(
  rooms: readonly RoomCardData[],
  targetRoomId: string,
  userId: string | null | undefined
): RoomCardData | null {
  if (!userId) return null;
  const mine = rooms.filter(
    (room) => String(room.roomAttendantAssigned?.userId ?? '') === String(userId)
  );
  return findBlockingInProgressRoom(mine, targetRoomId);
}
