import type { FilterState } from '@/types/filter.types';
import { getFloorFromRoomNumber } from '@/utils/formatting';
import { isRoomPaused } from '../types/allRooms.types';
import type { RoomCardData } from '../types/allRooms.types';
import { getStayoverWithLinen } from './stayoverLinen';

/**
 * Which filter groups the user has actually ticked something in.
 *
 * A group with nothing ticked is not a constraint — it must not narrow the
 * list — so every caller needs this before it can decide anything.
 */
export function activeFilterGroups(filters: FilterState | undefined) {
  return {
    roomStates: Object.values(filters?.roomStates ?? {}).some(Boolean),
    guests: Object.values(filters?.guests ?? {}).some(Boolean),
    reservations: Object.values(filters?.reservations ?? {}).some(Boolean),
    floors: Object.values(filters?.floors ?? {}).some(Boolean),
  };
}

/** True when any group is constrained. */
export function hasAnyActiveFilter(filters: FilterState | undefined): boolean {
  return Object.values(activeFilterGroups(filters)).some(Boolean);
}

/**
 * Does one room satisfy the selection?
 *
 * Options within a group are OR-ed (Dirty *or* Cleaned) and the groups are
 * AND-ed together (a dirty room *and* an arrival), which is what makes ticking
 * more boxes in one group widen the list while ticking across groups narrows
 * it.
 */
export function roomMatchesFilters(room: RoomCardData, filters: FilterState | undefined): boolean {
  if (!filters) return true;
  const active = activeFilterGroups(filters);

  if (active.floors) {
    const floors = filters.floors ?? {};
    // "All" is a shortcut for every floor, so it constrains nothing.
    if (!floors.all) {
      const allowed = new Set<number>();
      Object.entries(floors).forEach(([key, selected]) => {
        if (key === 'all' || !selected) return;
        const floorNum = parseInt(key, 10);
        if (!Number.isNaN(floorNum)) allowed.add(floorNum);
      });
      const floor = getFloorFromRoomNumber(room.roomNumber);
      if (floor === null || !allowed.has(floor)) return false;
    }
  }

  if (active.roomStates) {
    const s = filters.roomStates;
    const matches =
      (s.dirty && room.houseKeepingStatus === 'Dirty') ||
      (s.inProgress && room.houseKeepingStatus === 'InProgress') ||
      (s.cleaned && room.houseKeepingStatus === 'Cleaned') ||
      (s.inspected && room.houseKeepingStatus === 'Inspected') ||
      (s.priority && room.isPriority) ||
      (s.paused && isRoomPaused(room)) ||
      (s.returnLater && !!(room as any)?.returnLaterAt) ||
      (s.refused && (!!(room as any)?.refuseServiceReason || !!(room as any)?.refuseServiceAt));
    if (!matches) return false;
  }

  if (active.guests) {
    const g = filters.guests;
    const fo = room.frontOfficeStatus;
    const matches =
      (g.arrivals && (fo === 'Arrival' || fo === 'Arrival/Departure')) ||
      (g.departures && (fo === 'Departure' || fo === 'Arrival/Departure')) ||
      (g.turnDown && fo === 'Turndown') ||
      (g.noTask && fo === 'No Task') ||
      (g.stayOver && fo === 'Stayover') ||
      (g.stayOverWithLinen && fo === 'Stayover' && getStayoverWithLinen(room) === true) ||
      (g.stayOverNoLinen && fo === 'Stayover' && getStayoverWithLinen(room) === false);
    if (!matches) return false;
  }

  if (active.reservations) {
    // Case-insensitive: the field arrives as "Occupied" from some sources and
    // "occupied" from others.
    const res = (room.reservationStatus || '').toLowerCase();
    const matches =
      (filters.reservations?.occupied && res === 'occupied') ||
      (filters.reservations?.vacant && res === 'vacant');
    if (!matches) return false;
  }

  return true;
}

/** `roomMatchesFilters` over a list. */
export function applyRoomFilters(
  rooms: RoomCardData[],
  filters: FilterState | undefined
): RoomCardData[] {
  if (!filters || !hasAnyActiveFilter(filters)) return rooms;
  return rooms.filter((room) => roomMatchesFilters(room, filters));
}
