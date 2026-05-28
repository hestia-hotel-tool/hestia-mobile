/**
 * Stayover linen logic: every second day of guest stay = linen change.
 * E.g. arrival Monday → Tuesday = day 2 (with linen), Wednesday = day 3 (no linen), Thursday = day 4 (with linen).
 */

import type { RoomCardData } from '../types/allRooms.types';

/**
 * Parse date string. Supports ISO (YYYY-MM-DD) or DD/MM/YYYY, DD/MM/YY.
 */
function parseDate(value: string, referenceYear?: number): Date | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  const year = referenceYear ?? new Date().getFullYear();

  // ISO: YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const d = new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM/YYYY or DD/MM/YY
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(trimmed);
  if (dmy) {
    const dd = parseInt(dmy[1], 10);
    const mm = parseInt(dmy[2], 10) - 1;
    let y = parseInt(dmy[3], 10);
    if (y < 100) y += y < 50 ? 2000 : 1900;
    const d = new Date(y, mm, dd);
    return isNaN(d.getTime()) ? null : d;
  }

  // DD/MM (use reference year)
  const dm = /^(\d{1,2})\/(\d{1,2})$/.exec(trimmed);
  if (dm) {
    const d = new Date(year, parseInt(dm[2], 10) - 1, parseInt(dm[1], 10));
    return isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/**
 * Get day of stay (1-based). Arrival day = 1.
 */
function getDayOfStay(arrivalDate: Date, referenceDate: Date): number {
  const start = new Date(arrivalDate.getFullYear(), arrivalDate.getMonth(), arrivalDate.getDate());
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  return diffDays + 1;
}

/**
 * Returns true if this is a linen-change day: day 2, 4, 6, ... of stay.
 */
function isLinenChangeDay(dayOfStay: number): boolean {
  return dayOfStay >= 2 && dayOfStay % 2 === 0;
}

/**
 * Resolve arrival date from room (first guest's arrivalDate or datesOfStay.from).
 */
function getArrivalDate(room: RoomCardData, referenceYear?: number): Date | null {
  const guest = room.guests?.[0];
  if (!guest) return null;

  if (guest.arrivalDate) {
    return parseDate(guest.arrivalDate, referenceYear);
  }

  // datesOfStay.from is ISO YYYY-MM-DD
  if (guest.datesOfStay?.from) {
    return parseDate(guest.datesOfStay.from, referenceYear);
  }

  return null;
}

/**
 * Whether a Stayover room is "with Linen" (linen change day) or "no Linen".
 * Uses room.withLinen if set; otherwise computes from guest arrival: every 2nd day of stay = with linen.
 * Only meaningful when frontOfficeStatus === 'Stayover'.
 */
export function getStayoverWithLinen(
  room: RoomCardData,
  referenceDate: Date = new Date()
): boolean | undefined {
  if (room.frontOfficeStatus !== 'Stayover') {
    return undefined;
  }

  if (typeof room.withLinen === 'boolean') {
    return room.withLinen;
  }

  const arrival = getArrivalDate(room, referenceDate.getFullYear());
  if (!arrival) return undefined;

  const dayOfStay = getDayOfStay(arrival, referenceDate);
  return isLinenChangeDay(dayOfStay);
}

/**
 * Main label for Stayover display: always "Stayover" (no "no Linen" suffix).
 * For non-Stayover rooms, returns the frontOfficeStatus as-is.
 */
export function getStayoverDisplayLabel(
  room: RoomCardData,
  referenceDate: Date = new Date()
): string {
  if (room.frontOfficeStatus !== 'Stayover') {
    return room.frontOfficeStatus;
  }
  return 'Stayover';
}

/**
 * Whether to show the "with Linen" badge for Stayover rooms.
 * Only true when room is Stayover with Linen; false/undefined otherwise.
 */
export function showStayoverWithLinenBadge(
  room: RoomCardData,
  referenceDate: Date = new Date()
): boolean {
  return getStayoverWithLinen(room, referenceDate) === true;
}
