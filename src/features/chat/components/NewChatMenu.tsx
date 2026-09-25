import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { Icon, type IconName } from '@/components/Icon';
import { typography } from '@/theme';
import { CHAT_COLORS, CHAT_LIST as L, scaleX } from '../constants/chatStyles';
import { NewChatFab } from './NewChatFab';

export type NewChatMenuOption = 'createGroup' | 'newChat' | 'announcement';

interface NewChatMenuProps {
  visible: boolean;
  onClose: () => void;
  onOptionPress: (option: NewChatMenuOption) => void;
  /** Show "General Announcement" — only for holders of `chat.announce`. */
  canAnnounce?: boolean;
}

/** Figma 1102:3610: Create Chat Group, New Chat, General Announcement. */
const OPTIONS: { id: NewChatMenuOption; label: string; icon: IconName; iconHeight: number }[] = [
  { id: 'createGroup', label: 'Create Chat Group', icon: 'action-group', iconHeight: 25 },
  { id: 'newChat', label: 'New Chat', icon: 'action-new-chat', iconHeight: 27 },
  { id: 'announcement', label: 'General Announcement', icon: 'action-announcement', iconHeight: 26 },
];

/** Design px on the 440-wide frame. */
const M = {
  /** Card x77 y434, 302x244, r6. It ends 17 above the + button. */
  left: 77,
  width: 302,
  radius: 6,
  gapAboveFab: 17,
  paddingTop: 14,
  paddingBottom: 8,
  rowHeight: 74,
  /** Icons at x107 (30 in), 27 wide; labels at x156. */
  iconLeft: 30,
  iconBox: 27,
  labelGap: 22,
  fontSize: 17,
  /** Rules x107–363: 30 in from the left, 16 from the right. */
  ruleRight: 16,
  /** Tinted band above, tab bar below — both stay sharp. */
  headerBand: 133,
  tabBar: 152,
} as const;

/**
 * The New Chat menu — Figma 1102:3610.
 *
 * The list between the header band and the tab bar goes behind a light blur;
 * the band, the tab bar and the + button stay sharp. A white card lists the
 * three options, sitting just above the +, which closes it.
 */
export default function NewChatMenu({ visible, onClose, onOptionPress, canAnnounce = false }: NewChatMenuProps) {
  const options = canAnnounce ? OPTIONS : OPTIONS.filter((o) => o.id !== 'announcement');
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu">
        <BlurView intensity={35} tint="light" style={styles.blur} />
      </Pressable>

      <View style={styles.card}>
        {options.map((option, index) => (
          <Pressable
            key={option.id}
            style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
            onPress={() => {
              onClose();
              onOptionPress(option.id);
            }}
            accessibilityRole="button"
          >
            {index > 0 ? <View style={styles.rule} /> : null}
            <View style={styles.iconBox}>
              <Icon name={option.icon} size={option.iconHeight * scaleX} color={CHAT_COLORS.textPrimary} />
            </View>
            <Text style={styles.label}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      <NewChatFab onPress={onClose} accessibilityLabel="Close new chat menu" />
    </Modal>
  );
}

const styles = StyleSheet.create({
  blur: {
    position: 'absolute',
    top: M.headerBand * scaleX,
    bottom: M.tabBar * scaleX,
    left: 0,
    right: 0,
  },
  card: {
    position: 'absolute',
    left: M.left * scaleX,
    width: M.width * scaleX,
    bottom: (L.fab.bottom + L.fab.size + M.gapAboveFab) * scaleX,
    paddingTop: M.paddingTop * scaleX,
    paddingBottom: M.paddingBottom * scaleX,
    backgroundColor: '#ffffff',
    borderRadius: M.radius * scaleX,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    // Figma: #6483b0 at 40%, blur 105, spread −35 — a wide, faint halo.
    shadowColor: '#6483b0',
    shadowOpacity: 0.3,
    shadowRadius: 35,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  row: {
    height: M.rowHeight * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: M.iconLeft * scaleX,
  },
  rowPressed: {
    backgroundColor: 'rgba(90, 117, 157, 0.06)',
  },
  rule: {
    position: 'absolute',
    top: 0,
    left: M.iconLeft * scaleX,
    right: M.ruleRight * scaleX,
    height: 1,
    backgroundColor: CHAT_COLORS.divider,
  },
  iconBox: {
    width: M.iconBox * scaleX,
    alignItems: 'center',
  },
  label: {
    marginLeft: M.labelGap * scaleX,
    fontSize: M.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: CHAT_COLORS.textPrimary,
  },
});
