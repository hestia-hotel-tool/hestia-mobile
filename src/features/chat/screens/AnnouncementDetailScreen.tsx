import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { invalidateNotificationBadges, markNotificationRead } from '@/lib/inAppNotifications';
import { typography } from '@/theme';
import { fetchAnnouncement, type Announcement } from '../services/chat';
import { CHAT_COLORS, CHAT_LIST as L, scaleX } from '../constants/chatStyles';

/** "Thursday 25 September 2026, 20:00" */
function formatFull(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date}, ${time}`;
}

/**
 * One General Announcement in full — opened from a row on the General
 * notifications list (Figma 3272:186).
 *
 * Figma has no frame for it; it uses the app's tinted band and the list's type
 * scale. **Opening it is what marks it read**: that clears it from the General
 * row's badge on the Chat list and from the Chat tab badge.
 */
export default function AnnouncementDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const found = await fetchAnnouncement(String(id ?? ''));
      if (cancelled) return;
      setItem(found);
      setLoading(false);
      if (found?.unread) {
        await markNotificationRead(found.id);
        invalidateNotificationBadges();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/(chats)/announcements' as never);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.band, { paddingTop: insets.top + 6 * scaleX }]}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
          <Icon name="action-chevron" size={L.header.backChevron * scaleX} color={CHAT_COLORS.glyph} />
        </Pressable>
        <Text style={styles.title}>Announcement</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loading} color={CHAT_COLORS.glyph} />
      ) : !item ? (
        <Text style={styles.missing}>This announcement is no longer available.</Text>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 * scaleX }]}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>General</Text>
          </View>

          <View style={styles.senderRow}>
            <Avatar uri={item.senderAvatar} name={item.senderName} size={L.chat.avatar * scaleX} />
            <View style={styles.senderText}>
              <Text style={styles.senderName} numberOfLines={1}>
                {item.senderName ?? 'Management'}
              </Text>
              <Text style={styles.when}>{formatFull(item.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.rule} />

          <Text style={styles.subject} selectable>
            {item.subject}
          </Text>
          <Text style={styles.body} selectable>
            {item.body}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: CHAT_COLORS.background,
  },
  band: {
    backgroundColor: CHAT_COLORS.headerBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: L.header.left * scaleX,
    paddingBottom: 32 * scaleX,
  },
  title: {
    marginLeft: L.header.titleGap * scaleX,
    fontSize: L.header.titleFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.title,
  },
  loading: {
    marginTop: 48 * scaleX,
  },
  missing: {
    marginTop: 40 * scaleX,
    paddingHorizontal: 34 * scaleX,
    textAlign: 'center',
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: CHAT_COLORS.textPrimary,
  },
  content: {
    paddingHorizontal: 27 * scaleX,
    paddingTop: 20 * scaleX,
  },
  pill: {
    alignSelf: 'flex-start',
    height: 33 * scaleX,
    paddingHorizontal: 20 * scaleX,
    borderRadius: 44 * scaleX,
    backgroundColor: L.notification.general,
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 11 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#ffffff',
  },
  senderRow: {
    marginTop: 22 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
  },
  senderText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 16 * scaleX,
  },
  senderName: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.textPrimary,
  },
  when: {
    marginTop: 3 * scaleX,
    fontSize: 11 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: CHAT_COLORS.textPrimary,
  },
  rule: {
    marginTop: 20 * scaleX,
    height: 1,
    backgroundColor: CHAT_COLORS.divider,
  },
  subject: {
    marginTop: 20 * scaleX,
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.textPrimary,
  },
  body: {
    marginTop: 12 * scaleX,
    fontSize: 15 * scaleX,
    lineHeight: 22 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: CHAT_COLORS.textPrimary,
  },
});
