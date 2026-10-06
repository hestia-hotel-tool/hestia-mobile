import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { typography } from '@/theme';
import type { User } from '@/types';
import { groupByDepartment, matchesColleague, type ColleagueSection } from '../utils/colleagues';
import { CHAT_COLORS, scaleX } from '../constants/chatStyles';

type Props = {
  visible: boolean;
  staff: User[];
  loading: boolean;
  /** Ids already excluded when the sheet opens. */
  selectedIds: string[];
  onDone: (ids: string[]) => void;
  onClose: () => void;
};

type Tri = 'none' | 'some' | 'all';

function stateOf(ids: string[], picked: Set<string>): Tri {
  const n = ids.filter((id) => picked.has(id)).length;
  return n === 0 ? 'none' : n === ids.length ? 'all' : 'some';
}

/**
 * The excluded staff, summarised for chips and the form field: a department
 * whose whole team is excluded becomes one entry, everyone else is listed by
 * name. Shared with the form so both describe the choice the same way.
 */
export function summariseExclusion(
  staff: User[],
  ids: readonly string[]
): { departments: ColleagueSection[]; people: User[] } {
  const picked = new Set(ids);
  const departments: ColleagueSection[] = [];
  const people: User[] = [];
  for (const section of groupByDepartment(staff)) {
    const state = stateOf(section.data.map((u) => u.id), picked);
    if (state === 'all') departments.push(section);
    else if (state === 'some') people.push(...section.data.filter((u) => picked.has(u.id)));
  }
  return { departments, people };
}

function Checkbox({ state }: { state: Tri }) {
  return (
    <View style={[styles.checkbox, state !== 'none' ? styles.checkboxOn : null]}>
      {state === 'all' ? <Icon name="action-check-bold" size={12 * scaleX} color="#ffffff" /> : null}
      {state === 'some' ? <View style={styles.dash} /> : null}
    </View>
  );
}

/**
 * Choose who a General Announcement skips — whole departments, specific
 * people, or both.
 *
 * Figma 4241:405 shows only the closed field; there is no frame for the picker.
 * Every department is a section with its own checkbox (ticked, dashed when
 * part of the team is excluded, empty), and every person has one under it.
 * Chips at the top sum up the choice — a fully excluded department is one
 * chip, not a row of names — and each chip removes what it stands for.
 */
