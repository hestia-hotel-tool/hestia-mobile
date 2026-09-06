import React from 'react';
import { Modal } from 'react-native';
import { View, Pressable } from '@/tw';
import { colors } from '@/theme';
import { Icon } from '@/components/Icon';
import { BlurBackdrop } from '@/components/ui/BlurBackdrop';

/** Figma: the filter glyph is 32x14 — `action-filter` is 2:1, so height drives it. */
const FILTER_ICON_HEIGHT = 16;
const FILTER_ICON_HIT = 40;

export type FilterModalOverlayProps = {
  visible: boolean;
  onClose: () => void;
  /** Absolute y the sheet starts at. */
  sheetTop: number;
  /** Absolute y the blur starts at — above it the screen's header stays crisp. */
  blurTop: number;
  /**
   * Pins the sheet's bottom edge, giving it a bounded height to scroll inside.
   * Omit for a sheet that sizes to its content.
   */
  sheetBottom?: number;
  /** Draws the filter glyph above the overlay at this y. Omit to leave it out. */
  filterIconTop?: number;
  onFilterIconPress?: () => void;
  /** Caps the sheet width so it does not stretch on a tablet. */
  maxWidth?: number;
  children: React.ReactNode;
};

/**
 * The shell every filter sheet opens in: a full-screen modal that blurs the
 * screen below a given y, closes on a tap outside, and optionally keeps the
 * filter glyph visible on top so the control that opened the sheet still reads
 * as pressed.
 *
 * Positions come in as props because each screen's chrome is a different height
 * — Home measures its header, All Rooms has a search bar inside one — and this
 * component has no way to know that. Only the layering and the dismiss
 * behaviour live here.
 */
export function FilterModalOverlay({
  visible,
  onClose,
  sheetTop,
  blurTop,
  sheetBottom,
  filterIconTop,
  onFilterIconPress,
  maxWidth,
  children,
}: FilterModalOverlayProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1">
        {/* Above the blur, so the glyph that opened this stays crisp. */}
        {onFilterIconPress && filterIconTop !== undefined && (
          <Pressable
            onPress={onFilterIconPress}
            accessibilityRole="button"
            accessibilityLabel="Close filters"
            className="absolute right-3.75 items-center justify-center"
            style={{
              top: filterIconTop,
              width: FILTER_ICON_HIT,
              height: FILTER_ICON_HIT,
              zIndex: 1002,
            }}
          >
            <Icon name="action-filter" size={FILTER_ICON_HEIGHT} color={colors.primary.main} />
          </Pressable>
        )}

        {/* The chrome above `blurTop` — untouched, but still closes on a tap. */}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close filters"
          className="absolute left-0 right-0 top-0"
          style={{ height: blurTop, zIndex: 1001 }}
        />

        <BlurBackdrop
          top={blurTop}
          onPress={onClose}
          accessibilityLabel="Close filters"
          style={{ zIndex: 999 }}
        />

        <View
          pointerEvents="box-none"
          className="absolute left-[5%] w-[90%]"
          style={{
            top: sheetTop,
            ...(sheetBottom === undefined ? null : { bottom: sheetBottom }),
            ...(maxWidth === undefined ? null : { maxWidth }),
            zIndex: 1000,
          }}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
}

export default FilterModalOverlay;
