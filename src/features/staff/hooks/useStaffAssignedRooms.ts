import { useCallback, useEffect, useState } from 'react';

import { isSupabaseConfigured } from '@/lib/supabase';
import type { RoomCardData } from '@features/rooms/types/allRooms.types';
import { loadStaffAssignedRooms } from '../services/staffRooms';

export interface UseStaffAssignedRoomsResult {
  /** `null` until the first load completes; `[]` means genuinely none. */
  rooms: RoomCardData[] | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Identity for a query, so a change of person or shift starts a new load. */
function keyOf(userId: string | null, shift: 'AM' | 'PM', generation: number): string {
  return userId ? `${userId}|${shift}|${generation}` : '';
}

/**
 * The rooms one person holds this shift.
 *
 * Same shape as `useStaffRoster` and `useRoomPickerRooms`: one piece of state
 * with `loading` derived by key comparison, so nothing calls `setState`
 * synchronously inside the effect body.
 *
 * `refresh` exists for pull-to-refresh and for coming back from Room Detail,
 * where a status may have changed under us.
 */
export function useStaffAssignedRooms(
  userId: string | null,
  shift: 'AM' | 'PM'
): UseStaffAssignedRoomsResult {
  const [generation, setGeneration] = useState(0);
  const [loaded, setLoaded] = useState<{
    key: string;
    rooms?: RoomCardData[];
    error?: string;
  } | null>(null);

  const key = keyOf(userId, shift, generation);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;

    let cancelled = false;
    loadStaffAssignedRooms(userId, shift)
      .then((rooms) => {
        if (!cancelled) setLoaded({ key, rooms });
      })
      .catch((e) => {
        if (__DEV__) console.warn('[useStaffAssignedRooms] Could not load rooms', e);
        if (!cancelled) setLoaded({ key, error: 'Could not load rooms' });
      });

    return () => {
      cancelled = true;
    };
    // `key` folds every input; listing them all would re-run on the same value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const refresh = useCallback(() => setGeneration((n) => n + 1), []);

  return {
    rooms: loaded?.rooms ?? null,
    loading: !!userId && isSupabaseConfigured && loaded?.key !== key,
    error: loaded?.error ?? null,
    refresh,
  };
}

export default useStaffAssignedRooms;
