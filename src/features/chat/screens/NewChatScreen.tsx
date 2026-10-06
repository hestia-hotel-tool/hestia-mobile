/**
 * New Chat — pick a colleague to start (or reopen) a direct chat.
 *
 * No Figma frame yet. Uses the native stack header (platform back chevron, no
 * "Back" label, native search field) tinted to the app's header band, and a
 * contacts-style list: everyone visible at once, grouped under sticky
 * department headers, each row showing photo, name and job title.
 *
 * It replaces a list that loaded only the first 50 users and hid all of them
 * inside collapsed department accordions, so finding someone took a guess at
 * their department and an extra tap.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useNavigation, useRouter, type NativeStackNavigationProp } from 'expo-router';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/contexts/ToastContext';
import { PERMISSIONS, usePermissions } from '@/domain/rbac';
import { typography } from '@/theme';
import type { User } from '@/types';
import type { RootStackParamList } from '@/types/navigation';
import { getOrCreateDirectChat } from '../services/chat';
import { groupByDepartment, loadAllColleagues, matchesColleague } from '../utils/colleagues';
import { CHAT_COLORS, scaleX } from '../constants/chatStyles';

export default function NewChatScreen() {
  const router = useRouter();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'new-chat/index'>>();
  const toast = useToast();
  const { can } = usePermissions();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [startingWith, setStartingWith] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setUsers(await loadAllColleagues());
      setFailed(false);
    } catch (e) {
      console.warn('[NewChat] load staff', e);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sections = useMemo(() => {
    return groupByDepartment(users.filter((u) => matchesColleague(u, query)));
  }, [users, query]);

  const startChat = async (user: User) => {
    if (!user.id || startingWith) return;
    setStartingWith(user.id);
    try {
      const chatId = await getOrCreateDirectChat(user.id);
      if (!chatId) {
        toast.show('Please try again. If it keeps failing, check your connection.', {
          type: 'error',
          title: 'Could not start chat',
        });
        return;
      }
      // ChatDetail reads `chat` as an object from route params, so this goes
      // through navigation rather than a URL, which would stringify it.
      navigation.replace('chat/[chatId]', {
        chatId,
        chat: {
          id: chatId,
          name: user.name,
          lastMessage: '',
          avatar: user.avatar ? { uri: user.avatar } : undefined,
          isGroup: false,
        },
      });
    } catch (e) {
      console.warn('[NewChat] start chat', e);
      toast.show('Something went wrong. Please try again.', { type: 'error', title: 'Could not start chat' });
    } finally {
      setStartingWith(null);
    }
  };

  const header = (
    <Stack.Screen
      options={{
        headerShown: true,
        title: 'New Chat',
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
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const showGroupShortcut = !query && can(PERMISSIONS.CHAT_GROUPS_MANAGE);

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
        ListHeaderComponent={
          showGroupShortcut ? (
            <Pressable
              style={({ pressed }) => [styles.shortcut, pressed ? styles.pressed : null]}
              onPress={() => router.replace('/create-chat-group' as never)}
              accessibilityRole="button"
            >
              <View style={styles.shortcutIcon}>
                <Icon name="action-group" size={20 * scaleX} color="#ffffff" />
              </View>
              <Text style={styles.shortcutText}>New group</Text>
              <View style={styles.chevron}>
                <Icon name="action-chevron" size={14 * scaleX} color="#b7c2d3" />
              </View>
            </Pressable>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>{section.data.length}</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const starting = startingWith === item.id;
          const subtitle = item.jobTitle || item.role;
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
              onPress={() => startChat(item)}
              disabled={Boolean(startingWith)}
              accessibilityRole="button"
              accessibilityLabel={`Chat with ${item.name}${subtitle ? `, ${subtitle}` : ''}`}
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
              {starting ? (
                <ActivityIndicator size="small" color={CHAT_COLORS.glyph} />
              ) : (
                <View style={styles.chevron}>
                  <Icon name="action-chevron" size={14 * scaleX} color="#b7c2d3" />
                </View>
              )}
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
    paddingBottom: 32 * scaleX,
  },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIDE * scaleX,
    paddingVertical: 14 * scaleX,
  },
  shortcutIcon: {
    width: AVATAR * scaleX,
    height: AVATAR * scaleX,
    borderRadius: (AVATAR / 2) * scaleX,
    backgroundColor: CHAT_COLORS.glyph,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutText: {
    flex: 1,
    marginLeft: 14 * scaleX,
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '600',
    color: CHAT_COLORS.glyph,
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
    fontSize: 12 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: CHAT_COLORS.glyph,
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
  chevron: {
    // `action-chevron` points left; turned to point into the row's destination.
    transform: [{ rotate: '180deg' }],
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: (SIDE + AVATAR + 14) * scaleX,
    backgroundColor: 'rgba(0, 0, 0, 0.11)',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 64 * scaleX,
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
  retryText: {
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: '#ffffff',
  },
});
