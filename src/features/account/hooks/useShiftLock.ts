import { useCallback, useEffect, useState } from 'react';
import { usePermissions } from '@/domain/rbac/usePermissions';
import { useNow } from '@/hooks/useNow';
import { useLiveRoomChanges } from '@/hooks/useLiveRoomChanges';
import { currentShiftNow, ensureHotelShifts, nextShiftStart } from '@/lib/hotelShifts';
import { getShiftFromTime } from '@/utils/shiftUtils';
import type { ShiftType } from '@/types/shift.types';
import { fetchMyAssignmentShifts, fetchMyRosteredShift } from '../services/myShift';

/** Not working the shift that is on now: the screen says so instead of showing an empty list. */
export type OffShift = {
  /** The shift that is on now, which they are not on. */
  shift: ShiftType;
  /** Their next shift and when it starts; null when nothing is planned for them. */
  next: { shift: ShiftType; startsAt: Date } | null;
};

export type ShiftLock = {
  /** Room attendants: no AM/PM toggle. */
  locked: boolean;
  /** The shift to show: the one on now (by the hotel's shift times). */
  shift: ShiftType;
  /** Set when a locked attendant has nothing on the current shift. */
  offShift: OffShift | null;
};

/** Re-read assignments this often even without a realtime event. */
const REFRESH_MS = 5 * 60_000;

/**
 * Room attendants do not toggle AM / PM: they see the shift that is on now.
 *
 * An attendant can hold rooms on both shifts in one day, so the screen follows
 * the clock — AM during the AM shift, PM during the PM shift — and switches by
 * itself when the shift changes while the app is open.
 *
 * When the shift on now is not theirs (no rooms on it and not rostered on it),
 * `offShift` says so and gives their next shift — the earliest start among the
 * shifts they have rooms on or are rostered on — so the screen can say
 * "You have no PM shift. Your next shift is AM, tomorrow at 06:00".
 *
 * Everyone else (`locked: false`) keeps the toggle; `shift` is still the clock's.
 */
export function useShiftLock(): ShiftLock {
  const { roomsVariant, homeVariant } = usePermissions();
  // Attendants, porters ("everything the same as the room attendant") and
  // laundry, who read the shift that is on now.
  const locked = roomsVariant === 'attendant' || roomsVariant === 'laundry' || homeVariant === 'hsk_portier';
  /** Never assigned rooms: only a rostered shift says when they work. */
  const neverAssigned = roomsVariant === 'laundry' || homeVariant === 'hsk_portier';

  // Ticks every 15s: the shift boundary is picked up within that.
  const nowMs = useNow(locked);
  const [shiftsLoaded, setShiftsLoaded] = useState(false);
  const shift = locked && shiftsLoaded ? currentShiftNow(new Date(nowMs)) : getShiftFromTime();

  const [mine, setMine] = useState<{ rostered: ShiftType | null; assigned: Set<ShiftType> } | null>(null);

  const load = useCallback(async () => {
    const [rostered, assigned] = await Promise.all([fetchMyRosteredShift(), fetchMyAssignmentShifts()]);
    setMine({ rostered, assigned });
  }, []);

  useEffect(() => {
    if (!locked) return;
    let cancelled = false;
    void ensureHotelShifts().then(() => {
      if (!cancelled) setShiftsLoaded(true);
    });
    void load();
    const timer = setInterval(() => void load(), REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [locked, load]);

  // Re-check at the shift change, and whenever rooms or assignments change
  // (a supervisor handing them PM rooms clears the notice at once).
  useEffect(() => {
    if (locked) void load();
  }, [locked, shift, load]);
  useLiveRoomChanges(() => void load(), { enabled: locked });

  let offShift: OffShift | null = null;
  // A porter or laundry attendant is never assigned rooms, so only a rostered
  // shift says when they work; one with none is treated as on every shift
  // rather than locked out.
  const unrostered = neverAssigned && mine != null && mine.rostered == null;
  // Laundry reads every room on the shift that is on now, whatever their own
  // roster says: the linen runs whenever rooms are being turned.
  if (locked && mine && !unrostered && roomsVariant !== 'laundry') {
    const works = (s: ShiftType) => mine.assigned.has(s) || mine.rostered === s;
    if (!works(shift)) {
      const now = new Date(nowMs);
      const candidates = (['AM', 'PM'] as ShiftType[]).filter((s) => s !== shift && works(s));
      const next = candidates
        .map((s) => ({ shift: s, startsAt: nextShiftStart(s, now) }))
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())[0];
      offShift = { shift, next: next ?? null };
    }
  }

  return { locked, shift, offShift };
}
