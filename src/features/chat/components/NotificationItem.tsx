import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { typography } from '@/theme';
import { CHAT_COLORS, CHAT_LIST as L, scaleX } from '../constants/chatStyles';
import { UnreadBadge } from './UnreadBadge';

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

/**
 * A notification row on the chat list — Figma 3272:62 (General, Tasks).
 *
 * Coloured pill, bold one-line title with an optional time under it, and the
 * unread badge raised above the pill's top edge. A 1px rule closes the row.
 */
export default function NotificationItem({ item, onPress }: Props) {
  const unreadCount = typeof item.unreadCount === 'number' ? item.unreadCount : 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={[styles.pill, { backgroundColor: item.pillBackgroundColor ?? L.notification.tasks }]}>
        <Text style={[styles.pillText, { color: item.pillTextColor ?? '#ffffff' }]} numberOfLines={1}>
          {item.label}
        </Text>
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

      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <UnreadBadge count={unreadCount} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 26 * scaleX,
    paddingRight: L.badge.right * scaleX,
    paddingTop: L.notification.paddingTop * scaleX,
    paddingBottom: L.notification.paddingBottom * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: CHAT_COLORS.divider,
  },
  pill: {
    height: L.notification.pillHeight * scaleX,
    paddingHorizontal: L.notification.pillPaddingX * scaleX,
    borderRadius: L.notification.pillRadius * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillText: {
    fontSize: L.notification.pillFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    includeFontPadding: false,
  },
  content: {
    flex: 1,
    minWidth: 0,
    marginLeft: L.notification.titleGap * scaleX,
    marginRight: 12 * scaleX,
  },
  title: {
    fontSize: L.notification.titleFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.textPrimary,
    includeFontPadding: false,
  },
  time: {
    marginTop: 2 * scaleX,
    fontSize: L.notification.timeFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: CHAT_COLORS.textPrimary,
    includeFontPadding: false,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: -L.notification.badgeLift * scaleX,
  },
});
