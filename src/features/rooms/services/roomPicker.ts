/**
 * Rooms, shaped for a picker.
 *
 * One mapping of `listRoomsWithReservationGuests` for every screen that asks
 * the user to choose a room. There were two, and they disagreed about which
 * reservation a room has today — see `pickReservation`.
 */

import { resolveGuestImageUrls, isHttpUrl } from '@/lib/guests';
import type { RoomPickerGuest, RoomPickerRoom } from '../types/roomPicker.types';
import { listRoomsWithReservationGuests } from './rooms';

/**
 * The reservation a room is on *now*.
 *
 * A room accumulates reservations; the picker wants today's. Prefer the one
 * whose stay contains this moment, and otherwise the most recent arrival, so a
 * room between guests still shows who is next rather than whoever the database
 * happened to return first.
 *
 * Departure day counts as occupied until midnight: a guest checking out at
 * 11:00 is still the person to attribute a found item or a ticket to for the
 * rest of that shift.
 */
function pickReservation(reservations: any[]): any | undefined {
  const byArrivalDesc = [...reservations].sort((a, b) => {
    const at = a?.arrival_date ? new Date(a.arrival_date).getTime() : 0;
    const bt = b?.arrival_date ? new Date(b.arrival_date).getTime() : 0;
    return bt - at;
  });

  const now = Date.now();
  const isCurrent = (r: any): boolean => {
    const arrival = r?.arrival_date ? new Date(r.arrival_date) : null;
    const departure = r?.departure_date ? new Date(r.departure_date) : null;
    if (!arrival || !departure) return false;
    if (Number.isNaN(arrival.getTime()) || Number.isNaN(departure.getTime())) return false;
    const endOfDeparture = new Date(departure);
    endOfDeparture.setHours(23, 59, 59, 999);
    return arrival.getTime() <= now && now <= endOfDeparture.getTime();
  };

  return byArrivalDesc.find(isCurrent) ?? byArrivalDesc[0];
}

/**
 * The guest a single-guest row should show.
 *
 * `Arrival/Departure` means two parties share the room across one date: the
 * one leaving and the one coming. The design shows the departing guest, who is
 * at index 1 when the query returns both.
 */
function pickPrimaryGuest(
  guests: RoomPickerGuest[],
  frontOfficeStatus: string,
): RoomPickerGuest | undefined {
  const isArrivalDeparture = frontOfficeStatus.toLowerCase() === 'arrival/departure';
  const preferred = isArrivalDeparture ? (guests[1] ?? guests[0]) : guests[0];
  return preferred ?? guests.find((g) => g.fullName) ?? guests[0];
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

/**
 * Every room, with the guest currently attached to it.
 *
 * Guest portraits arrive as either an http(s) URL or a path into the private
 * `guest-images` bucket. The paths are signed in **one** batch after the
 * mapping rather than per room, which was 40 round trips on a 40-room hotel.
 * A guest with no portrait gets no URL at all and the card draws initials.
 */
export async function loadRoomPickerRooms(): Promise<RoomPickerRoom[]> {
  const rows = await listRoomsWithReservationGuests();

  const rooms: RoomPickerRoom[] = (rows ?? []).map((room: any) => {
    const reservation = pickReservation(toArray<any>(room?.reservations));
    const frontOfficeStatus = String(reservation?.front_office_status ?? '').trim();

    const guests: RoomPickerGuest[] = toArray<any>(reservation?.guests).map((g: any) => {
      const imageUrl = String(g?.image_url ?? '').trim();
      return {
        id: g?.id ? String(g.id) : undefined,
        fullName: g?.full_name ? String(g.full_name) : undefined,
        vipCode: g?.vip_code ?? null,
        imageUrl: imageUrl || undefined,
      };
    });

    const adults = Number(reservation?.adults ?? 0) || 0;
    const kids = Number(reservation?.kids ?? 0) || 0;

    return {
      id: String(room?.id ?? ''),
      number: String(room?.room_number ?? ''),
      guests,
      primaryGuest: pickPrimaryGuest(guests, frontOfficeStatus),
      checkIn: reservation?.arrival_date ?? null,
      checkOut: reservation?.departure_date ?? null,
      guestCount: adults + kids,
      frontOfficeStatus: frontOfficeStatus || undefined,
    };
  });

  const storagePaths = rooms
    .flatMap((r) => r.guests.map((g) => g.imageUrl))
    .filter((url): url is string => !!url && !isHttpUrl(url));

  if (storagePaths.length === 0) return rooms;

  const signedByPath = await resolveGuestImageUrls(storagePaths);
  if (signedByPath.size === 0) return rooms;

  const sign = (guest: RoomPickerGuest): RoomPickerGuest =>
    guest.imageUrl && signedByPath.has(guest.imageUrl)
      ? { ...guest, imageUrl: signedByPath.get(guest.imageUrl) }
      : guest;

  return rooms.map((room) => {
    const guests = room.guests.map(sign);
    return {
      ...room,
      guests,
      primaryGuest: room.primaryGuest ? sign(room.primaryGuest) : undefined,
    };
  });
}
