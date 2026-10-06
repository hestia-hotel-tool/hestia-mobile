import React from 'react';

import { View, Text } from '@/tw';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import type { StaffShiftState } from '../../types/staffRoster.types';
import { SHIFT_GROUP_CHROME } from './staffShiftChrome';
import { STAFF_LIST_LAYOUT as L } from './staffListLayout';

/**
 * "On Shift" between two rules — Figma 3831:94 / 3831:89 / 3831:52.
 *
 * The frame draws the rules as two fixed 122-wide vectors at 38..160 and
 * 283..402. They are reproduced as `flex-1` instead: at 440 that yields the
 * same 122, and on a wider device the label stays centred rather than leaving
 * a gap on the right.
 */
export default function ShiftGroupHeading({ state }: { state: StaffShiftState }) {
  const s = (n: number) => n * scaleX;
  const chrome = SHIFT_GROUP_CHROME[state];

  return (
    <View
      className="flex-row items-center"
      style={{
        gap: s(L.groupHeading.gapAroundLabel),
        marginTop: s(L.groupHeading.marginTop),
        marginBottom: s(L.groupHeading.marginBottom),
      }}
      accessibilityRole="header"
    >
      <View className="h-px flex-1" style={{ backgroundColor: chrome.color, opacity: 0.45 }} />
      <Text
        className="font-hestia-primary font-bold"
        style={{
          fontSize: s(L.groupHeading.fontSize),
          fontFamily: typography.fontFamily.primary,
          color: chrome.color,
        }}
      >
        {chrome.title}
      </Text>
      <View className="h-px flex-1" style={{ backgroundColor: chrome.color, opacity: 0.45 }} />
    </View>
  );
}
