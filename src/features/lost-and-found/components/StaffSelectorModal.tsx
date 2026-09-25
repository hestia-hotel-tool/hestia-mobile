import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography } from '@/theme';
import { Icon } from '@/components/Icon';
import { StaffMember } from '@features/staff/types/staff.types';
import { scaleX } from '../constants/lostAndFoundStyles';
import { StaffAvatar } from './StaffAvatar';

interface StaffSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (staffId: string) => void;
  selectedStaffId?: string;
  title: string;
  staff?: StaffMember[];
  showMeOption?: boolean;
  currentUserId?: string;
  inputFieldPosition?: { x: number; y: number; width: number; height: number } | null;
}

/**
 * Figma 733:192, node 733:255 — every value in design px, card-relative.
 *
 * The card (Rectangle 27) is 394 wide at x=24, three short of the field it
 * hangs from (x=27), and its tab (Vector 46) peaks 7 below the field's bottom
 * edge. It is the same card and tab the room picker draws (node 1102:3198), so
 * the tab uses the same geometry — see `ROOM_PICKER_LAYOUT.notch`.
 */
const L = {
  card: { width: 394, offsetX: -3, radius: 9, border: '#e6e6e6' },
  /** Field bottom (347) to the tab's tip (354). */
  fieldGap: 7,
  tab: { centerX: 43.89, side: 26, radius: 4, protrusion: 7.47 },
  /** Title at y=382, card top at 361.47. "1 Selected" ends 27 from the right. */
  header: { top: 20.5, left: 18, right: 27, height: 20 },
  /** Title bottom (402) to the Me avatar (427). */
  headerToMe: 25,
  avatar: 32,
  /** Avatar ends at x=74, names start at x=88-89. */
  avatarToText: 15,
  /** Me avatar bottom (459) to the rule (472); rule to the next avatar (489). */
  meToRule: 13,
  ruleToRow: 17,
  /** The rule spans x=26..415 — 2 in from each edge of the card. */
  ruleInset: 2,
  /** Avatar tops 489 -> 545 -> 601. */
  rowPitch: 56,
  /** Node 733:388 — the tick ends 43 short of the card's right edge. */
  tick: { size: 17, right: 43 },
  /** Last avatar bottom (633) to "see all" (654); card ends 15 below it. */
  lastRowToSeeAll: 21,
  seeAllBottom: 15,
  /** The design lists exactly three people under "Me". */
  previewCount: 3,
} as const;

const s = (n: number) => n * scaleX;

/**
 * "Founded by" / "Registered by" — Figma 733:192.
 *
 * A popover card hanging from the field: the signed-in user, a rule, three
 * colleagues, and "see all", which opens every member of staff full-screen with
 * a search field. The card itself has no search: the frame draws none, and a
 * text field inside an anchored popover gets covered by the keyboard.
 */
