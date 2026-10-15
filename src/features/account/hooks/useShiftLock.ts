import { useEffect, useState } from 'react';
import { usePermissions } from '@/domain/rbac/usePermissions';
import { getShiftFromTime } from '@/utils/shiftUtils';
import type { ShiftType } from '@/types/shift.types';
import { fetchMyRosteredShift } from '../services/myShift';

/**
 * Room attendants work one shift: theirs. They do not get the AM/PM toggle —
 * Home and Rooms open on their rostered shift (`users.shift_id`), or, when none
 * is set, the shift the clock is in.
 *
 * Everyone else (`locked: false`) keeps the toggle and the clock default.
 */
export function useShiftLock(): { locked: boolean; shift: ShiftType } {
  const { roomsVariant } = usePermissions();
  const locked = roomsVariant === 'attendant';
  const [rostered, setRostered] = useState<ShiftType | null>(null);

  useEffect(() => {
    if (!locked) return;
    let cancelled = false;
    void fetchMyRosteredShift().then((shift) => {
      if (!cancelled) setRostered(shift);
    });
    return () => {
      cancelled = true;
    };
  }, [locked]);

  return { locked, shift: rostered ?? getShiftFromTime() };
}
