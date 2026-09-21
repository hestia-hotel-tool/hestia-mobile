import React from 'react';
import * as Clipboard from 'expo-clipboard';
import { Pressable, Text, View } from '@/tw';
import { Icon } from '@/components/Icon';
import { useToast } from '@/contexts/ToastContext';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import { LOST_AND_FOUND_CARD_LAYOUT as L } from './lostAndFoundCardLayout';
import { MetaChip } from './MetaChip';

export type ItemCardHeaderProps = {
  itemName: string;
  itemId: string;
};

/**
 * Item name, tracking chip and copy button — Figma nodes 3871:3601 / 3602 and
 * 3128:343.
 *
 * **A flex row, not three absolute boxes.** The frame puts the chip at x=163
 * after a 121-wide title and at x=211 after a 165-wide one — it follows the
 * title rather than sitting at a fixed offset, which is exactly what the old
 * `LOST_AND_FOUND_CONTENT.itemId.left = 149` could not express. The title takes
 * the space it needs and shrinks before the chip does.
 */
export function ItemCardHeader({ itemName, itemId }: ItemCardHeaderProps) {
  const toast = useToast();

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(itemId);
      toast.show(`Item ID "${itemId}" copied to clipboard`, {
        type: 'success',
        title: 'Copied',
      });
    } catch {
      toast.show('Failed to copy item ID', { type: 'error', title: 'Error' });
    }
  };

  return (
    <View className="flex-row items-center" style={{ gap: 10 * scaleX }}>
      <Text
        className="shrink font-hestia-primary font-bold text-ink-primary"
        numberOfLines={2}
        style={{
          fontSize: L.titleFontSize * scaleX,
          fontFamily: typography.fontFamily.primary,
        }}
      >
        {itemName}
      </Text>

      <MetaChip label={itemId} size="tracking" />

      <Pressable
        onPress={handleCopy}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Copy tracking number ${itemId}`}
      >
        {/*
          Node 3128:343 — 13x13. `action-copy` has a 14x14 viewBox, aspect 1, so
          a height of 13 paints 13x13.
        */}
        <Icon
          name="action-copy"
          size={13 * scaleX}
          color="#1e1e1e"
          style={{ opacity: 0.6 }}
        />
      </Pressable>
    </View>
  );
}

export default ItemCardHeader;
