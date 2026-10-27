import React from 'react';
import { Modal, Pressable as RNPressable } from 'react-native';

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
}

/**
 * The Action pill's menu — Reassign Rooms, Assign Rooms and Unassign, a rule
 * between each, over the page. Tapping outside closes it.
 */
export default function StaffActionMenu({ visible, top, onClose, onSelect }: StaffActionMenuProps) {
  const s = (n: number) => n * scaleX;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* The page under the header blurs, as in the frame; the header stays sharp. */}
      <BlurBackdrop top={top} onPress={onClose} accessibilityLabel="Close menu" />
      {/* A tap on the (unblurred) header closes it too. */}
      <RNPressable style={{ position: 'absolute', top: 0, left: 0, right: 0, height: top }} onPress={onClose} />
      <View
        style={{
          position: 'absolute',
          top,
          right: s(M.right),
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
        {ITEMS.map((item, index) => (
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
                {item.label}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Modal>
  );
}
