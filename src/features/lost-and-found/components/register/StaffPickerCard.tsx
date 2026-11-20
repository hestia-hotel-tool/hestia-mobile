import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from '@/components/Icon';
import { typography } from '@/theme';
import type { StaffMember } from '@features/staff/types/staff.types';
import { scaleX } from '../../constants/lostAndFoundStyles';
import { StaffAvatar } from '../StaffAvatar';

const s = (n: number) => n * scaleX;

/** Figma 4649:2565 — design px, relative to the card. */
const L = {
  width: 402,
  radius: 9,
  /** The tab over "Edit": its tip 355.9 from the card's left, 7.2 above the body. */
  tab: { centerX: 355.9, side: 14, protrusion: 7.2 },
  /** "1 Selected" 21 into the body, x=22. */
  header: { top: 21, left: 22 },
  /** The search pill: 362 x 61, x=17, 29 under "1 Selected". */
  search: { top: 10, left: 17, width: 362, height: 61 },
  /** The chosen person: a #f4f6f9 band 356 x 58, 15 under the pill. */
  chosen: { top: 15, left: 22, width: 356, height: 58, avatarLeft: 14, tickRight: 19 },
  avatar: 32,
  /** Avatar to name: 14 in the band, 15 in a plain row. */
  avatarToText: 15,
  /** Plain rows: the first 31 under the band, avatars ~61.5 apart. */
  firstRowGap: 31,
  rowPitch: 61.5,
  /** The last avatar to "see all", "see all" to the card's bottom. */
  seeAllTop: 21,
  seeAllBottom: 18,
  /** Three people under the chosen one, as the frame draws. */
  previewCount: 3,
} as const;

export type StaffPickerCardProps = {
  staff: StaffMember[];
  selectedId: string;
  onPick: (id: string) => void;
  /** Opens every member of staff full-screen. */
  onSeeAll: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * The inline staff picker — Figma 4649:2427 (Lost & Found → Register step 2).
 * Opens under a "Found by" / "Registered by" / "Stored by" row when its Edit
 * is tapped, its tab pointing at the Edit: "1 Selected", a search pill, the
 * chosen person on a tinted band with a tick, three colleagues, "see all".
 * Typing in the pill lists the matches instead.
 */
export function StaffPickerCard({ staff, selectedId, onPick, onSeeAll, style }: StaffPickerCardProps) {
  const [query, setQuery] = useState('');
  const chosen = staff.find((p) => p.id === selectedId);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle) {
      return staff
        .filter((p) => p.name.toLowerCase().includes(needle) || (p.department ?? '').toLowerCase().includes(needle))
        .slice(0, L.previewCount + 1);
    }
    return staff.filter((p) => p.id !== selectedId).slice(0, L.previewCount);
  }, [staff, selectedId, query]);
  const searching = query.trim().length > 0;

  const tabSide = s(L.tab.side);

  return (
    <View style={[styles.card, style]}>
      <View style={styles.body}>
        <Text style={styles.header}>{chosen ? '1 Selected' : 'None selected'}</Text>

        <View style={styles.search}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="search"
            placeholderTextColor="rgba(0, 0, 0, 0.36)"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel="Search staff"
          />
          {searching ? (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <Icon name="action-close" size={s(12)} color="rgba(90, 117, 157, 0.59)" />
            </TouchableOpacity>
          ) : null}
        </View>

        {!searching && chosen ? <Row person={chosen} selected onPress={() => onPick(chosen.id)} banded /> : null}

        {rows.length === 0 ? (
          <Text style={styles.empty}>{searching ? 'No one matches.' : 'No staff available.'}</Text>
        ) : (
          rows.map((person, index) => (
            <Row
              key={person.id}
              person={person}
              selected={person.id === selectedId}
              banded={searching && person.id === selectedId}
              onPress={() => onPick(person.id)}
              style={{
                marginTop:
                  index === 0
                    ? s(!searching && chosen ? L.firstRowGap : L.chosen.top)
                    : s(L.rowPitch - L.avatar),
              }}
            />
          ))
        )}

        <TouchableOpacity
          style={styles.seeAll}
          onPress={onSeeAll}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="See all staff"
        >
          <Text style={styles.seeAllText}>see all</Text>
        </TouchableOpacity>
      </View>

      {/* The tab over the card's top edge — the frame's Union. */}
      <View
        pointerEvents="none"
        style={[
          styles.tab,
          {
            width: tabSide,
            height: tabSide,
            left: s(L.tab.centerX) - tabSide / 2,
            top: -tabSide / 2 + s(1),
          },
        ]}
      />
    </View>
  );
}

