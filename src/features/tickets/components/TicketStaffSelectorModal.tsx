import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { SafeModal as Modal } from '@/components/ui/SafeModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, colors } from '@/theme';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/Avatar';
import type { User } from '@/types';

interface TicketStaffSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (staffIds: string[]) => void;
  staff: User[];
  /** Already tagged staff IDs. */
  selectedStaffIds?: string[];
  departmentName: string;
  loading?: boolean;
}

/**
 * Pick the staff to tag on a ticket.
 *
 * The list is whoever belongs to the chosen department, so it is routinely
 * empty — several departments in the table have no users at all. That case gets
 * a real empty state rather than a line of grey text, and it is kept distinct
 * from "your search matched nothing", because the two need different exits: one
 * is a dead end you leave, the other is a filter you clear.
 *
 * The footer is **outside** the list/empty branch on purpose. It used to live
 * inside it, so any empty result — including a mistyped search — took the Done
 * button off screen and left discarding as the only way out, with selections
 * already made.
 */
export default function TicketStaffSelectorModal({
  visible,
  onClose,
  onSelect,
  staff,
  selectedStaffIds = [],
  departmentName,
  loading = false,
}: TicketStaffSelectorModalProps) {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedStaffIds);

  useEffect(() => {
    if (visible) {
      setLocalSelectedIds(selectedStaffIds);
      setSearchQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const query = searchQuery.trim().toLowerCase();

  const filteredStaff = useMemo(() => {
    const list = Array.isArray(staff) ? staff : [];
    if (!query) return list;
    // Name or job title: "who is the supervisor" is as likely a question as a name.
    return list.filter(
      (u) =>
        u.name?.toLowerCase().includes(query) ||
        u.jobTitle?.toLowerCase().includes(query) ||
        u.role?.toLowerCase().includes(query)
    );
  }, [staff, query]);

  const hasStaff = (staff?.length ?? 0) > 0;
  const selectedCount = localSelectedIds.length;

  const handleToggleStaff = (userId: string) => {
    setLocalSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleDone = () => {
    onSelect(localSelectedIds);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Tap-outside-to-close, without swallowing taps inside the sheet. */}
        <Pressable style={styles.backdropFill} onPress={onClose} accessibilityLabel="Close" />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.grabber} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Tag staff</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {departmentName}
              </Text>
            </View>
            {/*
              Text, not a glyph: the registry has no close mark and 589-514 does
              not draw this modal, so exporting one would mean inventing it.
              Same call the photo picker's remove affordance already makes.
            */}
            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={12}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {hasStaff && !loading ? (
            <View style={styles.searchWrap}>
              <Icon name="action-search" size={16} color={colors.text.secondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or job title"
                placeholderTextColor={colors.text.secondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                returnKeyType="search"
              />
              {query ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={10}>
                  <Text style={styles.clearSearch}>✕</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {selectedCount > 0 ? (
            <View style={styles.selectionBar}>
              <Text style={styles.selectionCount}>
                {selectedCount} {selectedCount === 1 ? 'person' : 'people'} tagged
              </Text>
              <TouchableOpacity onPress={() => setLocalSelectedIds([])} hitSlop={8}>
                <Text style={styles.clearAll}>Clear</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.body}>
            {loading ? (
              <View style={styles.centreState}>
                <ActivityIndicator size="large" color={colors.text.accent} />
              </View>
            ) : !hasStaff ? (
              /* The department genuinely has nobody. A dead end — say so plainly. */
              <View style={styles.centreState}>
                <View style={styles.emptyIconCircle}>
                  <Icon name="nav-staff" size={30} color={colors.text.accent} />
                </View>
                <Text style={styles.emptyTitle}>No staff in {departmentName}</Text>
                <Text style={styles.emptyBody}>
                  Nobody is assigned to this department yet, so there is no one to tag. You
                  can still create the ticket — it will go to the department itself.
                </Text>
              </View>
            ) : filteredStaff.length === 0 ? (
              /* A filter, not a dead end — offer the way back. */
              <View style={styles.centreState}>
                <Text style={styles.emptyTitle}>No matches</Text>
                <Text style={styles.emptyBody}>
                  Nobody in {departmentName} matches “{searchQuery.trim()}”.
                </Text>
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery('')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clearSearchButtonText}>Clear search</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {filteredStaff.map((user) => {
                  const isSelected = localSelectedIds.includes(user.id);
                  return (
                    <TouchableOpacity
                      key={user.id}
                      style={[styles.row, isSelected && styles.rowSelected]}
                      onPress={() => handleToggleStaff(user.id)}
                      activeOpacity={0.7}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={user.name}
                    >
                      <Avatar uri={user.avatar} name={user.name} size={40} />
                      <View style={styles.rowText}>
                        <Text style={styles.name} numberOfLines={1}>
                          {user.name}
                        </Text>
                        {/*
                          Job title, e.g. "Room Attendant". Never the department:
                          the reader just chose it, so repeating it under every
                          name says nothing about who to pick.
                        */}
                        {(user.jobTitle ?? user.role) ? (
                          <Text style={styles.role} numberOfLines={1}>
                            {user.jobTitle ?? user.role}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.checkBox, isSelected && styles.checkBoxOn]}>
                        {isSelected ? (
                          <Icon name="action-check" size={11} color={colors.text.white} />
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/*
            Always rendered. See the note on the component: burying this inside
            the non-empty branch is what made a mistyped search discard work.
          */}
          <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.8}>
            <Text style={styles.doneButtonText}>
              {selectedCount > 0 ? `Tag ${selectedCount}` : 'Done'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.background.overlay,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    flex: 1,
  },
  sheet: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.medium,
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: colors.text.accent,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: colors.text.secondary,
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  closeText: {
    fontSize: 20,
    color: colors.text.secondary,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border.control,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.fontFamily.secondary,
    color: colors.text.primary,
    padding: 0,
  },
  clearSearch: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  selectionCount: {
    fontSize: 13,
    fontFamily: typography.fontFamily.secondary,
    color: colors.text.secondary,
  },
  clearAll: {
    fontSize: 13,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '600',
    color: colors.status.dirty,
  },
  body: {
    minHeight: 180,
    maxHeight: 360,
    justifyContent: 'center',
  },
  centreState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 12,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: colors.text.accent,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 6,
  },
  clearSearchButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.control,
  },
  clearSearchButtonText: {
    fontSize: 14,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '600',
    color: colors.text.accent,
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  rowSelected: {
    backgroundColor: colors.background.secondary,
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '600',
    color: colors.text.primary,
  },
  role: {
    fontSize: 12,
    fontFamily: typography.fontFamily.secondary,
    fontWeight: '300',
    color: colors.text.secondary,
    marginTop: 1,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: {
    backgroundColor: colors.text.accent,
    borderColor: colors.text.accent,
  },
  doneButton: {
    backgroundColor: colors.text.accent,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  doneButtonText: {
    fontSize: 16,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: colors.text.white,
  },
});
