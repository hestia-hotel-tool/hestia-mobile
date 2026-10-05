import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';

import { View, Text } from '@/tw';
import { Avatar } from '@/components';
import { Icon } from '@/components/Icon';
import { useNow } from '@/hooks/useNow';
import { useLiveRoomChanges } from '@/hooks/useLiveRoomChanges';
import { isTheirs } from '../utils/isTheirs';
import { typography } from '@/theme';
import { scaleX } from '@/utils/responsive';
import { STATUS_CONFIGS, getRoomCardStatus, type RoomCardData } from '@features/rooms/types/allRooms.types';
import { cleaningClock } from '@features/rooms/utils/cleaningClock';
import { guestRowKind } from '@features/rooms/utils/roomCardProps';
import { GuestKindDisc } from '@features/rooms/components/roomsList/GuestRow';
import StaffHeader from '../components/StaffHeader';
import { SHIFT_GROUP_CHROME } from '../components/staffList/staffShiftChrome';
import { useStaffAssignedRooms } from '../hooks/useStaffAssignedRooms';
import type { StaffShiftState } from '../types/staffRoster.types';

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const s = (n: number) => n * scaleX;
const FONT = typography.fontFamily.primary;
const RED = '#f92424';

type Filter = 'all' | 'InProgress' | 'Cleaned' | 'Dirty';
const FILTER_LABEL: Record<Filter, string> = {
  all: 'All rooms',
  InProgress: 'In Progress',
  Cleaned: 'Cleaned',
  Dirty: 'Dirty',
};

/** "0:18 mins", "1:05 mins"; "0 mins" for a room not started. */
function formatSpan(minutes: number): string {
  if (minutes <= 0) return '0 mins';
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')} mins`;
}

function formatToday(now: number): string {
  const d = new Date(now);
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'][d.getMonth()];
  return `Today. ${d.getDate()} ${month} ${d.getFullYear()}`;
}

type RoomLine = {
  room: RoomCardData;
  used: number;
  credit: number;
  over: boolean;
  statusLabel: string;
  statusColor: string;
  statusKey: string;
};

/**
 * One attendant's day — Figma 4319-648, opened from "View Details" on their
 * Staff card.
 *
 * Their rooms this shift with each one's status, time and credit; the credit
 * used in total; and the day's statistics. Everything is worked out from the
 * rooms themselves (the same load as See rooms), so it always agrees with the
 * Rooms list.
 *
 * - "3/7": rooms Cleaned or Inspected, of those assigned.
 * - A room's time: its cleaning clock so far (pauses excluded), against its
 *   credit; red once over.
 * - Credits Used: minutes used across the rooms, of their credits' total.
 * - Total covered: those minutes, with how far over or under the credit.
 * - Average cleaning time: over the rooms started; "Good" within the average
 *   credit.
 */
