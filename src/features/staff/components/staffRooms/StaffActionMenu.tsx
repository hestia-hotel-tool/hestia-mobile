import React from 'react';
import { Modal, Platform, Pressable as RNPressable, useWindowDimensions } from 'react-native';

import { View, Text, Pressable } from '@/tw';
import { Icon, type IconName } from '@/components/Icon';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';
import { BlurBackdrop } from '@/components/ui/BlurBackdrop';

export type StaffRoomsAction = 'reassign' | 'assign' | 'unassign';

/**
 * Glyphs exported from the frame (4361:4717, 4361:4693, 4360:4687), drawn at
 * their own heights. `height` is the row's share of the card (rules at 90 and
 * 162); `glyphTop` / `labelTop` are measured from the row's top, as the frame
 * places them — the labels sit a little below the glyphs' centres.
 */
const ITEMS: { key: StaffRoomsAction; label: string; icon: IconName; glyph: number; height: number; glyphTop: number; labelTop: number }[] = [
  { key: 'reassign', label: 'Reassign Rooms', icon: 'action-reassign-rooms', glyph: 25, height: 90, glyphTop: 39, labelTop: 41 },
  { key: 'assign', label: 'Assign Rooms', icon: 'action-assign-rooms', glyph: 28, height: 71, glyphTop: 17, labelTop: 29 },
  // The frame spells it "Unasign"; that is a typo, not a label.
  { key: 'unassign', label: 'Unassign', icon: 'action-unassign-rooms', glyph: 26, height: 81, glyphTop: 20, labelTop: 29 },
];

/**
 * Figma 4360:4196, node 4360:4663 (440 frame): a 302 × 244 white card,
 * radius 6, a 1px #e6e6e6 edge and a wide #6483b0 @ 40% shadow, hanging
 * flush from the header's bottom edge, 26 in from the right. Glyphs 29.5 in,
 * labels at 79 in Helvetica 17 #1e1e1e (box 21 tall); rules 256 wide from the
 * glyphs' edge, black @ 11%.
 */
const M = {
  width: 302,
  right: 26,
  radius: 6,
  glyphLeft: 29.5,
  glyphSlot: 28,
  labelLeft: 79,
  labelHeight: 21,
  rule: 256,
  font: 17,
} as const;

interface StaffActionMenuProps {
  visible: boolean;
  /** Window y where the header ends: the menu hangs from it, under the Action pill. */
  top: number;
  onClose: () => void;
  onSelect: (action: StaffRoomsAction) => void;
  /** Which rows, in order. All three by default (Staff → rooms). */
  items?: readonly StaffRoomsAction[];
  /** A row's label in place of the frame's — e.g. "Reassign Room" for one room. */
  labels?: Partial<Record<StaffRoomsAction, string>>;
  /** Window x of the card's left edge. Without it the card sits 26 in from the right. */
  left?: number;
  /** Window y from which the page blurs; `top` by default (the header stays sharp). */
  blurTop?: number;
  /**
   * A rectangle left sharp inside the blur — the card the menu is about, so
   * it stays clear which room this is (the VIP popover's treatment). With it
   * the blur is lighter, as there: the page stays readable as context.
   */
  spotlight?: { x: number; y: number; width: number; height: number } | null;
  /**
   * Window x the tail points at: a white triangle on the card's top edge,
   * pointing up at what opened it (the status and VIP popovers' tail). The
   * caller leaves `STAFF_ACTION_MENU_TAIL.height` between that and `top`.
   */
  tailX?: number;
}

/** The status / VIP popovers' tail (`action-tooltip-tail`), at the menu's scale. */
export const STAFF_ACTION_MENU_TAIL = { width: 37.82 * scaleX, height: 13.54 * scaleX } as const;

/** The VIP popover's lighter wash (VipInfoPopover LIGHT_BLUR): context stays readable. */
const SPOTLIGHT_BLUR = { intensity: 30, androidScrimOpacity: 0.55 } as const;

/** The card's height for a set of rows — for a caller deciding whether it fits below its anchor. */
export function staffActionMenuHeight(items: readonly StaffRoomsAction[] = ITEMS.map((i) => i.key)): number {
  const rows = ITEMS.filter((i) => items.includes(i.key));
  return rows.reduce((sum, i) => sum + i.height * scaleX, 0) + Math.max(0, rows.length - 1) + 2;
}

/**
 * The Action pill's menu — Reassign Rooms, Assign Rooms and Unassign, a rule
 * between each, over the page. Tapping outside closes it.
 */
