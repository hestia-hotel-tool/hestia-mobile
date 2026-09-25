import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { CHAT_COLORS, CHAT_LIST as L, scaleX } from '../constants/chatStyles';

export type ChatListFilter = 'all' | 'unread' | 'groups' | 'direct';

export type FilterOption<T extends string> = { id: T; label: string };

const CHAT_OPTIONS: FilterOption<ChatListFilter>[] = [
  { id: 'all', label: 'All chats' },
  { id: 'unread', label: 'Unread' },
  { id: 'groups', label: 'Groups' },
  { id: 'direct', label: 'Direct' },
];

type Props<T extends string> = {
  visible: boolean;
  value: T;
  onChange: (value: T) => void;
  onClose: () => void;
  /** Defaults to the chat list's All / Unread / Groups / Direct. */
  options?: FilterOption<T>[];
};

/*
 * Anchored under the filter glyph (x354–382, y176–188 on the frame). The header
 * is laid out in fixed design coordinates, so the anchor is too — no measuring.
 */
const GLYPH_RIGHT = L.search.left + L.search.width + L.search.filterGap + 28;
const MENU_TOP = L.search.top + L.search.filterTop + 12 + 14;

/**
 * The chat list filter — opened from the three-line glyph beside search.
 *
 * Figma 3272:62 draws the glyph but no menu for it, so this borrows the card
 * treatment of the app's other pickers (white, r9, #e6e6e6 hairline, soft blue
 * halo) rather than inventing a new one.
 */
export function ChatFilterMenu<T extends string = ChatListFilter>({
  visible,
  value,
  onChange,
  onClose,
  options = CHAT_OPTIONS as unknown as FilterOption<T>[],
}: Props<T>) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close filter" />
      <View style={styles.card}>
        {options.map((option, index) => {
          const selected = option.id === value;
          return (
            <Pressable
              key={option.id}
              style={[styles.row, index > 0 ? styles.rowRule : null]}
              onPress={() => {
                onChange(option.id);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.label, selected ? styles.labelSelected : null]}>{option.label}</Text>
              {selected ? <Icon name="action-check-bold" size={14 * scaleX} color={CHAT_COLORS.glyph} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: MENU_TOP * scaleX,
    right: (440 - GLYPH_RIGHT) * scaleX,
    width: 180 * scaleX,
    backgroundColor: '#ffffff',
    borderRadius: 9 * scaleX,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    shadowColor: '#6483b0',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    paddingHorizontal: 16 * scaleX,
  },
  row: {
    height: 46 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowRule: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(90, 117, 157, 0.13)',
  },
  label: {
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: CHAT_COLORS.textPrimary,
  },
  labelSelected: {
    fontWeight: '700',
    color: CHAT_COLORS.glyph,
  },
});
