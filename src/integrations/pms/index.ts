/**
 * PMS facade — the public entry point for PMS data.
 *
 * Feature code should call the facade functions (or the `usePms` hook), never
 * a provider directly. The facade resolves the right adapter for the current
 * hotel and provides small convenience helpers.
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@features/auth';
import { resolveProvider, resolveProviderForHotel } from './registry';
import type { PmsProvider } from './PmsProvider';

export type {
  PmsProviderId,
  PmsRoom,
  PmsGuest,
  PmsReservation,
  PmsArrival,
  PmsDeparture,
  PmsSearchParams,
} from './types';
export type { PmsProvider } from './PmsProvider';

/** Convenience sync accessor. Defaults to the mock provider (see registry). */
export function getDefaultProvider(): PmsProvider {
  return resolveProvider('mock');
}

/** Returns the resolved provider for the signed-in user's hotel. */
export function usePms() {
  const { hotelId } = useAuth();

  const [provider, setProvider] = useState<PmsProvider>(() => resolveProvider('mock'));

  useEffect(() => {
    let mounted = true;
    resolveProviderForHotel(hotelId ?? '').then((resolved) => {
      if (mounted) setProvider(resolved);
    });
    return () => {
      mounted = false;
    };
  }, [hotelId]);

  return useMemo(
    () => ({
      provider,
      listRooms: () => provider.listRooms(),
      listReservations: (params?: Parameters<typeof provider.listReservations>[0]) =>
        provider.listReservations(params),
      listGuests: (params?: Parameters<typeof provider.listGuests>[0]) =>
        provider.listGuests(params),
      getArrivals: (params?: Parameters<typeof provider.getArrivals>[0]) =>
        provider.getArrivals(params),
      getDepartures: (params?: Parameters<typeof provider.getDepartures>[0]) =>
        provider.getDepartures(params),
    }),
    [provider]
  );
}