function Row({
  person,
  selected,
  banded = false,
  onPress,
  style,
}: {
  person: StaffMember;
  selected: boolean;
  banded?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, banded && styles.rowBanded, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={person.name}
    >
      <StaffAvatar name={person.name} avatar={person.avatar} size={s(L.avatar)} />
      <View style={[styles.rowText, { marginLeft: s(banded ? L.avatarToText - 1 : L.avatarToText) }]}>
        <Text style={styles.name} numberOfLines={1}>
          {person.name}
        </Text>
        {person.department ? (
          <Text style={styles.department} numberOfLines={1}>
            {person.department}
          </Text>
        ) : null}
      </View>
      {selected ? <Icon name="action-check-bold" size={s(14)} color="#5a759d" style={styles.tick} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: s(L.width),
    marginTop: s(L.tab.protrusion),
  },
  body: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: s(L.radius),
    paddingTop: s(L.header.top),
    paddingBottom: s(L.seeAllBottom),
  },
  tab: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#e6e6e6',
    borderTopLeftRadius: s(2),
    transform: [{ rotate: '45deg' }],
  },
  /* 4649:2594 — Inter Light 14. */
  header: {
    marginLeft: s(L.header.left),
    fontSize: s(14),
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: '#000000',
  },
  /* 4649:2602 — white, #5a759d 16% outline, fully rounded; "search" Inter SemiBold 15 at 36%. */
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    width: s(L.search.width),
    height: s(L.search.height),
    marginTop: s(L.search.top),
    marginLeft: s(L.search.left),
    paddingLeft: s(23),
    paddingRight: s(20),
    borderRadius: s(L.search.height / 2),
    borderWidth: 1,
    borderColor: 'rgba(90, 117, 157, 0.16)',
    backgroundColor: '#ffffff',
  },
  searchInput: {
    flex: 1,
    padding: 0,
    fontSize: s(15),
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '600',
    color: '#000000',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: s(L.chosen.left),
    width: s(L.chosen.width),
  },
  /* 4649:2609 — #f4f6f9, radius 12, 58 tall. */
  rowBanded: {
    height: s(L.chosen.height),
    marginTop: s(L.chosen.top),
    paddingLeft: s(L.chosen.avatarLeft),
    borderRadius: s(12),
    backgroundColor: '#f4f6f9',
  },
  rowText: {
    flex: 1,
    justifyContent: 'center',
  },
  /* Helvetica Bold 16, #1e1e1e. */
  name: {
    fontSize: s(16),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
  },
  /* Inter Light 14. */
  department: {
    fontSize: s(14),
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: '#000000',
  },
  tick: {
    marginRight: s(L.chosen.tickRight),
  },
  empty: {
    marginTop: s(L.chosen.top),
    marginLeft: s(L.chosen.left),
    fontSize: s(14),
    fontFamily: typography.fontFamily.primary,
    color: '#999999',
  },
  /* 4649:2582 — Regular 14, #5a759d, centred. */
  seeAll: {
    alignSelf: 'center',
    marginTop: s(L.seeAllTop),
  },
  seeAllText: {
    fontSize: s(14),
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
});

export default StaffPickerCard;
