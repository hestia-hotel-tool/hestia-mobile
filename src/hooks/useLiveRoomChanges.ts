import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@features/auth/store/useAuthStore';

/** A burst of changes (a bulk assign is one row per room) becomes one reload. */
const DEBOUNCE_MS = 400;

let channelSeq = 0;

/**
 * Call `onChange` when this hotel's rooms or room assignments change —
 * a status set, a room started or paused, a room assigned or unassigned.
 *
 * Both tables are in the realtime publication (migration
 * 20261005000600); realtime applies the subscriber's RLS, and the
 * `hotel_id` filter keeps the stream to this hotel either way. The callback
 * is debounced and read through a ref, so callers can pass an inline
 * function without resubscribing on every render.
 *
 * `enabled: false` (no person chosen yet, say) holds no channel open.
 */
export function useLiveRoomChanges(onChange: () => void, enabled = true) {
  const hotelId = useAuthStore((s) => s.hotelId);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled || !hotelId || !isSupabaseConfigured) return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const fire = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => onChangeRef.current(), DEBOUNCE_MS);
    };

    const filter = `hotel_id=eq.${hotelId}`;
    const channel: RealtimeChannel = supabase
      .channel(`live-rooms:${hotelId}:${(channelSeq += 1)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter }, fire)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_assignments', filter }, fire)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [enabled, hotelId]);
}

export default useLiveRoomChanges;