export default function StaffActivityScreen() {
  const navigation = useNavigation();
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const staffId = one(params.staffId) ?? null;
  const name = one(params.name) ?? 'Staff';
  const avatarUrl = one(params.avatarUrl) || undefined;
  const jobTitle = one(params.jobTitle) || one(params.departmentName) || '';
  const state = (one(params.state) as StaffShiftState | undefined) ?? 'on_shift';
  const shift = one(params.shift) === 'PM' ? 'PM' : 'AM';

  const now = useNow();
  const { rooms, loading, error, refresh } = useStaffAssignedRooms(staffId, shift);
  /*
   * A room assigned to them, or one they start, after this screen opened must
   * still show: reload quietly when one of *their* rooms or assignments
   * changes (only while this screen is showing), and on pull.
   */
  const silentRefresh = useCallback(() => refresh({ silent: true }), [refresh]);
  useLiveRoomChanges(silentRefresh, {
    enabled: !!staffId,
    isRelevant: (change) => isTheirs(change, staffId, rooms),
  });
  const [filter, setFilter] = useState<Filter>('all');

  const lines: RoomLine[] = useMemo(
    () =>
      (rooms ?? []).map((room) => {
        const clock = cleaningClock(room, now);
        const used = clock ? Math.round(clock.elapsedMs / 60_000) : 0;
        const credit = room.credit ?? 0;
        const display = getRoomCardStatus(room);
        const config = STATUS_CONFIGS[display];
        return {
          room,
          used,
          credit,
          over: credit > 0 && used > credit,
          statusLabel: config?.label ?? display,
          statusColor: config?.color ?? '#9aa7bd',
          statusKey: room.houseKeepingStatus,
        };
      }),
    [rooms, now]
  );

  const shown = filter === 'all' ? lines : lines.filter((l) => l.statusKey === filter);
  const done = lines.filter((l) => l.statusKey === 'Cleaned' || l.statusKey === 'Inspected').length;
  const totalUsed = lines.reduce((n, l) => n + l.used, 0);
  const totalCredit = lines.reduce((n, l) => n + l.credit, 0);
  const started = lines.filter((l) => l.used > 0);
  const averageUsed = started.length ? Math.round(started.reduce((n, l) => n + l.used, 0) / started.length) : 0;
  const averageCredit = started.length ? started.reduce((n, l) => n + l.credit, 0) / started.length : 0;
  /*
   * Credits left over: negative is overtime. 20 credits cleaned in 24 minutes
   * is -4 — the frame's red "-50 minutes".
   */
  const againstCredit = totalCredit - totalUsed;

  const chooseFilter = () =>
    Alert.alert('Show rooms', undefined, [
      ...(Object.keys(FILTER_LABEL) as Filter[]).map((key) => ({
        text: `${FILTER_LABEL[key]}${key === filter ? '  ✓' : ''}`,
        onPress: () => setFilter(key),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  return (
    <View className="flex-1 bg-surface-primary">
      <StaffHeader title="Activity" onBackPress={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ paddingTop: s(13), paddingBottom: s(60) }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && rooms != null} onRefresh={() => refresh()} />}
      >
        {/* 4319:718 — the card, 401 wide at x19. */}
        <View
          style={{
            marginLeft: s(19),
            marginRight: s(20),
            borderRadius: s(9),
            borderWidth: 1,
            borderColor: '#e3e3e3',
            backgroundColor: '#f9fafc',
            paddingTop: s(19),
            paddingBottom: s(24),
          }}
        >
          <View style={{ paddingHorizontal: s(19) }}>
            {/* 4319:734–737 — a 63 photo with a 23 presence dot, the name and role. */}
            <View className="flex-row items-center" style={{ gap: s(25) }}>
              <View>
                <Avatar uri={avatarUrl} name={name} size={s(63)} />
                <View
                  className="absolute rounded-full"
                  style={{
                    right: s(-2),
                    bottom: s(-4),
                    width: s(23),
                    height: s(23),
                    borderWidth: 2,
                    borderColor: '#f9fafc',
                    backgroundColor: SHIFT_GROUP_CHROME[state].color,
                  }}
                />
              </View>
              <View className="flex-1">
                <Text style={{ fontSize: s(16), fontWeight: '700', fontFamily: FONT, color: '#1e1e1e' }} numberOfLines={1}>
                  {name}
                </Text>
                {!!jobTitle && (
                  <Text style={{ marginTop: s(2), fontSize: s(14), fontWeight: '300', fontFamily: FONT, color: '#000000' }} numberOfLines={1}>
                    {jobTitle}
                  </Text>
                )}
              </View>
            </View>

            {/* 4319:719 / 4319:829 — "Activity", today's date, and the filter. */}
            <View className="flex-row items-center" style={{ marginTop: s(30) }}>
              <View className="flex-1">
                <Text style={{ fontSize: s(19), fontWeight: '700', fontFamily: FONT, color: '#000000' }}>Activity</Text>
                <Text style={{ marginTop: s(6), fontSize: s(11), fontWeight: '300', fontFamily: FONT, color: '#000000' }}>
                  {formatToday(now)}
                  {filter !== 'all' ? ` · ${FILTER_LABEL[filter]}` : ''}
                </Text>
              </View>
              {/* 4319:830 — ends at x373, 28 inside the content edge. */}
              <Pressable
                onPress={chooseFilter}
                style={{ marginRight: s(28) }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Filter rooms, showing ${FILTER_LABEL[filter]}`}
              >
                <Icon name="action-filter" size={s(14)} color="#5a759d" />
              </Pressable>
            </View>

            {/* 4326:1656 — "Rooms Performance" and its bar. */}
            <Text style={{ marginTop: s(28), fontSize: s(19), fontWeight: '700', fontFamily: FONT, color: '#000000' }}>
              Rooms Performance
            </Text>
            <View
              className="flex-row items-center"
              style={{
                marginTop: s(14),
                height: s(50),
                borderRadius: s(9),
                backgroundColor: 'rgba(205, 211, 221, 0.26)',
                paddingHorizontal: s(13),
                gap: s(10),
              }}
            >
              <Bar ratio={lines.length ? done / lines.length : 0} fill="#5a759d" />
              <Text style={{ fontSize: s(16), fontWeight: '700', fontFamily: FONT, color: '#000000' }}>
                {done}/{lines.length}
              </Text>
            </View>
          </View>

          {/* The rooms, a rule between each, the card's full width. */}
          <View style={{ marginTop: s(14) }}>
            {loading && !rooms ? (
              <ActivityIndicator style={{ paddingVertical: s(24) }} color="#5a759d" />
            ) : error ? (
              <Text style={{ padding: s(19), fontSize: s(14), fontFamily: FONT, color: '#6b7a90' }}>{error}</Text>
            ) : shown.length === 0 ? (
              <Text style={{ padding: s(19), fontSize: s(14), fontFamily: FONT, color: '#6b7a90' }}>
                {lines.length === 0 ? 'No rooms assigned this shift.' : `No ${FILTER_LABEL[filter]} rooms.`}
              </Text>
            ) : (
              shown.map((line, index) => (
                <View key={line.room.id}>
                  {index > 0 ? <View style={{ height: 1, backgroundColor: '#e9e9e9', marginHorizontal: s(4) }} /> : null}
                  <RoomRow line={line} />
                </View>
              ))
            )}
            <View style={{ height: 1, backgroundColor: '#e9e9e9', marginHorizontal: s(4) }} />
          </View>

          {/* 4319:820–827 — Credits Used. */}
          <View style={{ paddingHorizontal: s(21), marginTop: s(20) }}>
            <Text style={{ fontSize: s(19), fontWeight: '700', fontFamily: FONT, color: '#000000' }}>Credits Used</Text>
            {/* 4319:822 — x43–347. A row: in a column the bar's flex:1 sets its
                basis to 0 and it drew nothing at all. */}
            <View className="flex-row" style={{ marginTop: s(24), marginLeft: s(3), paddingRight: s(52) }}>
              <Bar ratio={totalCredit > 0 ? totalUsed / totalCredit : 0} fill="#fb9292" />
            </View>
            <Text style={{ marginTop: s(12), fontSize: s(11), fontWeight: '700', fontFamily: FONT, color: '#000000' }}>
              {totalUsed} out of {totalCredit}
            </Text>
          </View>
        </View>

        {/* 4338:1915 onward — Statistics, on the page under the card. */}
        <View style={{ paddingHorizontal: s(40), marginTop: s(46) }}>
          <Text style={{ fontSize: s(19), fontWeight: '700', fontFamily: FONT, color: '#000000' }}>Statistics</Text>

          <Text style={{ marginTop: s(24), fontSize: s(16), fontFamily: FONT, color: '#000000' }}>Total hours covered</Text>
          <Text style={{ marginTop: s(14), fontSize: s(17), fontWeight: '500', fontFamily: FONT, color: '#000000' }}>
            {totalUsed} Minutes
          </Text>
          {/* 4343:1919 — "-50 minutes": credits minus minutes used. Negative is
              overtime, in red; within credit is green. */}
          {totalCredit > 0 && totalUsed > 0 ? (
            <Text
              style={{
                marginTop: s(4),
                fontSize: s(12),
                fontFamily: FONT,
                color: againstCredit < 0 ? RED : '#39d47f',
              }}
            >
              {againstCredit > 0 ? '+' : againstCredit < 0 ? '-' : ''}
              {Math.abs(againstCredit)} minutes
            </Text>
          ) : null}

          <View style={{ height: 1, backgroundColor: '#e9e9e9', marginTop: s(16), marginRight: s(-40) }} />

          <Text style={{ marginTop: s(18), fontSize: s(17), fontFamily: FONT, color: '#000000' }}>Average Cleaning time</Text>
          <Text style={{ marginTop: s(4), fontSize: s(16), fontWeight: '500', fontFamily: FONT, color: '#000000' }}>
            {formatSpan(averageUsed)}
          </Text>
          {started.length > 0 && averageCredit > 0 ? (
            <Text
              style={{
                marginTop: s(4),
                marginLeft: s(2),
                fontSize: s(12),
                fontWeight: '700',
                fontFamily: FONT,
                color: averageUsed <= averageCredit ? '#39d47f' : RED,
              }}
            >
              {averageUsed <= averageCredit ? 'Good' : 'Over credit'}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

/** An 11-high bar on #cdd3dd, filled `ratio` of the way (4319:722–724). */
function Bar({ ratio, fill }: { ratio: number; fill: string }) {
  const r = Math.min(Math.max(ratio, 0), 1);
  return (
    <View className="flex-1 flex-row overflow-hidden" style={{ height: s(11), borderRadius: s(6), backgroundColor: '#cdd3dd' }}>
      <View style={{ flex: r, backgroundColor: fill }} />
      <View style={{ flex: 1 - r }} />
    </View>
  );
}

/**
 * One room — 4326:1657 onward: the number (bold 18), its guest disc (29),
 * the status as a dot and a word (light 16), then the time (medium 16) over
 * its credit (light 9); both red once over.
 */
function RoomRow({ line }: { line: RoomLine }) {
  const colour = line.over ? RED : '#000000';
  return (
    <View className="flex-row items-center" style={{ minHeight: s(56), paddingLeft: s(28), paddingRight: s(12) }}>
      <Text style={{ minWidth: s(31), fontSize: s(18), fontWeight: '700', fontFamily: FONT, color: '#000000' }} numberOfLines={1}>
        {line.room.roomNumber}
      </Text>
      <View style={{ marginLeft: s(5) }}>
        <GuestKindDisc kind={guestRowKind(line.room, 0)} size={s(29)} />
      </View>
      <View className="flex-row items-center" style={{ marginLeft: s(42), flex: 1, gap: s(6) }}>
        <View style={{ width: s(11), height: s(11), borderRadius: s(6), backgroundColor: line.statusColor }} />
        <Text style={{ fontSize: s(16), fontWeight: '300', fontFamily: FONT, color: '#000000' }} numberOfLines={1}>
          {line.statusLabel}
        </Text>
      </View>
      {/* 4338:1898 — the time starts at x290, 119 from the card's right edge. */}
      <View style={{ width: s(118) }}>
        <Text style={{ fontSize: s(16), fontWeight: '500', fontFamily: FONT, color: colour }}>{formatSpan(line.used)}</Text>
        <Text style={{ marginTop: s(2), fontSize: s(9), fontWeight: '300', fontFamily: FONT, color: line.over ? RED : '#1e1e1e' }}>
          {line.used}/{line.credit} Credits
        </Text>
      </View>
    </View>
  );
}
