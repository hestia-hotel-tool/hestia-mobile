import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { uniqueChannelName } from '@/lib/realtimeChannel';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import type { ShiftType } from '@/types/shift.types';
import { fetchPorterChecks, runPorterAction } from '../services/porterChecks';
import { porterStatusAfter, type PorterAction, type PorterCheck, type PorterStatus } from '../utils/porter';

/**
 * The porter marks for a shift, live: loaded on mount and shift change,
 * re-read when anyone's mark changes (realtime on `porter_room_checks`), and
 * updated optimistically when this porter acts — rolled back if the server
 * refuses.
 */
export function usePorterChecks(shift: ShiftType, enabled: boolean) {
  const hotelId = useAuthStore((s) => s.hotelId);
  const [checks, setChecks] = useState<Map<string, PorterCheck>>(new Map());
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);
  const shiftRef = useRef(shift);
  shiftRef.current = shift;

  const reload = useCallback(async () => {
    if (!enabled) return;
    try {
      const next = await fetchPorterChecks(shiftRef.current);
      setChecks(next);
    } catch (e) {
      if (__DEV__) console.warn('[usePorterChecks]', e);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload, shift]);

  useEffect(() => {
    if (!enabled || !hotelId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel(uniqueChannelName(`porter-checks-${hotelId}`))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'porter_room_checks', filter: `hotel_id=eq.${hotelId}` },
        () => {
          // A burst (several porters) becomes one read.
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => void reload(), 400);
        }
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [enabled, hotelId, reload]);

  const statusOf = useCallback(
    (roomId: string): PorterStatus => checks.get(roomId)?.status ?? 'unchecked',
    [checks]
  );

  const act = useCallback(
    async (roomId: string, action: PorterAction) => {
      const before = checks;
      const status = porterStatusAfter(action);
      setChecks((prev) => {
        const next = new Map(prev);
        if (status === 'unchecked') next.delete(roomId);
        else {
          const now = new Date().toISOString();
          next.set(roomId, {
            ...(prev.get(roomId) ?? { userId: null, userName: null, startedAt: null, pausedAt: null, checkedAt: null }),
            status,
            ...(status === 'checked' ? { checkedAt: now } : null),
          } as PorterCheck);
        }
        return next;
      });
      setBusyRoomId(roomId);
      try {
        await runPorterAction(roomId, action, shiftRef.current);
        void reload();
      } catch (e) {
        setChecks(before);
        throw e;
      } finally {
        setBusyRoomId(null);
      }
    },
    [checks, reload]
  );

  return { checks, statusOf, act, busyRoomId, reload };
}
