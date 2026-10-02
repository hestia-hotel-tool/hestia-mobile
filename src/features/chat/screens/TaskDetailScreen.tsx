import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { invalidateNotificationBadges, markNotificationRead } from '@/lib/inAppNotifications';
import { typography } from '@/theme';
import { Avatar } from '@/components/ui/Avatar';
import { PhotoViewer } from '@/components/media/PhotoViewer';
import { STATUS_CONFIGS } from '@features/rooms/types/allRooms.types';
import { fetchAnnouncement, fetchTaskContext, type Announcement, type TaskContext } from '../services/chat';
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
/** "Cleaned by" on a cleaning, "Attendant" otherwise. */
function attendantLabel(type: string): string {
  return type === 'room_cleaned' ? 'Cleaned by' : 'Attendant';
}

const STATUS_WORD: Record<string, string> = {
  Dirty: 'Dirty',
  InProgress: 'In Progress',
  Cleaned: 'Cleaned',
  Inspected: 'Inspected',
};
const statusLabel = (status: string) => STATUS_WORD[status] ?? (status || '—');
const statusColour = (status: string) =>
  (STATUS_CONFIGS as Record<string, { color: string } | undefined>)[status]?.color ?? '#9aa7bd';

export default function TaskDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  /** The room now, the attendant, and a cleaning's report — loaded after the task itself. */
  const [context, setContext] = useState<TaskContext | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const found = await fetchAnnouncement(String(id ?? ''), 'tasks');
      if (cancelled) return;
      setItem(found);
      setLoading(false);
      if (found) {
        const ctx = await fetchTaskContext(found).catch(() => ({}) as TaskContext);
        if (!cancelled) setContext(ctx);
      }
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
        ? item.ticketId
          ? {
              label: 'View ticket',
              go: () => router.push({ pathname: '/ticket/[id]', params: { id: item.ticketId! } }),
            }
          : { label: 'View tickets', go: () => router.navigate('/(tabs)/(tickets)' as never) }
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
              <View style={[styles.kindIcon, { backgroundColor: meta.colour }]}>
                <Icon name={meta.icon} size={meta.iconSize * scaleX} color={meta.glyph ?? '#ffffff'} />
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

            {/* Who it is about, and the room as it stands now. */}
            {context?.attendant || context?.room ? (
              <View style={styles.facts}>
                {context.attendant ? (
                  <View style={styles.fact}>
                    <Avatar uri={context.attendant.avatarUrl ?? undefined} name={context.attendant.name} size={32 * scaleX} />
                    <View>
                      <Text style={styles.factLabel}>{attendantLabel(item.type)}</Text>
                      <Text style={styles.factValue}>{context.attendant.name}</Text>
                    </View>
                  </View>
                ) : null}
                {context.room ? (
                  <View style={styles.fact}>
                    <View style={[styles.statusDot, { backgroundColor: statusColour(context.room.status) }]} />
                    <View>
                      <Text style={styles.factLabel}>Room {context.room.number}</Text>
                      <Text style={styles.factValue}>Now {statusLabel(context.room.status)}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* A cleaning: what the attendant filed with it (Figma 4378:472). */}
            {item.type === 'room_cleaned' ? (
              context == null ? (
                <ActivityIndicator style={styles.sectionLoading} color={CHAT_COLORS.glyph} />
              ) : context.report ? (
                <>
                  <View style={styles.rule} />
                  {context.report.photos.length > 0 ? (
                    <>
                      <Text style={styles.sectionTitle}>Photos</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
                        {context.report.photos.map((uri, index) => (
                          <Pressable
                            key={uri}
                            onPress={() => setViewerIndex(index)}
                            accessibilityRole="imagebutton"
                            accessibilityLabel={`Photo ${index + 1} of ${context.report!.photos.length}`}
                          >
                            <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
                          </Pressable>
                        ))}
                      </ScrollView>
                    </>
                  ) : null}

                  {context.report.note ? (
                    <>
                      <Text style={styles.sectionTitle}>Notes</Text>
                      <Text style={styles.note} selectable>
                        {context.report.note}
                      </Text>
                    </>
                  ) : null}

                  {context.report.checklist.length > 0 ? (
                    <>
                      <Text style={styles.sectionTitle}>
                        Checklist · {context.report.checklist.filter((c) => c.checked).length}/{context.report.checklist.length}
                      </Text>
                      {context.report.checklist.map((c) => (
                        <View key={c.id} style={styles.checkRow}>
                          <Icon name="action-check" size={11 * scaleX} color={c.checked ? '#41d541' : '#c6c5c5'} />
                          <Text style={[styles.checkText, !c.checked && styles.checkTextOff]}>{c.label}</Text>
                        </View>
                      ))}
                    </>
                  ) : null}

                  {context.report.photos.length === 0 && !context.report.note ? (
                    <Text style={styles.quiet}>No photos or notes were added with this cleaning.</Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.quiet}>No photos or notes were added with this cleaning.</Text>
              )
            ) : null}
          </ScrollView>

          {context?.report && context.report.photos.length > 0 ? (
            <PhotoViewer
              photos={context.report.photos}
              startIndex={viewerIndex ?? 0}
              visible={viewerIndex != null}
              onClose={() => setViewerIndex(null)}
            />
          ) : null}

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
  facts: {
    marginTop: 18 * scaleX,
    gap: 14 * scaleX,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12 * scaleX,
  },
  factLabel: {
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: CHAT_COLORS.textPrimary,
  },
  factValue: {
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.textPrimary,
  },
  /** The room's state colour, the size of the avatar beside it. */
  statusDot: {
    width: 32 * scaleX,
    height: 32 * scaleX,
    borderRadius: 16 * scaleX,
  },
  sectionLoading: {
    marginTop: 24 * scaleX,
  },
  /** 4378:472 — "Photos" / "Notes", bold 17. */
  sectionTitle: {
    marginTop: 22 * scaleX,
    marginBottom: 12 * scaleX,
    fontSize: 17 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.textPrimary,
  },
  photos: {
    gap: 14 * scaleX,
  },
  /** The frame's first photo, 222 x 126, square corners. */
  photo: {
    width: 222 * scaleX,
    height: 126 * scaleX,
    backgroundColor: '#eef1f5',
  },
  /** Light 14, as the frame's note. */
  note: {
    fontSize: 14 * scaleX,
    lineHeight: 19 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: CHAT_COLORS.textPrimary,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10 * scaleX,
    paddingVertical: 4 * scaleX,
  },
  checkText: {
    flex: 1,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: CHAT_COLORS.textPrimary,
  },
  checkTextOff: {
    color: '#9aa4b2',
  },
  quiet: {
    marginTop: 18 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#6b7a90',
  },
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
