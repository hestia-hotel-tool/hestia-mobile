import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { typography } from '@/theme';
import { formatDatesOfStayShort, formatGuestCountWords } from '@/utils/formatting';
import { vipTierFor } from '@/domain/vip';
import { useVipTiers } from '@/store/vipTiers';
import type { RoomPickerRoom } from '../../types/roomPicker.types';
import { GuestRow } from '../roomsList/GuestRow';
import { ROOM_PICKER_LAYOUT as L } from './roomPickerLayout';

export interface RoomSearchFieldProps {
  rooms: RoomPickerRoom[];
  /** The chosen room, or `null`. Controlled. */
  value: RoomPickerRoom | null;
  onChange: (room: RoomPickerRoom | null) => void;
  scaleX: number;
  loading?: boolean;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

/** More than this and the reader should type more, not scroll a card. */
const MAX_RESULTS = 5;

/**
 * Type a room number, pick the room from what comes up — Figma 1085:2628
 * (Create Ticket → Location, node 3005:494 and 4592:75).
 *
 * A white card with the halo of the picker card: the field on top ("201|",
 * Inter Medium 16), and once something is typed, a tiny "Results" and one
 * tinted row per match drawn exactly as the room card's guest row (photo with
 * its front-office disc, name, "EDT: 12:00  2 Adults, 2 Kids", the stay, the
 * grey VIP disc) — `GuestRow` itself, so the two never drift.
 *
 * Tapping a result chooses that room: the field shows its number and the card
 * keeps just that row, which is the confirmation. Editing the text again
 * clears the choice.
 *
 * Matches the room number first, then the guest's name — the same rule as the
 * picker modal's search.
 */
export default function RoomSearchField({
  rooms,
  value,
  onChange,
  scaleX,
  loading = false,
  placeholder = 'Room number',
  style,
}: RoomSearchFieldProps) {
  const styles = useMemo(() => buildStyles(scaleX), [scaleX]);
  const vipTiers = useVipTiers();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState(value?.number ?? '');

  const results = useMemo(() => {
    if (value) return [value];
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const byNumber = rooms.filter((r) => r.number.toLowerCase().startsWith(needle));
    const byOther = rooms.filter(
      (r) =>
        !byNumber.includes(r) &&
        (r.number.toLowerCase().includes(needle) ||
          (r.primaryGuest?.fullName ?? '').toLowerCase().includes(needle)),
    );
    return [...byNumber, ...byOther].slice(0, MAX_RESULTS);
  }, [rooms, query, value]);

  const searching = query.trim().length > 0;
  // With several rooms in the list the guest alone does not say which room a
  // row is; with one (the typed number) the design's row is enough.
  const showRoomNumber = results.length > 1;

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (value) onChange(null);
  };

  const choose = (room: RoomPickerRoom) => {
    setQuery(room.number);
    onChange(room);
    inputRef.current?.blur();
  };

  return (
    <View style={[styles.card, style]}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={query}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9aa7bd"
        keyboardType="default"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Room number"
      />

      {searching ? (
        <>
          <Text style={styles.resultsLabel}>Results</Text>
          {loading && rooms.length === 0 ? (
            <View style={styles.empty}>
              <ActivityIndicator color="#5a759d" />
            </View>
          ) : results.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No room matches “{query.trim()}”.</Text>
            </View>
          ) : (
            <View style={styles.results}>
              {results.map((room) => {
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
                    style={[styles.resultRow, value?.id === room.id && styles.resultRowChosen]}
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
              })}
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
    /*
     * Node 3005:494 ("Union"): white, radius 9, 1px #e6e6e6, and the picker
     * card's halo (#6483b0 at 40%, blur 105, spread -35 — see
     * roomPickerLayout.card for how that maps to React Native).
     */
    card: {
      backgroundColor: '#ffffff',
      borderRadius: 9 * scaleX,
      borderWidth: 1,
      borderColor: L.card.borderColor,
      shadowColor: L.card.shadowColor,
      shadowOpacity: L.card.shadowOpacity,
      shadowRadius: L.card.shadowRadius,
      shadowOffset: { width: 0, height: L.card.shadowOffsetY },
      elevation: 6,
      overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
    },
    /* "201|" — Inter Medium 16 black, 14 in and 21 down (4592:97). */
    input: {
      height: 60 * scaleX,
      paddingHorizontal: 14 * scaleX,
      fontSize: 16 * scaleX,
      fontFamily: typography.fontFamily.secondary,
      fontWeight: '500',
      color: '#000000',
      ...androidText,
    },
    /* "Results" — Inter Light 7, 13 in (4592:98). */
    resultsLabel: {
      marginLeft: 13 * scaleX,
      marginBottom: 10 * scaleX,
      fontSize: 7 * scaleX,
      fontFamily: typography.fontFamily.secondary,
      fontWeight: '300',
      color: '#000000',
      ...androidText,
    },
    results: {
      gap: 4 * scaleX,
      paddingHorizontal: 1,
      paddingBottom: 1,
    },
    /* 4592:76 — rgba(223,230,240,0.4), radius 10, 84 tall; the photo 28 in. */
    resultRow: {
      minHeight: 84 * scaleX,
      borderRadius: 10 * scaleX,
      backgroundColor: 'rgba(223, 230, 240, 0.4)',
      paddingLeft: 28 * scaleX,
      paddingRight: 10 * scaleX,
      paddingTop: 14 * scaleX,
      paddingBottom: 10 * scaleX,
    },
    resultRowChosen: {
      backgroundColor: 'rgba(223, 230, 240, 0.7)',
    },
    empty: {
      minHeight: 60 * scaleX,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16 * scaleX,
      paddingBottom: 8 * scaleX,
    },
    emptyText: {
      fontSize: 14 * scaleX,
      fontFamily: typography.fontFamily.primary,
      fontWeight: '300',
      color: '#5a759d',
      textAlign: 'center',
      ...androidText,
    },
  });
}
