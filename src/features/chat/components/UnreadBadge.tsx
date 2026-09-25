import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography } from '@/theme';
import { CHAT_COLORS, CHAT_LIST as L, scaleX } from '../constants/chatStyles';

/** The pink unread disc on chat and notification rows — Figma 3272:62: 32, bold 15 white. */
export function UnreadBadge({ count }: { count: number }) {
  const label = count > 99 ? '99+' : String(count);
  return (
    <View style={styles.badge} accessibilityLabel={`${label} unread`}>
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: L.badge.size * scaleX,
    height: L.badge.size * scaleX,
    borderRadius: (L.badge.size / 2) * scaleX,
    paddingHorizontal: 4 * scaleX,
    backgroundColor: CHAT_COLORS.badge,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: L.badge.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
    includeFontPadding: false,
  },
});
