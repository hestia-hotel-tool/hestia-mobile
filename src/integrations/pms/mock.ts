/**
 * Mock PMS provider — the default adapter.
 *
 * Used for local development and for hotels that have not configured a PMS yet.
 * Returned by the registry whenever a hotel has no `pms_provider` config.
 */
import type {
  PmsArrival,
  PmsDeparture,
  PmsGuest,
  PmsReservation,
  PmsRoom,
  PmsSearchParams,
} from './types';
import type { PmsProvider } from './PmsProvider';

const rooms: PmsRoom[] = [
  { id: 'room-101', roomNumber: '101', floor: '1', roomType: 'ST2K', occupancyStatus: 'occupied', housekeepingStatus: 'dirty' },
  { id: 'room-102', roomNumber: '102', floor: '1', roomType: 'DBL', occupancyStatus: 'occupied', housekeepingStatus: 'cleaned' },
  { id: 'room-103', roomNumber: '103', floor: '1', roomType: 'ST2K', occupancyStatus: 'vacant', housekeepingStatus: 'inspected' },
  { id: 'room-201', roomNumber: '201', floor: '2', roomType: 'TWIN', occupancyStatus: 'occupied', housekeepingStatus: 'in_progress' },
  { id: 'room-202', roomNumber: '202', floor: '2', roomType: 'ST2K', occupancyStatus: 'occupied', housekeepingStatus: 'dirty' },
];

const guests: PmsGuest[] = [
  { id: 'guest-1', fullName: 'Stella Kitou', email: 'stella@example.com', phone: '+10000000001', vipCode: '4' },
  { id: 'guest-2', fullName: 'John Mensah', email: 'john@example.com', phone: '+10000000002' },
  { id: 'guest-3', fullName: 'Ama Boateng', email: 'ama@example.com' },
];

const reservations: PmsReservation[] = [
  { id: 'res-1', roomId: 'room-101', guestIds: ['guest-1'], arrivalDate: '2026-08-08', departureDate: '2026-08-11', eta: '13:00', adults: 2, kids: 1, status: 'checked_in', housekeepingStatus: 'stayover' },
  { id: 'res-2', roomId: 'room-201', guestIds: ['guest-2'], arrivalDate: '2026-08-07', departureDate: '2026-08-10', adults: 1, kids: 0, status: 'checked_in', housekeepingStatus: 'departure' },
  { id: 'res-3', roomId: 'room-202', guestIds: ['guest-3'], arrivalDate: '2026-08-09', departureDate: '2026-08-13', adults: 2, kids: 0, status: 'confirmed', housekeepingStatus: 'arrival' },
];

export class MockPmsProvider implements PmsProvider {
  readonly id = 'mock';

  async listRooms(): Promise<PmsRoom[]> {
    return rooms;
  }

  async listReservations(params?: PmsSearchParams): Promise<PmsReservation[]> {
    let rows = reservations;
    if (params?.query) {
      const q = params.query.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          guests.find((g) => r.guestIds.includes(g.id))?.fullName.toLowerCase().includes(q)
      );
    }
    return rows;
  }

  async listGuests(params?: PmsSearchParams): Promise<PmsGuest[]> {
    if (!params?.query) return guests;
    const q = params.query.toLowerCase();
    return guests.filter(
      (g) =>
        g.fullName.toLowerCase().includes(q) ||
        g.email?.toLowerCase().includes(q)
    );
  }

  async getArrivals(params?: PmsSearchParams): Promise<PmsArrival[]> {
    const day = params?.from ?? new Date().toISOString().slice(0, 10);
    return reservations
      .filter((r) => r.arrivalDate === day)
      .map((r) => ({
        reservationId: r.id,
        guest: guests.find((g) => r.guestIds[0] === g.id) ?? guests[0],
        room: rooms.find((room) => room.id === r.roomId) ?? null,
        arrivalDate: r.arrivalDate,
        eta: r.eta,
        adults: r.adults,
        kids: r.kids,
      }));
  }

  async getDepartures(params?: PmsSearchParams): Promise<PmsDeparture[]> {
    const day = params?.from ?? new Date().toISOString().slice(0, 10);
    return reservations
      .filter((r) => r.departureDate === day)
      .map((r) => ({
        reservationId: r.id,
        guest: guests.find((g) => r.guestIds[0] === g.id) ?? guests[0],
        room: rooms.find((room) => room.id === r.roomId) ?? null,
        departureDate: r.departureDate,
      }));
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
