/**
 * Mews PMS adapter.
 *
 * Mews uses a REST API keyed by a client access token + the Mews environment
 * base URL. Credentials live server-side; this adapter routes through the
 * secure proxy edge function (see `../proxy.ts`) and maps responses into the
 * canonical Hestia PMS contracts.
 *
 * To enable a hotel: configure its Mews credentials server-side (e.g. a
 * `hotel_pms_config` table / secret), then deploy `functions/pms-proxy`.
 */
import type { PmsProvider } from '../PmsProvider';
import type {
  PmsArrival,
  PmsDeparture,
  PmsGuest,
  PmsReservation,
  PmsRoom,
  PmsSearchParams,
} from '../types';
import { callPmsProxy } from '../proxy';

type MewsRoom = {
  id: string;
  roomNumber: string;
  floor?: string | null;
  roomType?: string | null;
  occupancyStatus?: PmsRoom['occupancyStatus'];
};

type MewsReservation = {
  id: string;
  roomId: string;
  guestIds: string[];
  arrivalDate: string;
  departureDate: string;
  eta?: string | null;
  adults: number;
  kids: number;
  status: string;
  housekeepingStatus?: string | null;
};

type MewsGuest = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  vipCode?: string | null;
  nationality?: string | null;
};

export class MewsProvider implements PmsProvider {
  readonly id = 'mews';

  private async fetch<T>(action: string, params?: Record<string, unknown>): Promise<T> {
    return (await callPmsProxy('mews', action, params)) as T;
  }

  async listRooms(): Promise<PmsRoom[]> {
    const rows = await this.fetch<MewsRoom[]>('listRooms');
    return rows.map((r) => ({ ...r }));
  }

  async listReservations(params?: PmsSearchParams): Promise<PmsReservation[]> {
    return this.fetch<MewsReservation[]>('listReservations', params ? { ...params } : {});
  }

  async listGuests(params?: PmsSearchParams): Promise<PmsGuest[]> {
    return this.fetch<MewsGuest[]>('listGuests', params ? { ...params } : {});
  }

  async getArrivals(params?: PmsSearchParams): Promise<PmsArrival[]> {
    return this.fetch<PmsArrival[]>('getArrivals', params ? { ...params } : {});
  }

  async getDepartures(params?: PmsSearchParams): Promise<PmsDeparture[]> {
    return this.fetch<PmsDeparture[]>('getDepartures', params ? { ...params } : {});
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch('healthCheck');
      return true;
    } catch {
      return false;
    }
  }
}