export function ExcludeStaffModal({ visible, staff, loading, selectedIds, onDone, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(() => new Set(selectedIds));

  // Department checkboxes act on the whole team, not just those matching a search.
  const allSections = useMemo(() => groupByDepartment(staff), [staff]);
  const teamIds = useMemo(
    () => new Map(allSections.map((s) => [s.title, s.data.map((u) => u.id)])),
    [allSections]
  );
  const sections = useMemo(
    () => groupByDepartment(staff.filter((u) => matchesColleague(u, query))),
    [staff, query]
  );
  const summary = useMemo(() => summariseExclusion(staff, [...picked]), [staff, picked]);

  const setMany = (ids: string[], on: boolean) =>
    setPicked((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const toggle = (id: string) => setMany([id], !picked.has(id));

  // A page sheet on iOS has its own top gap; a full-screen modal on Android needs the inset.
  const topPad = Platform.OS === 'ios' ? 0 : insets.top;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      // Start from what the form holds each time it opens, not what was last ticked and abandoned.
      onShow={() => {
        setPicked(new Set(selectedIds));
        setQuery('');
      }}
    >
      <View style={[styles.screen, { paddingTop: topPad }]}>
        <View style={styles.bar}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button">
            <Text style={styles.barSide}>Cancel</Text>
          </Pressable>
          <Text style={styles.barTitle}>Exclude Staff</Text>
          <Pressable onPress={() => onDone([...picked])} hitSlop={10} accessibilityRole="button">
            <Text style={[styles.barSide, styles.barDone]}>Done</Text>
          </Pressable>
        </View>

        <Text style={styles.help}>
          Tick a department to leave out its whole team, or tick specific people.
        </Text>

        <View style={styles.search}>
          <Icon name="action-search" size={16 * scaleX} color="rgba(90, 117, 157, 0.59)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, role or department"
            placeholderTextColor="rgba(0,0,0,0.36)"
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {picked.size > 0 ? (
          <View>
            <View style={styles.summaryHead}>
              <Text style={styles.summaryTitle}>
                {picked.size} {picked.size === 1 ? 'person' : 'people'} excluded
              </Text>
              <Pressable onPress={() => setPicked(new Set())} hitSlop={10} accessibilityRole="button">
                <Text style={styles.clear}>Clear all</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              keyboardShouldPersistTaps="handled"
            >
              {summary.departments.map((d) => (
                <Pressable
                  key={`d:${d.title}`}
                  style={[styles.chip, styles.chipDept]}
                  onPress={() => setMany(d.data.map((u) => u.id), false)}
                  accessibilityRole="button"
                  accessibilityLabel={`Include ${d.title} again`}
                >
                  <Icon name="action-group" size={14 * scaleX} color="#ffffff" />
                  <Text style={[styles.chipText, styles.chipDeptText]} numberOfLines={1}>
                    {d.title} · all {d.data.length}
                  </Text>
                  <View style={styles.chipX}>
                    <Icon name="action-plus" size={8 * scaleX} color={CHAT_COLORS.glyph} />
                  </View>
                </Pressable>
              ))}
              {summary.people.map((u) => (
                <Pressable
                  key={`u:${u.id}`}
                  style={styles.chip}
                  onPress={() => toggle(u.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Include ${u.name} again`}
                >
                  <Avatar uri={u.avatar} name={u.name} size={22 * scaleX} />
                  <Text style={styles.chipText} numberOfLines={1}>
                    {u.name}
                  </Text>
                  <View style={styles.chipX}>
                    <Icon name="action-plus" size={8 * scaleX} color={CHAT_COLORS.glyph} />
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <SectionList
          sections={sections}
          keyExtractor={(u) => u.id}
          stickySectionHeadersEnabled
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          extraData={picked}
          contentContainerStyle={{ paddingBottom: 24 * scaleX }}
          renderSectionHeader={({ section }) => {
            const ids = teamIds.get(section.title) ?? section.data.map((u) => u.id);
            const state = stateOf(ids, picked);
            const excludedCount = ids.filter((id) => picked.has(id)).length;
            return (
              <Pressable
                style={styles.dept}
                onPress={() => setMany(ids, state !== 'all')}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: state === 'all' ? true : state === 'some' ? 'mixed' : false }}
                accessibilityLabel={`Exclude all of ${section.title}`}
              >
                <View style={styles.deptText}>
                  <Text style={styles.deptTitle} numberOfLines={1}>
                    {section.title}
                  </Text>
                  <Text style={styles.deptMeta}>
                    {excludedCount === 0
                      ? `${ids.length} staff`
                      : state === 'all'
                        ? `Whole team excluded · ${ids.length}`
                        : `${excludedCount} of ${ids.length} excluded`}
                  </Text>
                </View>
                <Checkbox state={state} />
              </Pressable>
            );
          }}
          renderItem={({ item }) => {
            const on = picked.has(item.id);
            const subtitle = item.jobTitle || item.role;
            return (
              <Pressable
                style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
                onPress={() => toggle(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`Exclude ${item.name}`}
              >
                <Avatar uri={item.avatar} name={item.name} size={40 * scaleX} />
                <View style={styles.rowText}>
                  <Text style={[styles.name, on ? styles.nameExcluded : null]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {subtitle ? (
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <Checkbox state={on ? 'all' : 'none'} />
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {loading ? 'Loading staff…' : query ? `Nobody matches “${query.trim()}”.` : 'No staff found.'}
            </Text>
          }
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 * scaleX }]}>
          <Pressable style={styles.primary} onPress={() => onDone([...picked])} accessibilityRole="button">
            <Text style={styles.primaryText}>
              {picked.size === 0
                ? 'Send to everyone'
                : `Exclude ${picked.size} ${picked.size === 1 ? 'person' : 'people'}`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const SIDE = 20;
const AVATAR = 40;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIDE * scaleX,
    height: 56 * scaleX,
    backgroundColor: CHAT_COLORS.headerBackground,
  },
  barTitle: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.title,
  },
  barSide: {
    minWidth: 56 * scaleX,
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: CHAT_COLORS.glyph,
  },
  barDone: {
    textAlign: 'right',
    fontWeight: '700',
  },
  help: {
    paddingHorizontal: SIDE * scaleX,
    paddingTop: 14 * scaleX,
    fontSize: 13 * scaleX,
    lineHeight: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#6b7a90',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12 * scaleX,
    marginHorizontal: SIDE * scaleX,
    height: 44 * scaleX,
    borderRadius: 22 * scaleX,
    paddingHorizontal: 16 * scaleX,
    backgroundColor: CHAT_COLORS.searchBackground,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10 * scaleX,
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: CHAT_COLORS.textPrimary,
    paddingVertical: 0,
  },
  summaryHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIDE * scaleX,
    paddingTop: 14 * scaleX,
    paddingBottom: 8 * scaleX,
  },
  summaryTitle: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.textPrimary,
  },
  clear: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '600',
    color: CHAT_COLORS.badge,
  },
  chips: {
    paddingHorizontal: SIDE * scaleX,
    paddingBottom: 12 * scaleX,
    gap: 8 * scaleX,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32 * scaleX,
    paddingLeft: 5 * scaleX,
    paddingRight: 7 * scaleX,
    borderRadius: 16 * scaleX,
    backgroundColor: CHAT_COLORS.headerBackground,
  },
  chipDept: {
    paddingLeft: 10 * scaleX,
    backgroundColor: CHAT_COLORS.glyph,
  },
  chipText: {
    maxWidth: 150 * scaleX,
    marginLeft: 6 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '600',
    color: CHAT_COLORS.textPrimary,
  },
  chipDeptText: {
    color: '#ffffff',
  },
  chipX: {
    marginLeft: 6 * scaleX,
    width: 16 * scaleX,
    height: 16 * scaleX,
    borderRadius: 8 * scaleX,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    // `action-plus` turned into a ×.
    transform: [{ rotate: '45deg' }],
  },
  dept: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIDE * scaleX,
    paddingVertical: 10 * scaleX,
    backgroundColor: '#f4f7fc',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90, 117, 157, 0.15)',
  },
  deptText: {
    flex: 1,
    minWidth: 0,
    marginRight: 12 * scaleX,
  },
  deptTitle: {
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.glyph,
  },
  deptMeta: {
    marginTop: 2 * scaleX,
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: '#6b7a90',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIDE * scaleX,
    paddingVertical: 10 * scaleX,
    backgroundColor: '#ffffff',
  },
  pressed: {
    backgroundColor: 'rgba(90, 117, 157, 0.07)',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 14 * scaleX,
    marginRight: 12 * scaleX,
  },
  name: {
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '600',
    color: CHAT_COLORS.textPrimary,
  },
  nameExcluded: {
    color: '#8a94a6',
    textDecorationLine: 'line-through',
  },
  subtitle: {
    marginTop: 2 * scaleX,
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#6b7a90',
  },
  checkbox: {
    width: 24 * scaleX,
    height: 24 * scaleX,
    borderWidth: 1.5,
    borderColor: '#b7c2d3',
    borderRadius: 4 * scaleX,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxOn: {
    backgroundColor: CHAT_COLORS.glyph,
    borderColor: CHAT_COLORS.glyph,
  },
  dash: {
    width: 10 * scaleX,
    height: 2.5 * scaleX,
    borderRadius: 2,
    backgroundColor: '#ffffff',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: (SIDE + AVATAR + 14) * scaleX,
    backgroundColor: 'rgba(0, 0, 0, 0.11)',
  },
  empty: {
    marginTop: 32 * scaleX,
    textAlign: 'center',
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: CHAT_COLORS.textPrimary,
  },
  footer: {
    paddingHorizontal: SIDE * scaleX,
    paddingTop: 12 * scaleX,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.11)',
    backgroundColor: '#ffffff',
  },
  primary: {
    height: 54 * scaleX,
    backgroundColor: CHAT_COLORS.glyph,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: 17 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
  },
});
