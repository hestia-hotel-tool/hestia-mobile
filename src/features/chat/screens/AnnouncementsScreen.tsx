import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import BottomTabBar from '@/components/layout/BottomTabBar';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { subscribeNotificationBadgeInvalidate } from '@/lib/inAppNotifications';
import { typography } from '@/theme';
import ChatHeader from '../components/ChatHeader';
import { ChatFilterMenu, type FilterOption } from '../components/ChatFilterMenu';
import { fetchAnnouncements, fetchTaskReportExtras, type Announcement } from '../services/chat';
import { taskHeadline, taskMeta } from '../utils/taskMeta';
import { CHAT_COLORS, CHAT_LIST as L, scaleX } from '../constants/chatStyles';

type AnnouncementFilter = 'all' | 'unread';
const FILTER_OPTIONS: FilterOption<AnnouncementFilter>[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
];

/** Design px on the 440-wide frame — Figma 3272:186. */
const N = {
  /** "General" pill x27 y256, 80x33 — 15 below the search rule. */
  pillTop: 15,
  pillLeft: 27,
  pillHeight: 33,
  pillPaddingX: 20,
  pillRadius: 44,
  pillFontSize: 11,
  /** First row y314 — 25 below the pill. Rows repeat every 83 (54 tall + 29). */
  firstRowTop: 25,
  rowGap: 29,
  /** Avatar x34, 44; text at x94 (16 past it). */
  rowLeft: 34,
  avatar: 44,
  textGap: 16,
  subjectFontSize: 13,
  lineHeight: 15,
  /** Subject → preview 6, preview → time 3. */
  previewTop: 6,
  timeTop: 3,
  timeFontSize: 11,
} as const;

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  // The frame shows "20:00"; older than today also needs the day to be useful.
  return d.toDateString() === new Date().toDateString()
    ? time
    : `${time}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

type Kind = 'general' | 'tasks';

const KIND = {
  general: { type: 'general', pill: 'General', colour: L.notification.general, empty: 'No announcements yet' },
  tasks: { type: 'tasks', pill: 'Tasks', colour: L.notification.tasks, empty: 'No tasks yet' },
} as const;

/**
 * General notifications — Figma 3272:186, opened from the "General" row on the
 * Chat list. The same screen lists Tasks — room assigned, flagged, priority,
 * cleaned, sent back, ticket assigned — from the "Tasks" row, with a blue pill;
 * the frame shows only General.
 *
 * The chat list's header (titled "Notifications"), the pink General pill, then
 * one row per announcement: sender photo, bold subject, one line of the message
 * and the time. Tapping a row opens its detail screen — the announcement, or
 * the task (which links on to its room or ticket) — and opening that is what
 * marks it read —
 * so the list shows which ones are still new with a pink dot (the frame has no
 * unread state; without one the list cannot say which to open).
 */
export default function AnnouncementsScreen({ kind = 'general' }: { kind?: Kind }) {
  const config = KIND[kind];
  const router = useRouter();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AnnouncementFilter>('all');
  const [showFilter, setShowFilter] = useState(false);

  /** Tasks: the Photo / Notes a cleaning came with, by notification id. */
  const [extras, setExtras] = useState<Record<string, { photos: number; note: boolean }>>({});

  const load = useCallback(async () => {
    const next = await fetchAnnouncements(config.type);
    setItems(next);
    setLoading(false);
    if (config.type === 'tasks') setExtras(await fetchTaskReportExtras(next));
  }, [config.type]);

  // On focus: coming back from a detail screen, that one is now read.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // A new announcement arriving while this is open.
  useEffect(() => subscribeNotificationBadgeInvalidate(() => void load()), [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((a) => {
      if (filter === 'unread' && !a.unread) return false;
      if (!q) return true;
      return (
        a.subject.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        (a.senderName ?? '').toLowerCase().includes(q)
      );
    });
  }, [items, query, filter]);

  const goBack = () => router.navigate('/(tabs)/(chats)' as never);

  return (
    <View style={styles.container}>
      <FlatList
        data={visible}
        keyExtractor={(a) => a.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
        ListHeaderComponent={
          kind === 'tasks' ? (
            // Figma 4378:191 — "Tasks", bold 30 in #4a91fc.
            <Text style={styles.tasksHeading}>Tasks</Text>
          ) : (
            <View style={[styles.pill, { backgroundColor: config.colour }]}>
              <Text style={styles.pillText}>{config.pill}</Text>
            </View>
          )
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Loading…' : items.length === 0 ? config.empty : 'Nothing matches your search'}
          </Text>
        }
        renderItem={({ item, index }) =>
          kind === 'tasks' ? (
            <TaskRow
              item={item}
              first={index === 0}
              extras={extras[item.id]}
              onPress={() => router.push(`/task/${item.id}` as never)}
            />
          ) : (
          <Pressable
            style={[styles.row, { marginTop: (index === 0 ? N.firstRowTop : N.rowGap) * scaleX }]}
            onPress={() => {
              // Both open their own detail screen, which is what marks them read.
              router.push((kind === 'general' ? `/announcement/${item.id}` : `/task/${item.id}`) as never);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${item.unread ? 'New. ' : ''}${item.subject}`}
          >
            {kind === 'general' ? (
              <Avatar uri={item.senderAvatar} name={item.senderName} size={N.avatar * scaleX} />
            ) : (
              (() => {
                // Each kind on its state's colour (taskMeta).
                const meta = taskMeta(item.type);
                return (
                  <View style={[styles.taskIcon, { backgroundColor: meta.colour }]}>
                    <Icon name={meta.icon} size={meta.iconSize * scaleX} color={meta.glyph ?? '#ffffff'} />
                  </View>
                );
              })()
            )}
            <View style={styles.text}>
              <Text style={styles.subject} numberOfLines={1}>
                {item.subject}
              </Text>
              <Text style={styles.preview} numberOfLines={1}>
                {item.body}
              </Text>
              <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
            </View>
            {item.unread ? <View style={styles.unreadDot} /> : null}
          </Pressable>
          )
        }
      />

      <ChatHeader
        title="Notifications"
        onBackPress={goBack}
        onSearch={setQuery}
        onFilterPress={() => setShowFilter(true)}
        filterActive={filter !== 'all'}
      />

      <BottomTabBar />

      <ChatFilterMenu
        visible={showFilter}
        value={filter}
        options={FILTER_OPTIONS}
        onChange={setFilter}
        onClose={() => setShowFilter(false)}
      />
    </View>
  );
}

