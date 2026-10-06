import React from 'react';
import { Modal, Pressable as RNPressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { View, Text, Pressable } from '@/tw';
import { scaleX } from '@/utils/responsive';
import { typography } from '@/theme';

export type StaffRoomsAction = 'reassign' | 'assign' | 'unassign';

const ITEMS: { key: StaffRoomsAction; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'reassign', label: 'Reassign Rooms', icon: 'people-outline' },
  { key: 'assign', label: 'Assign Rooms', icon: 'person-add-outline' },
  { key: 'unassign', label: 'Unassign', icon: 'person-remove-outline' },
];

interface StaffActionMenuProps {
  visible: boolean;
  /** Window y where the header ends: the menu hangs from it, under the Action pill. */
  top: number;
  onClose: () => void;
  onSelect: (action: StaffRoomsAction) => void;
}

/**
 * The Action pill's menu — Figma 4360:4196: a white card under the pill with
 * Reassign Rooms, Assign Rooms and Unassign, a rule between each, over the
 * page. Tapping outside closes it.
 */
export default function StaffActionMenu({ visible, top, onClose, onSelect }: StaffActionMenuProps) {
  const s = (n: number) => n * scaleX;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <RNPressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
      <View
        className="bg-surface-primary"
        style={{
          position: 'absolute',
          top,
          right: s(24),
          width: s(200),
          borderRadius: s(4),
          paddingHorizontal: s(18),
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        {ITEMS.map((item, index) => (
          <View key={item.key}>
            {index > 0 ? <View style={{ height: 1, backgroundColor: '#e3e3e3' }} /> : null}
            <Pressable
              onPress={() => onSelect(item.key)}
              className="flex-row items-center"
              style={{ height: s(52), gap: s(14) }}
              accessibilityRole="menuitem"
            >
              <Ionicons name={item.icon} size={s(22)} color="#5a759d" />
              <Text style={{ fontSize: s(15), fontFamily: typography.fontFamily.primary, color: '#1e1e1e' }}>
                {item.label}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Modal>
  );
}
