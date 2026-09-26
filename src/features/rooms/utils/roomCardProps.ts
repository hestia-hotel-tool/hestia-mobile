import type { GuestInfo, RoomCardData } from '../types/allRooms.types';
import type { GuestRowKind } from '../components/roomsList/GuestRow';
import { getStayoverWithLinen } from './stayoverLinen';
import { formatClockTime } from '@/utils/formatting';

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
 * "ETA: 17:00" / "EDT: 12:00", or nothing — with the prefix taken from the
 * guest's *kind* rather than from a second derivation of it.
 *
 * Why this exists. On an Arrival/Departure room the badge and the coloured word
 * come from the guest's position — `guestRowKind` above returns `arrival` for
 * index 0 and `departure` for index 1, and the detail screen's slot table says
 * the same. The time prefix came from somewhere else entirely:
 * `mapToGuestInfo` in the service reads *that reservation's own*
 * `front_office_status`. When a room has two reservations that are not
 * themselves marked Arrival and Departure — which is most of them, since
 * `mapFrontOfficeToRoomType` promotes any 2-guest room to Arrival/Departure —
 * the two disagree, and the screen showed a red "Departure" badge above the
 * words "ETA: 12:00" (rooms 105 and 201 both did).
 *
 * The kind wins because it is what the badge, the colour and the word are
 * already drawn from; making the slot table match on `timeLabel` instead would
 * fix the mismatch but break the ordering guarantee that keeps the detail
 * screen's two guests in the same order as the card's.
 *
 * Only `arrival` and `departure` are decided here. Every other kind keeps
 * whatever the reservation said, because a Stayover's time is not an arrival or
 * a departure and this function has no better answer than the data's.
 *
 * Both halves still have to be real, which `formatClockTime` enforces: a
 * Stayover carries `timeLabel: 'N/A'`, and the data also contains rows labelled
 * `EDT` whose `time` is the literal string `"N/A"` — those used to render as
 * "EDT: N/A" on the card.
 */
export function guestTimeLabelForKind(
  kind: GuestRowKind,
  guest: GuestInfo
): string | undefined {
  const clock = formatClockTime(guest.time);
  if (!clock) return undefined;

  if (kind === 'arrival') return `ETA: ${clock}`;
  if (kind === 'departure') return `EDT: ${clock}`;

  const fallback = guest.timeLabel;
  if (!fallback || fallback === 'N/A') return undefined;
  return `${fallback}: ${clock}`;
}
