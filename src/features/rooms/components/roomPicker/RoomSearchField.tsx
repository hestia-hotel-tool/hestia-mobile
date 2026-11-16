import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import { formatDatesOfStayShort, formatGuestCountWords, getFloorFromRoomNumber } from '@/utils/formatting';
import { vipTierFor } from '@/domain/vip';
import { useVipTiers } from '@/store/vipTiers';
import type { RoomPickerRoom } from '../../types/roomPicker.types';
import { GuestRow } from '../roomsList/GuestRow';

export interface RoomSearchFieldProps {
  rooms: RoomPickerRoom[];
  /** The chosen room, or `null`. Controlled. */
  value: RoomPickerRoom | null;
  onChange: (room: RoomPickerRoom | null) => void;
  scaleX: number;
  loading?: boolean;
  /**
   * Draws one result. The caller passes the full room card when it has the
   * room's card data; returning `null` (or omitting the prop) falls back to
   * the tinted guest row.
   */
  renderResult?: (room: RoomPickerRoom, choose: () => void) => React.ReactNode | null;
  style?: StyleProp<ViewStyle>;
}

/** A floor is a lot of cards; past this the reader should type more. */
const MAX_RESULTS = 10;

/** "floor 2", "fl 2", "f2", "2nd floor", "floor2" → 2. */
function floorQuery(needle: string): number | null {
  const m =
    needle.match(/^(?:floor|fl|f)\s*(\d+)$/) ?? needle.match(/^(\d+)(?:st|nd|rd|th)?\s*floor$/);
  return m ? Number(m[1]) : null;
}

/**
 * Search for the ticket's room — Figma 4649:809 (Create Ticket → Select
 * Location).
 *
 * A white pill (1px #e3e3e3, fully round, 68 tall) with the magnifier and
 * "**Search** Rooms, Guests, Floors etc"; under it, outside the pill,
 * "Results" and one card per match.
 *
 * Matches, in this order: the room number's start, any guest's name, the
 * floor ("floor 2", "2nd floor"), then the room number anywhere and the
 * front-office status ("departure").
 *
 * Tapping a result chooses that room: the pill shows its number and only that
 * card stays, which is the confirmation. Editing the text clears the choice.
 */
export default function RoomSearchField({
  rooms,
  value,
  onChange,
  scaleX,
  loading = false,
  renderResult,
  style,
}: RoomSearchFieldProps) {
  const styles = useMemo(() => buildStyles(scaleX), [scaleX]);
  const vipTiers = useVipTiers();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState(value?.number ?? '');

  const { results, total } = useMemo(() => {
    if (value) return { results: [value], total: 1 };
    const needle = query.trim().toLowerCase();
    if (!needle) return { results: [], total: 0 };

    const floor = floorQuery(needle);
    const guestMatches = (r: RoomPickerRoom) =>
      [r.primaryGuest, ...r.guests].some((g) => (g?.fullName ?? '').toLowerCase().includes(needle));

    const tiers: ((r: RoomPickerRoom) => boolean)[] = [
      (r) => r.number.toLowerCase().startsWith(needle),
      guestMatches,
      (r) => floor !== null && getFloorFromRoomNumber(r.number) === floor,
      (r) =>
        r.number.toLowerCase().includes(needle) ||
        (needle.length >= 3 && (r.frontOfficeStatus ?? '').toLowerCase().includes(needle)),
    ];
    const seen = new Set<string>();
    const ordered: RoomPickerRoom[] = [];
    for (const test of tiers) {
      for (const r of rooms) {
        if (!seen.has(r.id) && test(r)) {
          seen.add(r.id);
          ordered.push(r);
        }
      }
    }
    return { results: ordered.slice(0, MAX_RESULTS), total: ordered.length };
  }, [rooms, query, value]);

  const searching = query.trim().length > 0;
  // With several rooms the guest alone does not say which room a fallback
  // row is; with one (the typed number) the row is enough.
  const showRoomNumber = results.length > 1;

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (value) onChange(null);
  };

  const choose = (room: RoomPickerRoom) => {
    setQuery(room.number);
    onChange(room);
    Keyboard.dismiss();
  };

  const guestRowFor = (room: RoomPickerRoom) => {
    const guest = room.primaryGuest;
    const tier = guest?.vipCode ? vipTierFor(guest.vipCode, vipTiers) : null;
    const guestName = guest?.fullName?.trim();
    const name = guestName
      ? showRoomNumber
        ? `${room.number} · ${guestName}`
        : guestName
      : `Room ${room.number}`;
    const timePrefix =
      room.guestKind === 'arrival' ? 'ETA' : room.guestKind === 'departure' ? 'EDT' : null;
    return (
      <TouchableOpacity
        key={room.id}
        style={styles.resultRow}
        onPress={() => choose(room)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: value?.id === room.id }}
        accessibilityLabel={guestName ? `Room ${room.number}, ${guestName}` : `Room ${room.number}, no guest`}
      >
        <GuestRow
          name={name}
          kind={guestName ? room.guestKind : 'vacant'}
          imageUrl={guest?.imageUrl ?? null}
          timeLabel={guestName && timePrefix && room.time ? `${timePrefix}: ${room.time}` : undefined}
          occupancy={
            guestName
              ? formatGuestCountWords({ adults: room.adults ?? 0, kids: room.kids ?? 0 }) || undefined
              : 'Vacant'
          }
          dates={
            guestName && room.checkIn && room.checkOut
              ? formatDatesOfStayShort({ from: room.checkIn, to: room.checkOut })
              : undefined
          }
          vip={tier && guest?.vipCode ? { code: guest.vipCode, tier } : undefined}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={style}>
      {/* 4649:888 — the pill; 4649:889 the magnifier; 4649:893 the hint. */}
      <TouchableOpacity
        style={styles.pill}
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        accessible={false}
      >
        <View style={styles.searchIcon}>
          <Icon name="action-search" size={24 * scaleX} color="#5a759d" />
        </View>
        <View style={styles.inputWrap}>
          {query.length === 0 ? (
            <Text style={styles.hint} numberOfLines={1} pointerEvents="none">
              <Text style={styles.hintStrong}>Search </Text>
              Rooms, Guests, Floors etc
            </Text>
          ) : null}
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={handleChangeText}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search rooms, guests, floors"
          />
        </View>
      </TouchableOpacity>

      {searching ? (
        <>
          <Text style={styles.resultsLabel}>Results</Text>
          {loading && rooms.length === 0 ? (
            <View style={styles.empty}>
              <ActivityIndicator color="#5a759d" />
            </View>
          ) : results.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nothing matches “{query.trim()}”.</Text>
            </View>
          ) : (
            <View style={styles.results}>
              {results.map((room) => {
                const custom = renderResult?.(room, () => choose(room));
                return custom ? <React.Fragment key={room.id}>{custom}</React.Fragment> : guestRowFor(room);
              })}
              {total > results.length ? (
                <Text style={styles.moreText}>
                  {total - results.length} more — keep typing to narrow it down.
                </Text>
              ) : null}
            </View>
          )}
        </>
      ) : null}
    </View>
  );
}

