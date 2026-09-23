import { useCallback, useEffect, useState } from 'react';

import { isSupabaseConfigured } from '@/lib/supabase';
import { loadStaffRoster, type StaffRosterQuery } from '../services/staffRoster';
import type { StaffRoster } from '../types/staffRoster.types';

export interface UseStaffRosterResult {
  /** `null` until the first load completes. */
  roster: StaffRoster | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/** Identity for a query, so a change of department or shift starts a new load. */
function keyOf(query: StaffRosterQuery | null, generation: number): string {
  if (!query) return '';
  return `${query.departmentId}|${query.shift}|${query.statKind}|${generation}`;
}

/**
 * The roster for one department and shift.
 *
 * **One piece of state, and `loading` derived from it.** The screen this
 * replaces called `setDepartmentLoading(true)` and `setDepartmentError(null)`
 * at the top of its effect, which is exactly what `react-hooks/set-state-in-effect`
 * exists to stop — a synchronous setState in an effect body costs a second
 * render pass before the fetch has even begun. Same shape as
 * `features/rooms/hooks/useRoomPickerRooms.ts`.
 *
 * `loading` compares keys rather than testing for null, so switching department
 * keeps the previous roster on screen while the next one loads instead of
 * collapsing to a spinner and back.
 */
export function useStaffRoster(query: StaffRosterQuery | null): UseStaffRosterResult {
  const [generation, setGeneration] = useState(0);
  const [loaded, setLoaded] = useState<{
    key: string;
    roster?: StaffRoster;
    error?: string;
  } | null>(null);

  const key = keyOf(query, generation);

  useEffect(() => {
    if (!query || !isSupabaseConfigured) return;

    let cancelled = false;
    loadStaffRoster(query)
      .then((roster) => {
        if (!cancelled) setLoaded({ key, roster });
      })
      .catch((e) => {
        if (__DEV__) console.warn('[useStaffRoster] Could not load roster', e);
        if (!cancelled) setLoaded({ key, error: 'Could not load staff' });
      });

    return () => {
      cancelled = true;
    };
    // `key` folds every input; listing them all would re-run on the same value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const refresh = useCallback(() => setGeneration((n) => n + 1), []);

  return {
    roster: loaded?.roster ?? null,
    loading: !!query && isSupabaseConfigured && loaded?.key !== key,
    error: loaded?.error ?? null,
    refresh,
  };
}
