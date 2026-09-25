import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { typography } from '@/theme';
import type { StaffMember } from '@features/staff/types/staff.types';
import { CHAT_COLORS, scaleX } from '../constants/chatStyles';

type Props = {
  visible: boolean;
  staff: StaffMember[];
  loading: boolean;
  /** Ids already excluded when the sheet opens. */
  selectedIds: string[];
  onDone: (ids: string[]) => void;
  onClose: () => void;
};

/**
 * Pick the staff a General Announcement should skip.
 *
 * Figma 4241:405 shows only the closed field ("None"); there is no frame for
 * the picker. This follows the Lost & Found "see all" staff list — tinted band,
 * back chevron, search, one row per person — with a tick per row, since here
 * any number can be chosen, and a Done bar to confirm.
 */
export function ExcludeStaffModal({ visible, staff, loading, selectedIds, onDone, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(() => new Set(selectedIds));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (m) => m.name.toLowerCase().includes(q) || (m.department ?? '').toLowerCase().includes(q)
    );
  }, [staff, query]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      // Start from what the form holds each time it opens, not what was last ticked and abandoned.
      onShow={() => {
        setPicked(new Set(selectedIds));
        setQuery('');
      }}
    >
      <View style={styles.screen}>
        <View style={[styles.band, { paddingTop: insets.top + 8 * scaleX }]}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name="action-chevron" size={28 * scaleX} color={CHAT_COLORS.glyph} />
          </Pressable>
          <Text style={styles.title}>Exclude Staff</Text>
        </View>

        <View style={styles.search}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search staff"
            placeholderTextColor="rgba(0,0,0,0.36)"
            style={styles.searchInput}
            autoCorrect={false}
            returnKeyType="search"
          />
          <View style={styles.searchIcon} pointerEvents="none">
            <Icon name="action-search" size={19 * scaleX} color="rgba(90, 117, 157, 0.59)" />
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 * scaleX }}
          ListEmptyComponent={
            <Text style={styles.empty}>{loading ? 'Loading staff…' : 'No staff match'}</Text>
          }
          renderItem={({ item }) => {
            const selected = picked.has(item.id);
            return (
              <Pressable
                style={styles.row}
                onPress={() => toggle(item.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={item.name}
              >
                <Avatar uri={typeof item.avatar === 'string' ? item.avatar : undefined} name={item.name} size={40 * scaleX} />
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.department ? (
                    <Text style={styles.department} numberOfLines={1}>
                      {item.department}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.box, selected ? styles.boxOn : null]}>
                  {selected ? <Icon name="action-check-bold" size={12 * scaleX} color="#ffffff" /> : null}
                </View>
              </Pressable>
            );
          }}
        />

        <View style={{ paddingBottom: insets.bottom + 12 * scaleX, paddingHorizontal: 21 * scaleX }}>
          <Pressable
            style={styles.done}
            onPress={() => onDone([...picked])}
            accessibilityRole="button"
          >
            <Text style={styles.doneText}>
              {picked.size === 0 ? 'Exclude nobody' : `Exclude ${picked.size}`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  band: {
    backgroundColor: CHAT_COLORS.headerBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 27 * scaleX,
    paddingBottom: 32 * scaleX,
  },
  title: {
    marginLeft: 28 * scaleX,
    fontSize: 24 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.title,
  },
  search: {
    marginTop: 20 * scaleX,
    marginHorizontal: 21 * scaleX,
    height: 52 * scaleX,
    borderRadius: 82 * scaleX,
    backgroundColor: CHAT_COLORS.searchBackground,
    justifyContent: 'center',
    paddingLeft: 20 * scaleX,
    paddingRight: 52 * scaleX,
    marginBottom: 8 * scaleX,
  },
  searchInput: {
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    color: CHAT_COLORS.textPrimary,
    paddingVertical: 0,
  },
  searchIcon: {
    position: 'absolute',
    right: 24 * scaleX,
    transform: [{ scaleX: -1 }],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 21 * scaleX,
    paddingVertical: 12 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: CHAT_COLORS.divider,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 15 * scaleX,
    marginRight: 12 * scaleX,
  },
  name: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: CHAT_COLORS.textPrimary,
  },
  department: {
    marginTop: 2 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: CHAT_COLORS.textPrimary,
  },
  box: {
    width: 24 * scaleX,
    height: 24 * scaleX,
    borderWidth: 1,
    borderColor: '#afa9ad',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boxOn: {
    backgroundColor: CHAT_COLORS.glyph,
    borderColor: CHAT_COLORS.glyph,
  },
  empty: {
    marginTop: 32 * scaleX,
    textAlign: 'center',
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: CHAT_COLORS.textPrimary,
  },
  done: {
    height: 58 * scaleX,
    backgroundColor: CHAT_COLORS.glyph,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneText: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
  },
});
