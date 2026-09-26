import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { invalidateNotificationBadges, markNotificationRead } from '@/lib/inAppNotifications';
import { typography } from '@/theme';
import { fetchAnnouncement, type Announcement } from '../services/chat';
import { taskMeta } from '../utils/taskMeta';
import { CHAT_COLORS, CHAT_LIST as L, scaleX } from '../constants/chatStyles';

/** "Friday 26 September 2026, 09:14" */
function formatFull(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date}, ${time}`;
}

/**
 * One task in full — opened from a row on the Tasks list.
 *
 * Figma has no frame for it; it mirrors the announcement detail: tinted band,
 * the blue Tasks pill, then what happened (icon + kind), the full message and
 * when. **Opening it marks the task read**, which clears it from the Tasks row
 * and the Chat tab badge.
 *
 * The room or ticket is one tap further — "View room" / "View tickets" — rather
 * than where the row lands. Going straight to Room Detail skipped the task
 * itself: nothing said why you were there.
 */
export default function TaskDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const found = await fetchAnnouncement(String(id ?? ''), 'tasks');
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
    else router.replace('/(tabs)/(chats)/tasks' as never);
  };

  const meta = item ? taskMeta(item.type) : null;
  const action =
    item && meta
      ? meta.target === 'tickets'
        ? { label: 'View tickets', go: () => router.navigate('/(tabs)/(tickets)' as never) }
        : item.roomId
          ? {
              label: 'View room',
              go: () => router.push({ pathname: '/room/[roomId]', params: { roomId: item.roomId } } as never),
            }
          : null
      : null;

  return (
    <View style={styles.screen}>
      <View style={[styles.band, { paddingTop: insets.top + 6 * scaleX }]}>
        <Pressable onPress={goBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Go back">
          <Icon name="action-chevron" size={L.header.backChevron * scaleX} color={CHAT_COLORS.glyph} />
        </Pressable>
        <Text style={styles.title}>Task</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loading} color={CHAT_COLORS.glyph} />
      ) : !item || !meta ? (
        <Text style={styles.missing}>This task is no longer available.</Text>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.pill}>
              <Text style={styles.pillText}>Tasks</Text>
            </View>

            <View style={styles.kindRow}>
              <View style={styles.kindIcon}>
                <Icon name={meta.icon} size={meta.iconSize * scaleX} color="#ffffff" />
              </View>
              <View style={styles.kindText}>
                <Text style={styles.kind}>{meta.label}</Text>
                <Text style={styles.when}>{formatFull(item.createdAt)}</Text>
              </View>
            </View>

            <View style={styles.rule} />

            <Text style={styles.body} selectable>
              {item.body}
            </Text>
          </ScrollView>

          {action ? (
            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 * scaleX }]}>
              <Pressable
                style={({ pressed }) => [styles.primary, pressed ? styles.primaryPressed : null]}
                onPress={action.go}
                accessibilityRole="button"
              >
                <Text style={styles.primaryText}>{action.label}</Text>
              </Pressable>
            </View>
          ) : null}
        </>
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
    paddingBottom: 24 * scaleX,
  },
  pill: {
    alignSelf: 'flex-start',
    height: 33 * scaleX,
    paddingHorizontal: 20 * scaleX,
    borderRadius: 44 * scaleX,
    backgroundColor: L.notification.tasks,
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 11 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#ffffff',
  },
  kindRow: {
    marginTop: 22 * scaleX,
    flexDirection: 'row',
    alignItems: 'center',
  },
  kindIcon: {
    width: L.chat.avatar * scaleX,
    height: L.chat.avatar * scaleX,
    borderRadius: (L.chat.avatar / 2) * scaleX,
    backgroundColor: L.notification.tasks,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 16 * scaleX,
  },
  kind: {
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
  body: {
    marginTop: 20 * scaleX,
    fontSize: 17 * scaleX,
    lineHeight: 24 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: CHAT_COLORS.textPrimary,
  },
  footer: {
    paddingHorizontal: 21 * scaleX,
    paddingTop: 12 * scaleX,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CHAT_COLORS.divider,
    backgroundColor: '#ffffff',
  },
  primary: {
    height: 58 * scaleX,
    backgroundColor: CHAT_COLORS.glyph,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPressed: {
    opacity: 0.85,
  },
  primaryText: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
  },
});
