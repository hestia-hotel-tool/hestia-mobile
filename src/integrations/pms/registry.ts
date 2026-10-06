/**
 * PMS provider registry.
 *
 * Resolves the right PmsProvider for a hotel. Today every hotel defaults to
 * the mock adapter. When hotels get a `pms_provider` column (future
 * migration), `resolveProviderForHotel` will read it from the DB.
 */
import type { PmsProviderId } from './types';
import type { PmsProvider } from './PmsProvider';
import { MockPmsProvider } from './mock';
import { MewsProvider } from './mews';
import { CloudbedsProvider } from './cloudbeds';

const registry: Record<PmsProviderId, () => PmsProvider> = {
  mock: () => new MockPmsProvider(),
  mews: () => new MewsProvider(),
  cloudbeds: () => new CloudbedsProvider(),
};

export function resolveProvider(providerId: PmsProviderId): PmsProvider {
  const create = registry[providerId];
  if (!create) {
    throw new Error(`[pms] Unknown PMS provider id: ${providerId}`);
  }
  return create();
}

/** TODO(migration): read from hotels.pms_provider when the column exists. */
export async function resolveProviderForHotel(_hotelId: string): Promise<PmsProvider> {
  return resolveProvider('mock');
}
