import type { GuestInfo, RoomCardData, RoomStatus } from '../types/allRooms.types';
import { isRoomPaused } from '../types/allRooms.types';
import type { GuestRowKind } from '../components/roomsList/GuestRow';
import { getStayoverWithLinen } from './stayoverLinen';

/**
 * Which mark belongs on a guest photo's corner.
 *
 * Driven by the reservation, not by a card-type boolean: an Arrival/Departure
 * room shows the arriving guest first and the departing guest second
 * (Figma 3883:5881, green disc then red), so the index matters.
 *
 * Replaces the eight-branch `if/else` chain inside `GuestInfoDisplay` that
 * picked between five `require()`d PNGs.
 */
export function guestRowKind(room: RoomCardData, index: number): GuestRowKind {
  const guest = room.guests[index];
  if (guest?.isVacant) return 'vacant';

  switch (room.frontOfficeStatus) {
    case 'Arrival/Departure':
      return index === 0 ? 'arrival' : 'departure';
    case 'Arrival':
      return 'arrival';
    case 'Departure':
      return 'departure';
    case 'Stayover':
      return getStayoverWithLinen(room) ? 'stayover-linen' : 'stayover-no-linen';
    case 'Turndown':
      return 'turndown';
    default:
      return 'occupied';
  }
}

/**
 * The line under the assignee's name.
 *
 * Pausing overlays whatever the housekeeping status is rather than replacing
 * it, so it is checked first.
 *
 * Pulled out of `StaffSection`, where it lived in a `useMemo` placed *after* an
 * early `return` — so assigning or unassigning a room changed the hook order
 * and React's rules-of-hooks lint flagged it. A plain function cannot.
 *
 * The design shows richer copy than this — "Started: 40 mins", "Paused at
 * 18:00", "Time: 60 mins". Those need a real assignment start time, which the
 * schema does not yet carry; the previous card faked them from a hash of the
 * room id. Deliberately not reproduced.
 */
export function assigneeStatusLine(
  roomStatus: RoomStatus,
  isPaused: boolean
): string {
  if (isPaused) return 'Paused';
  switch (roomStatus) {
    case 'InProgress':
      return 'Started';
    case 'Cleaned':
      return 'Cleaned';
    case 'Inspected':
      return 'Inspected';
    case 'Dirty':
    default:
      return 'Not started';
  }
}

/** Everything the card tree needs to know about a room's state, resolved once. */
export function roomCardState(room: RoomCardData) {
  const paused = isRoomPaused(room);
  return {
    paused,
    isArrivalDeparture: room.frontOfficeStatus === 'Arrival/Departure',
    statusLine: assigneeStatusLine(room.houseKeepingStatus, paused),
  };
}

/**
 * "ETA: 17:00" / "EDT: 12:00", or nothing.
 *
 * Both halves have to be real. A Stayover carries `timeLabel: 'N/A'`, but the
 * data also contains rows labelled `EDT` whose `time` is the string `"N/A"` —
 * and those rendered as a literal "EDT: N/A" on the card.
 */
export function guestTimeLabel(guest: GuestInfo): string | undefined {
  const { timeLabel, time } = guest;
  if (!timeLabel || timeLabel === 'N/A') return undefined;
  if (!time || time.trim().toUpperCase() === 'N/A') return undefined;
  return `${timeLabel}: ${time}`;
}
