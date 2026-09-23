import React from 'react';

import { Pressable } from '@/tw';
import { scaleX } from '@/utils/responsive';
import type { StaffRosterPerson } from '../../types/staffRoster.types';
import StaffIdentityRow from './StaffIdentityRow';
import { STAFF_LIST_LAYOUT as L } from './staffListLayout';

/**
 * An On Break / Shift End row — Figma 3240:643 and 3240:688.
 *
 * Identity and nothing else: someone who is not working has no workload to
 * show, and the frame gives them a plain row at a 78 pitch. The two groups draw
 * the same component — the frame's 5px difference in their left inset (39 vs
 * 34) is the same row pasted twice, not two designs.
 */
export default function StaffCompactRow({
  person,
  onPress,
}: {
  person: StaffRosterPerson;
  onPress?: () => void;
}) {
  const s = (n: number) => n * scaleX;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={{
        paddingLeft: s(L.compactRow.paddingLeft),
        paddingVertical: s(L.compactRow.paddingVertical),
      }}
    >
      <StaffIdentityRow person={person} />
    </Pressable>
  );
}