export default function StaffSelectorModal({
  visible,
  onClose,
  onSelect,
  selectedStaffId,
  title,
  staff,
  showMeOption = false,
  currentUserId,
  inputFieldPosition,
}: StaffSelectorModalProps) {
  const [showAll, setShowAll] = useState(false);

  const list = useMemo(() => (Array.isArray(staff) ? staff : []), [staff]);
  const me = useMemo(
    () => (showMeOption && currentUserId ? list.find((p) => p.id === currentUserId) : undefined),
    [list, showMeOption, currentUserId]
  );
  /** Everyone but the "Me" row. */
  const others = useMemo(() => (me ? list.filter((p) => p.id !== me.id) : list), [list, me]);

  /**
   * The three shown under "Me". The chosen person leads when it is not you, so
   * the tick is always on screen — node 733:367 draws the selection first.
   */
  const preview = useMemo(() => {
    const chosen = others.find((p) => p.id === selectedStaffId);
    const rest = others.filter((p) => p.id !== selectedStaffId);
    return (chosen ? [chosen, ...rest] : rest).slice(0, L.previewCount);
  }, [others, selectedStaffId]);

  const pick = (id: string) => {
    onSelect(id);
    setShowAll(false);
    onClose();
  };

  if (!visible) return null;

  const cardLeft = (inputFieldPosition?.x ?? s(27)) + s(L.card.offsetX);
  const cardTop =
    (inputFieldPosition ? inputFieldPosition.y + inputFieldPosition.height : s(347)) +
    s(L.fieldGap + L.tab.protrusion);
  const tabSide = s(L.tab.side);
  // A rotated square's top corner sits (side * (sqrt2 - 1) / 2) above its box.
  const tabTop = -s(L.tab.protrusion) + (tabSide * (Math.SQRT2 - 1)) / 2;

  return (
    <>
      <Modal transparent visible={visible && !showAll} animationType="fade" onRequestClose={onClose}>
        {/* No dim: the frame shows the form, crisp, behind the card. */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />

        <View
          style={[
            styles.card,
            { left: cardLeft, top: cardTop, width: s(L.card.width), borderRadius: s(L.card.radius) },
          ]}
        >
          <View style={styles.cardClip}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {selectedStaffId ? <Text style={styles.selected}>1 Selected</Text> : null}
            </View>

            {me ? (
              <>
                <Row
                  person={me}
                  meLabel
                  selected={selectedStaffId === me.id}
                  onPress={() => pick(me.id)}
                  style={{ marginTop: s(L.headerToMe) }}
                />
                <View style={styles.rule} />
              </>
            ) : (
              <View style={{ height: s(L.headerToMe) }} />
            )}

            {preview.length === 0 ? (
              <Text style={styles.empty}>No staff available.</Text>
            ) : (
              preview.map((person, index) => (
                <Row
                  key={person.id}
                  person={person}
                  selected={selectedStaffId === person.id}
                  onPress={() => pick(person.id)}
                  style={{
                    marginTop: index === 0 ? (me ? s(L.ruleToRow) : 0) : s(L.rowPitch - L.avatar),
                  }}
                />
              ))
            )}

            <TouchableOpacity
              style={styles.seeAll}
              onPress={() => setShowAll(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`See all staff for ${title}`}
            >
              <Text style={styles.seeAllText}>see all</Text>
            </TouchableOpacity>
          </View>

          {/* The tab, drawn over the card's top edge so the two read as one
              shape — the frame's Union. */}
          <View
            pointerEvents="none"
            style={[
              styles.tab,
              {
                width: tabSide,
                height: tabSide,
                borderRadius: s(L.tab.radius),
                top: tabTop,
                left: s(L.tab.centerX) - tabSide / 2,
              },
            ]}
          />
        </View>
      </Modal>

      <AllStaffModal
        visible={visible && showAll}
        title={title}
        me={me}
        others={others}
        selectedStaffId={selectedStaffId}
        onPick={pick}
        onBack={() => setShowAll(false)}
      />
    </>
  );
}

type RowProps = {
  person: StaffMember;
  selected: boolean;
  onPress: () => void;
  /** The signed-in user: "Me" above the name, no department below. */
  meLabel?: boolean;
  style?: object;
};

/** One person — nodes 733:366 (Me) and 733:367/370/373. */
function Row({ person, selected, onPress, meLabel = false, style }: RowProps) {
  return (
    <TouchableOpacity
      style={[styles.row, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={meLabel ? `Me, ${person.name}` : person.name}
    >
      <StaffAvatar name={person.name} avatar={person.avatar} size={s(L.avatar)} />
      <View style={styles.rowText}>
        {meLabel ? <Text style={styles.meLabel}>Me</Text> : null}
        <Text style={styles.name} numberOfLines={1}>
          {person.name}
        </Text>
        {!meLabel && person.department ? (
          <Text style={styles.department} numberOfLines={1}>
            {person.department}
          </Text>
        ) : null}
      </View>
      {selected ? (
        <View style={styles.tick}>
          <Icon name="action-check-bold" size={s(L.tick.size)} color="#5a759d" />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

type AllStaffModalProps = {
  visible: boolean;
  title: string;
  me?: StaffMember;
  others: StaffMember[];
  selectedStaffId?: string;
  onPick: (id: string) => void;
  onBack: () => void;
};

/**
 * "see all" — every member of staff, full screen, with a search field.
 *
 * No frame draws this screen. It takes the room picker's full-screen shell
 * (RoomPickerModal: the #e4eefe band, back chevron, 24pt title) so the app's
 * two "choose from everything" screens look alike, and the dropdown's own row.
 */
function AllStaffModal({ visible, title, me, others, selectedStaffId, onPick, onBack }: AllStaffModalProps) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return others;
    return others.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        (p.department ?? '').toLowerCase().includes(needle)
    );
  }, [others, query]);

  const meMatches =
    !!me && (!query.trim() || me.name.toLowerCase().includes(query.trim().toLowerCase()));

  const close = () => {
    setQuery('');
    onBack();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={close}>
      <View style={styles.screen}>
        <View style={[styles.screenHeader, { paddingTop: insets.top + s(10) }]}>
          <TouchableOpacity
            onPress={close}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Icon name="action-chevron" size={s(28)} color="#607aa1" />
          </TouchableOpacity>
          <Text style={styles.screenTitle} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.searchField}>
          <Icon name="action-search" size={s(16)} color="rgba(90, 117, 157, 0.59)" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search staff or department"
            placeholderTextColor="#9aa7bd"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            onSubmitEditing={Keyboard.dismiss}
          />
          {query.length > 0 ? (
            <TouchableOpacity
              onPress={() => setQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Icon name="action-plus" size={s(12)} color="#8b9bb4" style={styles.clearGlyph} />
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.screenList, { paddingBottom: insets.bottom + s(24) }]}
          ListHeaderComponent={
            meMatches && me ? (
              <>
                <Row person={me} meLabel selected={selectedStaffId === me.id} onPress={() => onPick(me.id)} />
                <View style={[styles.rule, styles.screenRule]} />
              </>
            ) : null
          }
          ItemSeparatorComponent={() => <View style={{ height: s(L.rowPitch - L.avatar) }} />}
          renderItem={({ item }) => (
            <Row person={item} selected={selectedStaffId === item.id} onPress={() => onPick(item.id)} />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query.trim() ? `No staff match "${query.trim()}".` : 'No staff available.'}
            </Text>
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: L.card.border,
    // Node 733:257 — #6483b0 at 40%, blur 105, spread -35: a soft halo. RN has
    // no spread, so it is approximated as the room picker's card does.
    shadowColor: '#6483b0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 6,
  },
  /** Clips the rows to the radius; the tab is outside it, so it still shows. */
  cardClip: {
    borderRadius: s(L.card.radius),
    overflow: 'hidden',
  },
  tab: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: L.card.border,
    transform: [{ rotate: '45deg' }],
    zIndex: 2,
    elevation: 7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: s(L.header.top),
    paddingLeft: s(L.header.left),
    paddingRight: s(L.header.right),
    minHeight: s(L.header.height),
  },
  // Node 733:261 — Helvetica Bold 17, #607aa1.
  title: {
    fontSize: s(17),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#607aa1',
  },
  // Node 733:390 — Light 14, black.
  selected: {
    fontSize: s(14),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: s(L.header.left),
    minHeight: s(L.avatar),
  },
  rowText: {
    flex: 1,
    marginLeft: s(L.avatarToText),
    justifyContent: 'center',
  },
  // Node 733:379 — Regular 11, #5a759d.
  meLabel: {
    fontSize: s(11),
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  // Nodes 733:382 / 733:369 — Bold 16, #1e1e1e.
  name: {
    fontSize: s(16),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#1e1e1e',
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  // Node 733:391 — Light 14, black.
  department: {
    fontSize: s(14),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    marginTop: s(1),
    ...Platform.select({ android: { includeFontPadding: false } }),
  },
  tick: {
    width: s(L.tick.size),
    marginRight: s(L.tick.right),
    alignItems: 'center',
  },
  // Node 733:389 — #5a759d at 13%.
  rule: {
    height: 1,
    backgroundColor: 'rgba(90, 117, 157, 0.13)',
    marginHorizontal: s(L.ruleInset),
    marginTop: s(L.meToRule),
  },
  // Node 733:387 — Regular 14, #5a759d, centred.
  seeAll: {
    alignItems: 'center',
    marginTop: s(L.lastRowToSeeAll),
    paddingBottom: s(L.seeAllBottom),
  },
  seeAllText: {
    fontSize: s(14),
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },
  empty: {
    paddingHorizontal: s(L.header.left),
    paddingVertical: s(12),
    fontSize: s(14),
    fontFamily: typography.fontFamily.primary,
    color: '#5a759d',
  },

  // "see all" — the room picker's full-screen shell.
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e4eefe',
    paddingHorizontal: s(24),
    paddingBottom: s(18),
    gap: s(28),
  },
  screenTitle: {
    flex: 1,
    fontSize: s(24),
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#607aa1',
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: s(24),
    marginTop: s(12),
    height: s(46),
    borderRadius: s(10),
    borderWidth: 1,
    borderColor: '#afa9ad',
    paddingHorizontal: s(14),
    gap: s(10),
  },
  searchInput: {
    flex: 1,
    fontSize: s(15),
    fontFamily: typography.fontFamily.primary,
    color: '#1e1e1e',
    paddingVertical: 0,
  },
  /** `action-plus` turned 45deg reads as a clear cross. */
  clearGlyph: {
    transform: [{ rotate: '45deg' }],
  },
  screenList: {
    paddingTop: s(20),
  },
  screenRule: {
    marginBottom: s(L.ruleToRow),
  },
});
