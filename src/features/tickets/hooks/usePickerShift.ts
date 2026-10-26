import { useEffect, useState } from 'react';
import { useShiftLock } from '@features/account/hooks/useShiftLock';
import { currentShiftLoaded } from '@/lib/hotelShifts';

/**
 * The shift a staff picker lists (client RBAC update, 2026-10-26): only the
 * target shift's staff appear.
 *
 * Someone who works both shifts gets AM / PM tabs, opening on the shift on
 * now (`canSwitch`). Someone locked to their own shift (attendants, porters —
 * useShiftLock) sees theirs only, with no tabs. `shift` is null until the
 * hotel's shift times are known.
 */
export function usePickerShift() {
  const lock = useShiftLock();
  const [chosen, setChosen] = useState<'AM' | 'PM' | null>(null);

  useEffect(() => {
    if (lock.locked) return;
    let cancelled = false;
    void currentShiftLoaded().then((s) => {
      if (!cancelled) setChosen((prev) => prev ?? s);
    });
    return () => {
      cancelled = true;
    };
  }, [lock.locked]);

  const shift: 'AM' | 'PM' | null = lock.locked ? lock.shift : chosen;
  return { shift, setShift: setChosen, canSwitch: !lock.locked };
}
