import { useEffect, useState } from 'react';

import { isSupabaseConfigured } from '@/lib/supabase';
import { loadRoomPickerRooms } from '../services/roomPicker';
import type { RoomPickerRoom } from '../types/roomPicker.types';

export interface UseRoomPickerRoomsResult {
  rooms: RoomPickerRoom[];
  loading: boolean;
}

/** Stable identity, so a caller memoising on `rooms` does not rerun while empty. */
const NO_ROOMS: RoomPickerRoom[] = [];

/**
 * Load the rooms a `RoomNumberSelector` offers.
 *
 * `enabled` exists for the modal case: the Register sheet should not hold a
 * room list while it is closed, and should refetch when it opens, because a
 * reservation may have changed since the user last saw it. A refetch over an
 * already-loaded list is silent — the stale list stays on screen rather than
 * collapsing to a spinner.
 */
export function useRoomPickerRooms(enabled: boolean = true): UseRoomPickerRoomsResult {
  /*
   * `null` means "no fetch has completed yet", which is what `loading`
   * reports. One value rather than a separate `loading` flag, so that starting
   * a fetch never requires a synchronous setState inside the effect.
   */
  const [loaded, setLoaded] = useState<RoomPickerRoom[] | null>(null);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return;

    let cancelled = false;

    loadRoomPickerRooms()
      .then((next) => {
        if (!cancelled) setLoaded(next);
      })
      .catch((e) => {
        if (__DEV__) console.warn('[useRoomPickerRooms] Failed to load rooms', e);
        // An empty list, not a permanent spinner: the picker then says so.
        if (!cancelled) setLoaded([]);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    rooms: loaded ?? NO_ROOMS,
    loading: enabled && isSupabaseConfigured && loaded === null,
  };
}