/** "now" under a minute, then the time (and date if not today), as the list's other rows. */
function taskTime(iso: string): string {
  const at = Date.parse(iso);
  return Number.isFinite(at) && Date.now() - at < 60_000 ? 'now' : formatTime(iso);
}

/**
 * One task — Figma 4378:174: the state's disc, a short headline ("Amara
 * Cleaned 408"), Photo / Notes when the cleaning came with them, "See
 * details", and the time; a full-width rule under each.
 */
function TaskRow({
  item,
  first,
  extras,
  onPress,
}: {
  item: Announcement;
  first: boolean;
  extras?: { photos: number; note: boolean };
  onPress: () => void;
}) {
  const meta = taskMeta(item.type);
  const headline = taskHeadline(item.type, item.subject, item.body);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.taskRow, first && styles.taskRowFirst, pressed && { backgroundColor: '#f4f6fa' }]}
      accessibilityRole="button"
      accessibilityLabel={`${item.unread ? 'New. ' : ''}${headline}. ${item.body}`}
      accessibilityHint="See details"
    >
      <View style={[styles.taskDisc, { backgroundColor: meta.colour }]}>
        <Icon name={meta.icon} size={meta.iconSize * scaleX} color={meta.glyph ?? '#ffffff'} />
      </View>
      <View style={styles.text}>
        <Text style={styles.taskHeadline} numberOfLines={2}>
          {headline}
        </Text>
        {extras && (extras.photos > 0 || extras.note) ? (
          <View style={styles.extrasRow}>
            {extras.photos > 0 ? (
              <View style={styles.extra}>
                <Icon name="action-add-photo" size={14 * scaleX} />
                <Text style={styles.extraText}>{extras.photos > 1 ? `${extras.photos} Photos` : 'Photo'}</Text>
              </View>
            ) : null}
            {extras.note ? (
              <View style={styles.extra}>
                <Icon name="action-add-note" size={13 * scaleX} color="#5a759d" />
                <Text style={styles.extraText}>Notes</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.seeDetails}>See details</Text>
      </View>
      <View style={styles.taskSide}>
        <Text style={styles.taskTime}>{taskTime(item.createdAt)}</Text>
        {item.unread ? <View style={[styles.unreadDot, { marginTop: 8 * scaleX }]} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tasksHeading: {
    marginTop: 18 * scaleX,
    marginLeft: 26 * scaleX,
    marginBottom: 14 * scaleX,
    fontSize: 30 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#4a91fc',
  },
  /** Rows sit between full-width rules of black at 11% (4378:260–262). */
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 27 * scaleX,
    paddingRight: 24 * scaleX,
    paddingVertical: 20 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.11)',
  },
  taskRowFirst: {
    paddingTop: 14 * scaleX,
  },
  /** 4378:331 — 42.3 discs. */
  taskDisc: {
    width: 42.3 * scaleX,
    height: 42.3 * scaleX,
    borderRadius: 21.15 * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 4378:207 — bold 18, #1e1e1e. */
  taskHeadline: {
    fontSize: 18 * scaleX,
    lineHeight: 21 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  extrasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18 * scaleX,
    marginTop: 6 * scaleX,
  },
  extra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 * scaleX,
  },
  /** 4378:386 — 13, #5a759d. */
  extraText: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  /** 4378:364 — 13 regular. */
  seeDetails: {
    marginTop: 6 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: '#1e1e1e',
  },
  taskSide: {
    alignItems: 'flex-end',
    paddingTop: 4 * scaleX,
  },
  /** 4378:193 — light 13. */
  taskTime: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#1e1e1e',
  },
  container: {
    flex: 1,
    backgroundColor: CHAT_COLORS.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    // Below the header's rule (y242); clear of the tab bar.
    paddingTop: (L.search.dividerTop + 1) * scaleX,
    paddingBottom: 190 * scaleX,
  },
  pill: {
    alignSelf: 'flex-start',
    marginTop: N.pillTop * scaleX,
    marginLeft: N.pillLeft * scaleX,
    height: N.pillHeight * scaleX,
    paddingHorizontal: N.pillPaddingX * scaleX,
    borderRadius: N.pillRadius * scaleX,
    justifyContent: 'center',
  },
  pillText: {
    fontSize: N.pillFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: N.rowLeft * scaleX,
    paddingRight: 27 * scaleX,
  },
  text: {
    flex: 1,
    minWidth: 0,
    marginLeft: N.textGap * scaleX,
    marginRight: 12 * scaleX,
  },
  subject: {
    fontSize: N.subjectFontSize * scaleX,
    lineHeight: N.lineHeight * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.textPrimary,
  },
  preview: {
    marginTop: N.previewTop * scaleX,
    fontSize: N.subjectFontSize * scaleX,
    lineHeight: N.lineHeight * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: CHAT_COLORS.textPrimary,
  },
  time: {
    marginTop: N.timeTop * scaleX,
    fontSize: N.timeFontSize * scaleX,
    lineHeight: N.lineHeight * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: CHAT_COLORS.textPrimary,
  },
  taskIcon: {
    width: N.avatar * scaleX,
    height: N.avatar * scaleX,
    borderRadius: (N.avatar / 2) * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    width: 10 * scaleX,
    height: 10 * scaleX,
    borderRadius: 5 * scaleX,
    backgroundColor: CHAT_COLORS.badge,
  },
  empty: {
    marginTop: 32 * scaleX,
    textAlign: 'center',
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: CHAT_COLORS.textPrimary,
  },
});
