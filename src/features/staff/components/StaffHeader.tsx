import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { View, Text, Pressable } from '@/tw';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import { STAFF_LIST_LAYOUT as L } from './staffList/staffListLayout';

interface StaffHeaderProps {
  onBackPress: () => void;
}

/**
 * The blue band — Figma 3240:713, with the back chevron (3240:716) and the
 * title (3240:715).
 *
 * **No + .** The frame draws one at 3241:795, but it had no stated behaviour
 * and there is no add-staff flow, so it was wired to the assign-rooms screen —
 * a guess. A control that does something other than what its glyph promises is
 * worse than no control, and it is gone at your request. Bringing it back means
 * restoring this button, `header.addButton` in the layout table, and the
 * `staff.manage` gate in `StaffScreen`.
 *
 * `insets.top + safeAreaGap` rather than the frame's literal y=63: that number
 * already includes a status bar, so hard-coding it puts the title under the
 * Dynamic Island on a device whose inset differs. Same idiom as
 * `RoomDetailHeader`.
 */
export default function StaffHeader({ onBackPress }: StaffHeaderProps) {
  const insets = useSafeAreaInsets();
  const s = (n: number) => n * scaleX;

  return (
    <View
      className="flex-row items-center bg-surface-header"
      style={{
        paddingTop: insets.top + s(L.header.safeAreaGap),
        paddingBottom: s(L.header.paddingBottom),
        paddingHorizontal: s(L.gutter),
        // The + used to set this; see `header.contentMinHeight`.
        minHeight: insets.top + s(L.header.safeAreaGap + L.header.contentMinHeight + L.header.paddingBottom),
      }}
    >
      <Pressable
        onPress={onBackPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Back"
        className="items-center justify-center"
        style={{ width: s(L.header.backChevron), height: s(L.header.backChevron) }}
      >
        {/* `action-chevron` already points left. */}
        <Icon name="action-chevron" size={s(L.header.backChevron)} color="#607aa1" />
      </Pressable>

      <Text
        className="flex-1 font-hestia-primary font-bold"
        numberOfLines={1}
        style={{
          marginLeft: s(L.header.titleMarginLeft),
          fontSize: s(L.header.titleFontSize),
          fontFamily: typography.fontFamily.primary,
          color: '#607aa1',
        }}
      >
        Staff
      </Text>
    </View>
  );
}
