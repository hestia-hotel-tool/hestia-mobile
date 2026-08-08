/**
 * Canonical PMS (Property Management System) contracts.
 *
 * These types are provider-agnostic: every adapter (Mews, Cloudbeds, …) maps
 * its native payloads into these shapes, so the rest of the app never knows
 * which PMS a hotel uses. Add fields here only when they matter to the app.
 */

export type PmsProviderId = 'mews' | 'cloudbeds' | 'mock';

export interface PmsRoom {
  id: string;
  /** e.g. "101" */
  roomNumber: string;
  floor?: string | null;
  roomType?: string | null;
  /** Canonical housekeeping state, when the PMS exposes it. */
  housekeepingStatus?: 'dirty' | 'in_progress' | 'cleaned' | 'inspected' | null;
  /** Front office state: occupied / vacant / blocked. */
  occupancyStatus?: 'occupied' | 'vacant' | 'blocked' | null;
  isBlocked?: boolean;
  /** ISO 8601 date-time when the room is next expected to be vacant. */
  nextVacantAt?: string | null;
}

export interface PmsGuest {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  vipCode?: string | null;
  nationality?: string | null;
}

export interface PmsReservation {
  id: string;
  roomId: string;
  guestIds: string[];
  /** ISO date (YYYY-MM-DD). */
  arrivalDate: string;
  /** ISO date (YYYY-MM-DD). */
  departureDate: string;
  eta?: string | null;
  adults: number;
  kids: number;
  /** e.g. 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'. */
  status: string;
  /** e.g. 'arrival' | 'departure' | 'stayover' | 'turndown' | 'vacant'. */
  housekeepingStatus?: string | null;
}

export interface PmsArrival {
  reservationId: string;
  guest: PmsGuest;
  room: PmsRoom | null;
  /** ISO date (YYYY-MM-DD). */
  arrivalDate: string;
  eta?: string | null;
  adults: number;
  kids: number;
}

export interface PmsDeparture {
  reservationId: string;
  guest: PmsGuest;
  room: PmsRoom | null;
  /** ISO date (YYYY-MM-DD). */
  departureDate: string;
  /** ISO date-time when the room should be cleaned after checkout. */
  promisedTime?: string | null;
}

export interface PmsSearchParams {
  query?: string;
  from?: string;
  to?: string;
}

export interface PmsError {
  provider: PmsProviderId;
  message: string;
  status?: number;
}