function buildStyles(scaleX: number) {
  const androidText = Platform.select({
    android: { includeFontPadding: false } as const,
    default: {} as const,
  });

  return StyleSheet.create({
    pill: {
      height: 68 * scaleX,
      borderRadius: 34 * scaleX,
      backgroundColor: '#ffffff',
      borderWidth: 1,
      borderColor: '#e3e3e3',
      flexDirection: 'row',
      alignItems: 'center',
    },
    /* The glyph's box starts 27 in; the hint 66 in (x=54 and x=93 on the frame). */
    searchIcon: {
      marginLeft: 27 * scaleX,
      width: 24 * scaleX,
      height: 24 * scaleX,
      alignItems: 'center',
      justifyContent: 'center',
      // The registry glyph has its handle bottom-left; the design's points bottom-right.
      transform: [{ scaleX: -1 }],
    },
    inputWrap: {
      flex: 1,
      marginLeft: 15 * scaleX,
      marginRight: 24 * scaleX,
      justifyContent: 'center',
      alignSelf: 'stretch',
    },
    hint: {
      position: 'absolute',
      left: 0,
      right: 0,
      fontSize: 15 * scaleX,
      fontFamily: typography.fontFamily.secondary,
      fontWeight: '300',
      color: '#000000',
      opacity: 0.36,
      ...androidText,
    },
    hintStrong: {
      fontWeight: '600',
    },
    input: {
      height: '100%',
      padding: 0,
      fontSize: 15 * scaleX,
      fontFamily: typography.fontFamily.secondary,
      fontWeight: '500',
      color: '#000000',
      ...androidText,
    },
    /* 4649:918 — Inter Light 15, 3 in from the pill, 16 under it; the card 20 under. */
    resultsLabel: {
      marginTop: 16 * scaleX,
      marginLeft: 3 * scaleX,
      marginBottom: 20 * scaleX,
      fontSize: 15 * scaleX,
      fontFamily: typography.fontFamily.secondary,
      fontWeight: '300',
      color: '#000000',
      ...androidText,
    },
    results: {
      gap: 12 * scaleX,
    },
    /* Fallback row when there is no card data: 4592:76's tinted guest row. */
    resultRow: {
      minHeight: 84 * scaleX,
      borderRadius: 10 * scaleX,
      backgroundColor: 'rgba(223, 230, 240, 0.4)',
      paddingLeft: 28 * scaleX,
      paddingRight: 10 * scaleX,
      paddingTop: 14 * scaleX,
      paddingBottom: 10 * scaleX,
    },
    empty: {
      minHeight: 60 * scaleX,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16 * scaleX,
    },
    emptyText: {
      fontSize: 14 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '300',
      color: '#5a759d',
      textAlign: 'center',
      ...androidText,
    },
    moreText: {
      fontSize: 13 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '300',
      color: '#5a759d',
      textAlign: 'center',
      ...androidText,
    },
  });
}
