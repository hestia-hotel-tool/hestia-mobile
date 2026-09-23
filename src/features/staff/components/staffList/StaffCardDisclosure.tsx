import React from 'react';

import { View, Text, Pressable } from '@/tw';
import { Icon } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import { STAFF_LIST_LAYOUT as L } from './staffListLayout';

interface StaffCardDisclosureProps {
  isOpen: boolean;
  onPress: () => void;
  /** "See rooms" for cleaning departments, "See tickets" otherwise. */
  label: string;
  /**
   * Drawn beside the chevron, or kept for the screen reader alone.
   *
   * The closed roster entry is a **bare chevron** (node 4211:609 carries no
   * label); the words appear once the card is open, inside it, as 4211:500
   * draws them. The label is still passed when hidden — a chevron with no
   * accessible name is a button that announces itself as "button".
   */
  showLabel: boolean;
}

/**
 * The open/close control — node 4211:500.
 *
 * A chevron that points **right** in both states, with "See rooms" in 16px
 * `#5a759d` beside it only once the card is open.
 *
 * Right, not down, because `3240:708` measures **11 wide by 21 tall**: a
 * portrait box is a sideways chevron. An earlier pass read the group's y
 * offset as a −90° rotation and drew it pointing down. `action-chevron` points
 * left, so right is 180°.
 *
 * It does not turn on open. An accordion chevron normally would, and a first
 * pass had it doing so — but the frame draws one vector at one angle, and the
 * open card announces itself with the whole card body plus the label the
 * closed row does not have. That is the state change; the chevron is not
 * carrying it.
 */
export default function StaffCardDisclosure({
  isOpen,
  onPress,
  label,
  showLabel,
}: StaffCardDisclosureProps) {
  const s = (n: number) => n * scaleX;

  return (
    <Pressable
      onPress={onPress}
      // Wider when the words are gone: an 11x21 glyph is well under the 44pt
      // minimum on its own.
      hitSlop={showLabel ? 12 : 22}
      accessibilityRole="button"
      accessibilityState={{ expanded: isOpen }}
      accessibilityLabel={isOpen ? `Hide ${label.replace(/^See /, '')}` : label}
      className="flex-row items-center"
      style={{ gap: s(L.disclosure.gap) }}
    >
      {showLabel ? (
        <Text
          className="font-hestia-primary text-ink-accent"
          style={{
            fontSize: s(L.disclosure.fontSize),
            fontFamily: typography.fontFamily.primary,
          }}
        >
          {label}
        </Text>
      ) : null}
      <View style={{ transform: [{ rotate: '180deg' }] }}>
        <Icon name="action-chevron" size={s(L.disclosure.chevron)} color="#5a759d" />
      </View>
    </Pressable>
  );
}
