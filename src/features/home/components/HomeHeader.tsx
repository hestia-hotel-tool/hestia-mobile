import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text } from '@/tw';
import { Avatar, SegmentedToggle } from '@/components';
import type { ShiftType } from '@/types/shift.types';

const SHIFT_OPTIONS = [
  { value: 'AM' as ShiftType, label: 'AM' },
  { value: 'PM' as ShiftType, label: 'PM' },
] as const;

export type HomeHeaderProps = {
  name?: string | null;
  role?: string | null;
  avatarUrl?: string | null;
  shift: ShiftType;
  onShiftChange: (shift: ShiftType) => void;
};

/**
 * Dashboard header — Figma node 2702:3463.
 *
 * Who you are on the left, which shift you are looking at on the right.
 *
 * The old version positioned all three children absolutely inside a fixed
 * 180px band and hand-computed the space left for the name:
 *
 *   const HEADER_TOGGLE_RESERVE = (59.5 + 121 + 8) * scaleX;
 *   const HEADER_PROFILE_LEFT = (22 + 51 + 12) * scaleX;
 *   PROFILE_INFO_MAX_WIDTH = SCREEN_WIDTH - HEADER_PROFILE_LEFT - HEADER_TOGGLE_RESERVE;
 *
 * A flex row with `flex-1` on the middle column does that arithmetic itself, at
 * any width, and keeps working when a name or a job title is longer than the
 * designer's sample. "Assistant to General & Hotel Manager" is a real job title
 * in the spec and does not fit the old reserve.
 */
export function HomeHeader({ name, role, avatarUrl, shift, onShiftChange }: HomeHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      // gap-2xl, not gap-lg: node 2702:3468 hangs a country flag off the
      // avatar's bottom-right, so the design leaves 25px before the name.
      className="w-full flex-row items-center gap-2xl bg-surface-dashboard px-xl pb-xl"
      // Status bar height is a runtime value, so it stays a style.
      style={{ paddingTop: insets.top + 12 }}
    >
      <Avatar uri={avatarUrl} name={name} size={51} />

      <View className="flex-1">
        <Text
          className="font-hestia-primary text-hestia-2xl font-light text-ink-primary"
          numberOfLines={1}
        >
          {name ?? 'Staff'}
        </Text>
        {!!role && (
          <Text
            className="font-hestia-primary text-hestia-md text-ink-primary"
            numberOfLines={1}
          >
            {role}
          </Text>
        )}
      </View>

      <SegmentedToggle options={SHIFT_OPTIONS} value={shift} onChange={onShiftChange} />
    </View>
  );
}

export default HomeHeader;
