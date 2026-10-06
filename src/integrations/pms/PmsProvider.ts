/**
 * PMS adapter contract.
 *
 * Every PMS integration implements this interface. The registry + facade in
 * `index.ts` pick the right adapter for a hotel, so feature code calls
 * `getPms().listRooms()` and never deals with a specific vendor.
 *
 * IMPORTANT (security): vendor API credentials must NEVER live in the mobile
 * app. Real adapters call a Supabase Edge Function that holds the credentials
 * server-side (e.g. `functions/pms-proxy`). The `MockPmsProvider` in
 * `mock.ts` is the default for local development and for hotels without a
 * configured PMS.
 */
import type {
  PmsArrival,
  PmsDeparture,
  PmsGuest,
  PmsReservation,
  PmsRoom,
  PmsSearchParams,
} from './types';

export interface PmsProvider {
  /** Stable vendor id, used for logging + config resolution. */
  readonly id: string;

  listRooms(): Promise<PmsRoom[]>;
  listReservations(params?: PmsSearchParams): Promise<PmsReservation[]>;
  listGuests(params?: PmsSearchParams): Promise<PmsGuest[]>;
  getArrivals(params?: PmsSearchParams): Promise<PmsArrival[]>;
  getDepartures(params?: PmsSearchParams): Promise<PmsDeparture[]>;
  healthCheck(): Promise<boolean>;
}
