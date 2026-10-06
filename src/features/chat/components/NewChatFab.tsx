import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { CHAT_LIST as L, scaleX } from '../constants/chatStyles';

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
};

/**
 * The floating + on the chat list — Figma 3272:98 / 1102:3826.
 *
 * Drawn by the list and again by the open New Chat menu, in the same spot, so
 * the button that opened the menu stays visible (and sharp) above its blur and
 * closes it.
 */
export function NewChatFab({ onPress, accessibilityLabel }: Props) {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.barH} />
      <View style={styles.barV} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: L.fab.right * scaleX,
    bottom: L.fab.bottom * scaleX,
    width: L.fab.size * scaleX,
    height: L.fab.size * scaleX,
    borderRadius: (L.fab.size / 2) * scaleX,
    backgroundColor: L.fab.background,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  barH: {
    position: 'absolute',
    width: L.fab.plus * scaleX,
    height: L.fab.plusStroke * scaleX,
    borderRadius: L.fab.plusStroke * scaleX,
    backgroundColor: '#ffffff',
  },
  barV: {
    position: 'absolute',
    width: L.fab.plusStroke * scaleX,
    height: L.fab.plus * scaleX,
    borderRadius: L.fab.plusStroke * scaleX,
    backgroundColor: '#ffffff',
  },
});
