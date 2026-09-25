import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { invalidateNotificationBadges, markAllGeneralNotificationsRead } from '@/lib/inAppNotifications';
import { typography } from '@/theme';
import { fetchAnnouncements, type Announcement } from '../services/chat';
import { CHAT_COLORS, CHAT_LIST as L, scaleX } from '../constants/chatStyles';

/** "14:05" today, "Yesterday", otherwise "25/9/2026" — the list card timestamp format. */
function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, now)) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Yesterday';
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

/**
 * Every General Announcement you have received — opened from the "General" row
 * on the Chat list.
 *
 * Figma has no frame for it; it borrows the chat list's band, rows and rules.
 * Opening it marks them all read, which clears the row's badge and the share
 * of the Chat tab badge they account for. Unread ones keep a pink dot for this
 * visit, so you can still see which were new.
 */
export default function AnnouncementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const next = await fetchAnnouncements();
    setItems(next);
    setLoading(false);
    if (next.some((a) => a.unread)) {
      await markAllGeneralNotificationsRead();
      invalidateNotificationBadges();
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/(chats)' as never);
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.band, { paddingTop: insets.top + 6 * scaleX }]}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
          <Icon name="action-chevron" size={L.header.backChevron * scaleX} color={CHAT_COLORS.glyph} />
        </Pressable>
        <Text style={styles.title}>Announcements</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 * scaleX }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>{loading ? 'Loading announcements…' : 'No announcements yet'}</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.senderAvatar} name={item.senderName} size={L.chat.avatar * scaleX} />
            <View style={styles.content}>
              <View style={styles.topLine}>
                <Text style={styles.sender} numberOfLines={1}>
                  {item.senderName ?? 'Management'}
                </Text>
                <Text style={styles.when}>{formatWhen(item.createdAt)}</Text>
                {item.unread ? <View style={styles.unreadDot} accessibilityLabel="New" /> : null}
              </View>
              <Text style={styles.subject}>{item.subject}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
          </View>
        )}
      />
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
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 27 * scaleX,
    paddingRight: 27 * scaleX,
    paddingVertical: 20 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: CHAT_COLORS.divider,
  },
  content: {
    flex: 1,
    minWidth: 0,
    marginLeft: L.chat.avatarGap * scaleX,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sender: {
    flex: 1,
    fontSize: L.chat.nameFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.textPrimary,
  },
  when: {
    marginLeft: 8 * scaleX,
    fontSize: 11 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: CHAT_COLORS.textPrimary,
  },
  unreadDot: {
    marginLeft: 8 * scaleX,
    width: 10 * scaleX,
    height: 10 * scaleX,
    borderRadius: 5 * scaleX,
    backgroundColor: CHAT_COLORS.badge,
  },
  subject: {
    marginTop: 6 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.textPrimary,
  },
  body: {
    marginTop: 4 * scaleX,
    fontSize: 13 * scaleX,
    lineHeight: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: CHAT_COLORS.textPrimary,
  },
  empty: {
    marginTop: 40 * scaleX,
    textAlign: 'center',
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: CHAT_COLORS.textPrimary,
  },
});
