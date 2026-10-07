import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@features/auth/store/useAuthStore';

/** A burst of changes (a bulk assign is one row per room) becomes one reload. */
const DEBOUNCE_MS = 800;
/** Back from the background after this long: realtime may have missed events. */
const STALE_AFTER_BACKGROUND_MS = 30_000;

let channelSeq = 0;

export type RoomChange = {
  table: 'rooms' | 'room_assignments';
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  /** The row after the change, or before it for a delete. */
  row: Record<string, unknown>;
  /**
   * The row before the change, where realtime sends it. A delete under RLS
   * carries only the primary key, so a missing field means "unknown".
   */
  old: Record<string, unknown>;
};

export type UseLiveRoomChangesOptions = {
  /** No person chosen yet, say: hold no channel open. */
  enabled?: boolean;
  /**
   * Whether a change concerns this screen. Anything else is ignored, so an
   * attendant's Activity does not reload for every room in the hotel.
   * Read through a ref — an inline function is fine.
   */
  isRelevant?: (change: RoomChange) => boolean;
};

/**
 * Reload a screen when this hotel's rooms or room assignments change — and
 * only as often as it is worth it.
 *
 * - **Focused:** a relevant change reloads it, debounced, so a bulk assign of
 *   twelve rooms is one reload.
 * - **Hidden** (another screen on top; tab screens stay mounted with
 *   `freezeOnBlur`): a change only marks it stale, and it reloads once when
 *   it comes back into focus. Nothing runs for a screen no one is looking at.
 * - **Back from the background** after more than 30s: reload once, since the
 *   socket can be suspended and miss events while the app is backgrounded.
 *
 * No polling: `rooms` and `room_assignments` are in the realtime publication
 * (migration 20261005000600), filtered to this hotel, with RLS applied.
 */
export function useLiveRoomChanges(onChange: () => void, options: UseLiveRoomChangesOptions = {}) {
  const { enabled = true, isRelevant } = options;
  const hotelId = useAuthStore((s) => s.hotelId);

  const onChangeRef = useRef(onChange);
  const isRelevantRef = useRef(isRelevant);
  useEffect(() => {
    onChangeRef.current = onChange;
    isRelevantRef.current = isRelevant;
  }, [onChange, isRelevant]);

  const focused = useRef(false);
  const stale = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      stale.current = false;
      onChangeRef.current();
    }, DEBOUNCE_MS);
  }, []);

  // Focus: catch up once if something changed while hidden.
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (stale.current) schedule();
      return () => {
        focused.current = false;
        if (timer.current) {
          // A reload that had not fired yet is owed on return, not now.
          clearTimeout(timer.current);
          timer.current = null;
          stale.current = true;
        }
      };
    }, [schedule])
  );

  // Background → foreground after a while: the socket may have missed events.
  useEffect(() => {
    let backgroundedAt: number | null = null;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') backgroundedAt = Date.now();
      else if (state === 'active' && backgroundedAt != null) {
        const away = Date.now() - backgroundedAt;
        backgroundedAt = null;
        if (away < STALE_AFTER_BACKGROUND_MS) return;
        if (focused.current) schedule();
        else stale.current = true;
      }
    });
    return () => sub.remove();
  }, [schedule]);

  useEffect(() => {
    if (!enabled || !hotelId || !isSupabaseConfigured) return;

    const handle =
      (table: RoomChange['table']) =>
      (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as Record<string, unknown>;
        const test = isRelevantRef.current;
        if (
          test &&
          !test({
            table,
            event: payload.eventType,
            row: row ?? {},
            old: (payload.old as Record<string, unknown>) ?? {},
          })
        ) {
          return;
        }
        if (focused.current) schedule();
        else stale.current = true;
      };

    const filter = `hotel_id=eq.${hotelId}`;
    const channel: RealtimeChannel = supabase
      .channel(`live-rooms:${hotelId}:${(channelSeq += 1)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter }, handle('rooms'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_assignments', filter }, handle('room_assignments'))
      .subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      void supabase.removeChannel(channel);
    };
  }, [enabled, hotelId, schedule]);
}

export default useLiveRoomChanges;
