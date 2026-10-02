import React from 'react';

import { View, Text } from '@/tw';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import type { StaffWorkload } from '../../types/staffRoster.types';
import { STAFF_LIST_LAYOUT as L } from './staffListLayout';

/**
 * "Inprogress. 1   Cleaned. 3   Dirty. 3" — Figma 3240:561 (nodes 4319:111–113).
 *
 * Light 16 in black with the numbers bold, 27 apart, under the workload bar.
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
      className="flex-row flex-wrap items-center"
      style={{ marginTop: s(L.taskStats.marginTop), columnGap: s(L.taskStats.gap) }}
    >
      {cells.map(({ label, value }) => (
        <Text
          key={label}
          className="font-hestia-primary text-black"
          style={{ fontSize: s(L.taskStats.fontSize), fontFamily: typography.fontFamily.primary, fontWeight: '300' }}
        >
          {label}. <Text style={{ fontWeight: '700' }}>{value}</Text>
        </Text>
      ))}
    </View>
  );
}
