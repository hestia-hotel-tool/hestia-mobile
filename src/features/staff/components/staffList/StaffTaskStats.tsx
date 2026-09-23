import React from 'react';

import { View, Text } from '@/tw';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import type { StaffWorkload } from '../../types/staffRoster.types';
import { STAFF_LIST_LAYOUT as L } from './staffListLayout';

/**
 * "Inprogress. 1   Cleaned. 3   Dirty. 3" — Figma 3809:152-154.
 *
 * **`justify-between`, not the frame's `left: 42 / 168 / 291`.** Those three
 * absolute offsets are what the old `STAFF_CARD.taskStats` held, and they
 * collide the moment a count reaches three digits or the user raises their
 * type size. The frame's spacing falls out of this for the values it drew.
 *
 * The label keeps the frame's full stop — "Inprogress." is what 3809:154 says,
 * and it is not a typo to fix silently.
 */
export default function StaffTaskStats({ work }: { work: StaffWorkload }) {
  const s = (n: number) => n * scaleX;
  const cells: { label: string; value: number }[] = [
    { label: 'Inprogress', value: work.inProgress },
    { label: 'Cleaned', value: work.cleaned },
    { label: 'Dirty', value: work.dirty },
  ];

  return (
    <View
      className="flex-row items-center justify-between"
      style={{ marginTop: s(L.taskStats.marginTop), paddingRight: s(L.taskStats.paddingRight) }}
    >
      {cells.map(({ label, value }) => (
        <Text
          key={label}
          className="font-hestia-primary text-ink-primary"
          style={{ fontSize: s(L.taskStats.fontSize), fontFamily: typography.fontFamily.primary }}
        >
          {label}. <Text className="font-bold">{value}</Text>
        </Text>
      ))}
    </View>
  );
}
