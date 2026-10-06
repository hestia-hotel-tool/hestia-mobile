import type { RoomType } from '../types/roomDetail.types';

/**
 * The layout a room's front-office status calls for.
 *
 * One function for both sides of the navigation. AllRoomsScreen and
 * RoomDetailScreen each had their own copy, and they disagreed — the list's
 * defaulted unknown statuses to 'ArrivalDeparture' and the detail screen's to
 * 'Stayover', so the two could pick different layouts for the same room. The
 * detail screen then papered over it by overriding whatever it was handed
 * whenever a room had two or more guests.
 *
 * `guestCount` is what makes a room Arrival/Departure: two reservations means
 * one guest leaving and another arriving, whatever the column says.
 */
export function mapFrontOfficeToRoomType(
  frontOffice: string | null | undefined,
  guestCount: number
): RoomType {
  if (guestCount >= 2) return 'ArrivalDeparture';
  switch (frontOffice) {
    case 'Arrival':
      return 'Arrival';
    case 'Departure':
      return 'Departure';
    case 'Arrival/Departure':
      return 'ArrivalDeparture';
    case 'Stayover':
      return 'Stayover';
    case 'Turndown':
      return 'Turndown';
    // No Task reuses the Stayover layout; so does anything unrecognised
    // ('Refresh', or a value the DB grows later).
    case 'No Task':
    default:
      return 'Stayover';
  }
}