export default function StaffActionMenu({
  visible,
  top,
  onClose,
  onSelect,
  items,
  labels,
  left,
  blurTop,
  spotlight,
  tailX,
}: StaffActionMenuProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const s = (n: number) => n * scaleX;
  const rows = items ? ITEMS.filter((i) => items.includes(i.key)).sort((a, b) => items.indexOf(a.key) - items.indexOf(b.key)) : ITEMS;
  const sharpTop = blurTop ?? top;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      // Callers place it in window coordinates (measureInWindow), status bar included.
      statusBarTranslucent={Platform.OS === 'android'}
    >
      {spotlight ? (
        <Spotlight
          rect={spotlight}
          clearAbove={sharpTop}
          windowWidth={windowWidth}
          windowHeight={windowHeight}
          onClose={onClose}
        />
      ) : (
        <>
          {/* The page under the header blurs, as in the frame; the header stays sharp. */}
          <BlurBackdrop top={sharpTop} onPress={onClose} accessibilityLabel="Close menu" />
          {/* A tap on the (unblurred) header closes it too. */}
          {sharpTop > 0 ? (
            <RNPressable style={{ position: 'absolute', top: 0, left: 0, right: 0, height: sharpTop }} onPress={onClose} />
          ) : null}
        </>
      )}
      <View
        style={{
          position: 'absolute',
          top,
          ...(left != null ? { left } : { right: s(M.right) }),
          width: s(M.width),
          borderRadius: s(M.radius),
          borderWidth: 1,
          borderColor: '#e6e6e6',
          backgroundColor: '#ffffff',
          // Figma: drop shadow #6483b0 @ 40%, blur 105, no offset.
          shadowColor: '#6483b0',
          shadowOpacity: 0.4,
          shadowRadius: s(40),
          shadowOffset: { width: 0, height: 0 },
          elevation: 12,
        }}
        accessibilityRole="menu"
      >
        {rows.map((item, index) => (
          <View key={item.key}>
            {index > 0 ? (
              <View style={{ marginLeft: s(M.glyphLeft), width: s(M.rule), height: 1, backgroundColor: 'rgba(0,0,0,0.11)' }} />
            ) : null}
            <Pressable
              onPress={() => onSelect(item.key)}
              style={({ pressed }) => ({ height: s(item.height), opacity: pressed ? 0.6 : 1 })}
              accessibilityRole="menuitem"
            >
              <View style={{ position: 'absolute', top: s(item.glyphTop), left: s(M.glyphLeft), width: s(M.glyphSlot), alignItems: 'center' }}>
                <Icon name={item.icon} size={s(item.glyph)} color="#5a759d" />
              </View>
              <Text
                numberOfLines={1}
                style={{
                  position: 'absolute',
                  top: s(item.labelTop),
                  left: s(M.labelLeft),
                  height: s(M.labelHeight),
                  lineHeight: s(M.labelHeight),
                  fontSize: s(M.font),
                  fontFamily: typography.fontFamily.primary,
                  fontWeight: '400',
                  color: '#1e1e1e',
                }}
              >
                {labels?.[item.key] ?? item.label}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
      {tailX != null ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            // Overlaps the card's top edge by a point, so the seam disappears.
            top: top - STAFF_ACTION_MENU_TAIL.height + 1,
            left: tailLeft(tailX, left, s(M.width), s(M.right), windowWidth),
          }}
        >
          <Icon
            name="action-tooltip-tail"
            width={STAFF_ACTION_MENU_TAIL.width}
            height={STAFF_ACTION_MENU_TAIL.height}
            color="#ffffff"
          />
        </View>
      ) : null}
    </Modal>
  );
}

/**
 * Blur around a sharp rectangle: above it (below the header), below it, and
 * the strips at its sides. Everything sharp — the header and the rectangle —
 * still closes the menu on a tap, as the blur does.
 */
function Spotlight({
  rect,
  clearAbove,
  windowWidth,
  windowHeight,
  onClose,
}: {
  rect: { x: number; y: number; width: number; height: number };
  clearAbove: number;
  windowWidth: number;
  windowHeight: number;
  onClose: () => void;
}) {
  const top = Math.max(clearAbove, rect.y);
  const bottom = Math.max(top, rect.y + rect.height);
  const right = Math.min(windowWidth, rect.x + rect.width);
  const label = 'Close menu';
  return (
    <>
      {clearAbove > 0 ? (
        <RNPressable style={{ position: 'absolute', top: 0, left: 0, right: 0, height: clearAbove }} onPress={onClose} />
      ) : null}
      {top > clearAbove ? (
        <BlurBackdrop
          {...SPOTLIGHT_BLUR}
          top={clearAbove}
          style={{ bottom: undefined, height: top - clearAbove }}
          onPress={onClose}
          accessibilityLabel={label}
        />
      ) : null}
      {rect.x > 0 ? (
        <BlurBackdrop
          {...SPOTLIGHT_BLUR}
          top={top}
          style={{ bottom: undefined, right: undefined, width: rect.x, height: bottom - top }}
          onPress={onClose}
          accessibilityLabel={label}
        />
      ) : null}
      {right < windowWidth ? (
        <BlurBackdrop
          {...SPOTLIGHT_BLUR}
          top={top}
          style={{ bottom: undefined, left: right, height: bottom - top }}
          onPress={onClose}
          accessibilityLabel={label}
        />
      ) : null}
      {/* The card itself: sharp, and a tap on it closes the menu. */}
      <RNPressable
        style={{ position: 'absolute', top, left: rect.x, width: rect.width, height: bottom - top }}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={label}
      />
      {bottom < windowHeight ? (
        <BlurBackdrop {...SPOTLIGHT_BLUR} top={bottom} onPress={onClose} accessibilityLabel={label} />
      ) : null}
    </>
  );
}

/** The tail's left edge: centred on `x`, but never past the card's rounded corners. */
function tailLeft(x: number, left: number | undefined, width: number, right: number, windowWidth: number): number {
  const cardLeft = left ?? windowWidth - right - width;
  const inset = 14 * scaleX;
  const min = cardLeft + inset;
  const max = cardLeft + width - inset - STAFF_ACTION_MENU_TAIL.width;
  return Math.min(Math.max(x - STAFF_ACTION_MENU_TAIL.width / 2, min), max);
}
