/**
 * Cloudbeds PMS adapter.
 *
 * Cloudbeds exposes a REST API keyed by property id + API token. Credentials
 * live server-side; this adapter routes through the secure proxy edge function
 * (see `../proxy.ts`) and maps responses into the canonical Hestia PMS
 * contracts.
 *
 * To enable a hotel: configure its Cloudbeds credentials server-side, then
 * deploy `functions/pms-proxy`.
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

type CloudbedsRoom = {
  id: string;
  roomNumber: string;
  floor?: string | null;
  roomType?: string | null;
  occupancyStatus?: PmsRoom['occupancyStatus'];
};

type CloudbedsReservation = {
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

type CloudbedsGuest = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  vipCode?: string | null;
  nationality?: string | null;
};

export class CloudbedsProvider implements PmsProvider {
  readonly id = 'cloudbeds';

  private async fetch<T>(action: string, params?: Record<string, unknown>): Promise<T> {
    return (await callPmsProxy('cloudbeds', action, params)) as T;
  }

  async listRooms(): Promise<PmsRoom[]> {
    const rows = await this.fetch<CloudbedsRoom[]>('listRooms');
    return rows.map((r) => ({ ...r }));
  }

  async listReservations(params?: PmsSearchParams): Promise<PmsReservation[]> {
    return this.fetch<CloudbedsReservation[]>('listReservations', params ? { ...params } : {});
  }

  async listGuests(params?: PmsSearchParams): Promise<PmsGuest[]> {
    return this.fetch<CloudbedsGuest[]>('listGuests', params ? { ...params } : {});
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
