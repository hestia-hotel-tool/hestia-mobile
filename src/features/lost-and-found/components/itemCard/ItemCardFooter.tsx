import React from 'react';
import { Text, View } from '@/tw';
import { Avatar } from '@/components/ui/Avatar';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import { LOST_AND_FOUND_CARD_LAYOUT as L } from './lostAndFoundCardLayout';

export type ItemCardFooterProps = {
  /** "Stored by" or "Shipped By" — from the chrome row, not hardcoded. */
  label: string;
  name: string;
  timestamp: string;
  avatarUri?: string;
  /** The status pill, which the footer positions but does not own. */
  children?: React.ReactNode;
};

/**
 * Who handled the item, and the status pill — Figma nodes 3871:3593 onward.
 *
 * The divider (3871:3593) is 408 wide inside a 409 card, so it runs the full
 * width and cancels the card's horizontal padding with a negative margin. That
 * is the `TicketCard` idiom; drawing it at the padded width is the single most
 * common way this detail goes wrong.
 *
 * Uses `ui/Avatar` rather than the hand-rolled disc this replaces, which built
 * its own placeholder with `name.charAt(0)`. `Avatar` already derives two
 * initials and fills the disc, and it is the same component the ticket footer
 * uses — so the two features' footers now agree.
 */
export function ItemCardFooter({
  label,
  name,
  timestamp,
  avatarUri,
  children,
}: ItemCardFooterProps) {
  return (
    <View>
      <View
        className="bg-border-medium"
        style={{
          height: L.divider.height,
          marginHorizontal: -L.paddingLeft * scaleX,
          marginBottom: 10 * scaleX,
        }}
      />

      <Text
        className="font-hestia-primary font-light text-black"
        style={{ fontSize: 11 * scaleX, fontFamily: typography.fontFamily.primary }}
      >
        {label}
      </Text>

      <View className="flex-row items-center justify-between" style={{ marginTop: 8 * scaleX }}>
        <View className="shrink flex-row items-center" style={{ gap: 10 * scaleX }}>
          <Avatar uri={avatarUri} name={name} size={L.footerAvatar * scaleX} />
          <View className="shrink">
            <Text
              className="font-hestia-primary font-bold text-ink-primary"
              numberOfLines={1}
              style={{ fontSize: 13 * scaleX, fontFamily: typography.fontFamily.primary }}
            >
              {name}
            </Text>
            <Text
              className="font-hestia-primary font-light text-black"
              numberOfLines={1}
              style={{
                fontSize: 12 * scaleX,
                fontFamily: typography.fontFamily.primary,
                marginTop: 2 * scaleX,
              }}
            >
              {timestamp}
            </Text>
          </View>
        </View>

        {children}
      </View>
    </View>
  );
}

export default ItemCardFooter;
