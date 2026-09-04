import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { typography } from '@/theme';
import { CHAT_COLORS, CHAT_ITEM, scaleX } from '../constants/chatStyles';

export type NotificationItemData = {
  id: string;
  label: string; // e.g. "Tasks"
  title: string;
  timeText?: string; // e.g. "20:00"
  unreadCount?: number;
  pillBackgroundColor?: string;
  pillTextColor?: string;
};

type Props = {
  item: NotificationItemData;
  onPress?: () => void;
};

export default function NotificationItem({ item, onPress }: Props) {
  const unreadCount = typeof item.unreadCount === 'number' ? item.unreadCount : 0;
  const hasUnread = unreadCount > 0;

  const pillBackgroundColor = item.pillBackgroundColor ?? '#4a91fc';
  const pillTextColor = item.pillTextColor ?? '#ffffff';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.left}>
        <View style={[styles.pill, { backgroundColor: pillBackgroundColor }]}>
          <Text style={[styles.pillText, { color: pillTextColor }]} numberOfLines={1}>
            {item.label}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        {item.timeText ? (
          <Text style={styles.time} numberOfLines={1}>
            {item.timeText}
          </Text>
        ) : null}
      </View>

      {hasUnread ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {unreadCount > 99 ? '99+' : String(unreadCount)}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CHAT_ITEM.avatar.left * scaleX,
    paddingVertical: 12 * scaleX,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CHAT_COLORS.divider,
  },
  left: {
    marginRight: 12 * scaleX,
  },
  pill: {
    paddingHorizontal: 20 * scaleX,
    paddingVertical: 4 * scaleX,
    borderRadius: 44 * scaleX,
    height: 33 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillText: {
    fontSize: 11 * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: '300' as any,
    includeFontPadding: false,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700' as any,
    color: CHAT_COLORS.textPrimary,
    includeFontPadding: false,
  },
  time: {
    marginTop: 2 * scaleX,
    fontSize: 11 * scaleX,
    fontFamily: typography.fontFamily.light,
    fontWeight: '300' as any,
    color: CHAT_COLORS.textPrimary,
    opacity: 0.9,
    includeFontPadding: false,
  },
  badge: {
    width: 32 * scaleX,
    height: 32 * scaleX,
    borderRadius: 16 * scaleX,
    backgroundColor: CHAT_ITEM.badge.backgroundColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12 * scaleX,
  },
  badgeText: {
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.bold,
    fontWeight: '700' as any,
    color: '#ffffff',
    includeFontPadding: false,
  },
});

