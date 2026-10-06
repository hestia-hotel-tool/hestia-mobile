/**
 * Create Chat Group — name the group, pick members, create.
 *
 * No Figma frame yet; it matches New Chat: native stack header (platform back
 * chevron, no "Back" label, native search), everyone listed under sticky
 * department headers. On top of that:
 *
 * - the group name sits in a card at the head of the list, with a character
 *   count and an inline error if Create is pressed without one;
 * - picked members show as removable chips, so the choice is visible without
 *   scrolling back through every department;
 * - each department header can select or clear its whole team;
 * - one full-width Create button at the bottom says how many will be added.
 *
 * It replaces a list capped at the first 50 users, hidden inside collapsed
 * department accordions, with a small "Create" link in the header.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useNavigation, type NativeStackNavigationProp } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/contexts/ToastContext';
import { typography } from '@/theme';
import type { User } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import { createGroupChat } from '../services/chat';
import { groupByDepartment, loadAllColleagues, matchesColleague } from '../utils/colleagues';
import { CHAT_COLORS, scaleX } from '../constants/chatStyles';

type Nav = NativeStackNavigationProp<RootStackParamList, 'create-chat-group/index'>;

const NAME_MAX = 64;

export default function CreateChatGroupScreen() {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [showNameError, setShowNameError] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setUsers(await loadAllColleagues());
      setFailed(false);
    } catch (e) {
      console.warn('[CreateGroup] load staff', e);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sections = useMemo(
    () => groupByDepartment(users.filter((u) => matchesColleague(u, query))),
    [users, query]
  );
  const selectedUsers = useMemo(
    () => users.filter((u) => selectedIds.has(u.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [users, selectedIds]
  );

  const toggle = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setMany = (ids: string[], on: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const nameTrimmed = groupName.trim();
  const count = selectedIds.size;
  const canCreate = count > 0 && !creating;

  const handleCreate = async () => {
    if (!nameTrimmed) {
      setShowNameError(true);
      return;
    }
    if (!canCreate) return;
    setCreating(true);
    try {
      const chatId = await createGroupChat([...selectedIds], nameTrimmed);
      if (!chatId) {
        toast.show('Please try again. If it keeps failing, check your connection.', {
          type: 'error',
          title: 'Could not create group',
        });
        return;
      }
      navigation.replace('chat/[chatId]', {
        chatId,
        chat: { id: chatId, name: nameTrimmed, lastMessage: '', isGroup: true },
      });
    } catch (e) {
      console.warn('[CreateGroup] create', e);
      toast.show('Something went wrong. Please try again.', { type: 'error', title: 'Could not create group' });
    } finally {
      setCreating(false);
    }
  };

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: 'New Group',
        // The platform chevron alone — no "Back" / previous-title label.
        headerBackButtonDisplayMode: 'minimal',
        headerTintColor: CHAT_COLORS.glyph,
        headerStyle: { backgroundColor: CHAT_COLORS.headerBackground },
        headerTitleStyle: {
          fontFamily: typography.fontFamily.primary,
          fontWeight: '700',
          fontSize: 20,
          color: CHAT_COLORS.title,
        },
        headerShadowVisible: false,
        headerSearchBarOptions: {
          placeholder: 'Search name, role or department',
          hideWhenScrolling: false,
          autoCapitalize: 'none',
          tintColor: CHAT_COLORS.glyph,
          onChangeText: (e) => setQuery(e.nativeEvent.text),
          onCancelButtonPress: () => setQuery(''),
        },
      }}
    />
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        {header}
        <ActivityIndicator size="large" color={CHAT_COLORS.glyph} />
        <Text style={styles.stateText}>Loading your colleagues…</Text>
      </View>
    );
  }

  if (failed && users.length === 0) {
    return (
      <View style={styles.centered}>
        {header}
        <Text style={styles.stateTitle}>Couldn’t load staff</Text>
        <Text style={styles.stateText}>Check your connection and try again.</Text>
        <Pressable
          style={styles.retry}
          onPress={() => {
            setLoading(true);
            void load();
          }}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const nameInvalid = showNameError && !nameTrimmed;

  const listHeader = (
    <View>
      <View style={styles.nameCard}>
        <View style={styles.groupIcon}>
          <Icon name="action-group" size={22 * scaleX} color="#ffffff" />
        </View>
        <View style={styles.nameField}>
          <TextInput
            value={groupName}
            onChangeText={(t) => {
              setGroupName(t);
              if (showNameError) setShowNameError(false);
            }}
            placeholder="Group name"
            placeholderTextColor="rgba(0,0,0,0.36)"
            maxLength={NAME_MAX}
            returnKeyType="done"
            style={[styles.nameInput, nameInvalid ? styles.nameInputError : null]}
            accessibilityLabel="Group name"
          />
          <Text style={[styles.nameHint, nameInvalid ? styles.nameHintError : null]}>
            {nameInvalid ? 'Give the group a name' : `${groupName.length}/${NAME_MAX}`}
          </Text>
        </View>
      </View>

      <View style={styles.membersHeader}>
        <Text style={styles.membersTitle}>Members</Text>
        <Text style={styles.membersCount}>{count === 0 ? 'None selected' : `${count} selected`}</Text>
      </View>

      {selectedUsers.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          {selectedUsers.map((u) => (
            <Pressable
              key={u.id}
              style={styles.chip}
              onPress={() => toggle(u.id)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${u.name}`}
            >
              <Avatar uri={u.avatar} name={u.name} size={24 * scaleX} />
              <Text style={styles.chipText} numberOfLines={1}>
                {u.name.split(/\s+/)[0]}
              </Text>
              <View style={styles.chipRemove}>
                <Icon name="action-plus" size={9 * scaleX} color={CHAT_COLORS.glyph} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      {header}
      <SectionList
        sections={sections}
        keyExtractor={(u) => u.id}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
        extraData={selectedIds}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={CHAT_COLORS.glyph}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={listHeader}
        renderSectionHeader={({ section }) => {
          const ids = section.data.map((u) => u.id);
          const allOn = ids.every((id) => selectedIds.has(id));
          return (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {section.title} <Text style={styles.sectionCount}>· {section.data.length}</Text>
              </Text>
              <Pressable
                onPress={() => setMany(ids, !allOn)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`${allOn ? 'Clear' : 'Select all in'} ${section.title}`}
              >
                <Text style={styles.sectionAction}>{allOn ? 'Clear' : 'Select all'}</Text>
              </Pressable>
            </View>
          );
        }}
        renderItem={({ item }) => {
          const selected = selectedIds.has(item.id);
          const subtitle = item.jobTitle || item.role;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
              onPress={() => toggle(item.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${item.name}${subtitle ? `, ${subtitle}` : ''}`}
            >
              <Avatar uri={item.avatar} name={item.name} size={44 * scaleX} />
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                {subtitle ? (
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <View style={[styles.checkbox, selected ? styles.checkboxOn : null]}>
                {selected ? <Icon name="action-check-bold" size={12 * scaleX} color="#ffffff" /> : null}
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.stateTitle}>{query ? 'No matches' : 'No colleagues yet'}</Text>
            <Text style={styles.stateText}>
              {query ? `Nobody matches “${query.trim()}”.` : 'Staff added to your hotel will appear here.'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 * scaleX }]}>
        <Pressable
          style={[styles.primary, !canCreate ? styles.primaryDisabled : null]}
          onPress={handleCreate}
          disabled={!canCreate}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canCreate, busy: creating }}
        >
          {creating ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryText}>
              {count === 0 ? 'Select members' : `Create group · ${count} ${count === 1 ? 'member' : 'members'}`}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const AVATAR = 44;
const SIDE = 20;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centered: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32 * scaleX,
  },
  listContent: {
    paddingBottom: 24 * scaleX,
  },
  nameCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SIDE * scaleX,
    paddingTop: 18 * scaleX,
    paddingBottom: 6 * scaleX,
  },
  groupIcon: {
    width: 52 * scaleX,
    height: 52 * scaleX,
    borderRadius: 26 * scaleX,
    backgroundColor: CHAT_COLORS.glyph,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameField: {
    flex: 1,
    marginLeft: 14 * scaleX,
  },
  nameInput: {
    height: 52 * scaleX,
    borderWidth: 1,
    borderColor: '#afa9ad',
    borderRadius: 8 * scaleX,
    paddingHorizontal: 15 * scaleX,
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#000000',
  },
  nameInputError: {
    borderColor: '#ff0000',
  },
  nameHint: {
    marginTop: 4 * scaleX,
    alignSelf: 'flex-end',
    fontSize: 11 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#6b7a90',
  },
  nameHintError: {
    alignSelf: 'flex-start',
    color: '#ff0000',
    fontWeight: '400',
  },
  membersHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: SIDE * scaleX,
    paddingTop: 12 * scaleX,
    paddingBottom: 10 * scaleX,
  },
  membersTitle: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.textPrimary,
  },
  membersCount: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: CHAT_COLORS.glyph,
  },
  chips: {
    paddingHorizontal: SIDE * scaleX,
    paddingBottom: 14 * scaleX,
    gap: 8 * scaleX,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 34 * scaleX,
    paddingLeft: 5 * scaleX,
    paddingRight: 8 * scaleX,
    borderRadius: 17 * scaleX,
    backgroundColor: CHAT_COLORS.headerBackground,
  },
  chipText: {
    maxWidth: 110 * scaleX,
    marginLeft: 6 * scaleX,
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '600',
    color: CHAT_COLORS.textPrimary,
  },
  chipRemove: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIDE * scaleX,
    paddingVertical: 8 * scaleX,
    backgroundColor: '#f4f7fc',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(90, 117, 157, 0.15)',
  },
  sectionTitle: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: CHAT_COLORS.glyph,
  },
  sectionCount: {
    fontWeight: '400',
  },
  sectionAction: {
    fontSize: 13 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '600',
    color: CHAT_COLORS.badge,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIDE * scaleX,
    paddingVertical: 12 * scaleX,
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
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '600',
    color: CHAT_COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 2 * scaleX,
    fontSize: 13 * scaleX,
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
  },
  checkboxOn: {
    backgroundColor: CHAT_COLORS.glyph,
    borderColor: CHAT_COLORS.glyph,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: (SIDE + AVATAR + 14) * scaleX,
    backgroundColor: 'rgba(0, 0, 0, 0.11)',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 48 * scaleX,
    paddingHorizontal: 32 * scaleX,
  },
  stateTitle: {
    fontSize: 17 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.textPrimary,
    textAlign: 'center',
  },
  stateText: {
    marginTop: 8 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#6b7a90',
    textAlign: 'center',
  },
  retry: {
    marginTop: 20 * scaleX,
    paddingHorizontal: 28 * scaleX,
    height: 46 * scaleX,
    justifyContent: 'center',
    backgroundColor: CHAT_COLORS.glyph,
  },
  footer: {
    paddingHorizontal: SIDE * scaleX,
    paddingTop: 12 * scaleX,
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.11)',
  },
  primary: {
    height: 56 * scaleX,
    backgroundColor: CHAT_COLORS.glyph,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: {
    opacity: 0.45,
  },
  primaryText: {
    fontSize: 17 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
  },
});
