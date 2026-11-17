import { useCallback, useEffect, useState } from 'react';
import { fetchStorageLocations, type StorageLocation } from '../services/storageLocations';

/** The hotel's storage locations, loaded once and shared (services/storageLocations.ts). */
export function useStorageLocations() {
  const [locations, setLocations] = useState<StorageLocation[] | null>(null);

  const reload = useCallback(async (force = false) => {
    try {
      setLocations(await fetchStorageLocations({ force }));
    } catch {
      setLocations((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    locations,
    /** What the dropdown offers. */
    active: (locations ?? []).filter((l) => l.active),
    reload,
  };
}
