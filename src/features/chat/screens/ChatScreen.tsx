import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Platform } from 'react-native';
import { SafeKeyboardAvoidingView as KeyboardAvoidingView } from '@/components/ui/SafeKeyboardAvoidingView';
import { useNavigation, useFocusEffect , NativeStackNavigationProp } from 'expo-router';
import { BottomTabNavigationProp } from 'expo-router/js-tabs';
import { CompositeNavigationProp } from 'expo-router/react-navigation';
import { PERMISSIONS, usePermissions } from '@/domain/rbac';
import { typography } from '@/theme';
import BottomTabBar from '@/components/layout/BottomTabBar';
import { LoadingOverlay } from '@/components/feedback/LoadingOverlay';
import ChatHeader from '../components/ChatHeader';
import ChatItem, { ChatItemData } from '../components/ChatItem';
import NotificationItem, { NotificationItemData } from '../components/NotificationItem';
import NewChatMenu, { NewChatMenuOption } from '../components/NewChatMenu';
import { NewChatFab } from '../components/NewChatFab';
import { ChatFilterMenu, type ChatListFilter } from '../components/ChatFilterMenu';
import { useChatStore } from '../store/useChatStore';
import {
  TASK_NOTIFICATION_TYPES,
  invalidateNotificationBadges,
  subscribeNotificationBadgeInvalidate,
} from '@/lib/inAppNotifications';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@features/auth/hooks/useAuth';
import { CHAT_COLORS, CHAT_LIST as L, scaleX } from '../constants/chatStyles';
import type { RealtimeChannel } from '@supabase/supabase-js';

import type { RootStackParamList } from '@/types/navigation';

type MainTabsParamList = {
  '(home)/index': undefined;
  '(rooms)/index': undefined;
  '(chats)/index': undefined;
  '(tickets)/index': undefined;
  '(lost_and_found)/index': undefined;
  '(staff)/index': undefined;
  '(settings)/index': undefined;
};

type ChatScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, '(chats)/index'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function ChatScreen() {
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const { session } = useAuth();
  const { can } = usePermissions();
  const [showNewChatMenu, setShowNewChatMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [filter, setFilter] = useState<ChatListFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { chats, loading, fetchChats, applyIncomingMessageToChatList } = useChatStore();
  const [refreshing, setRefreshing] = useState(false);
  /*
   * Both notification rows come from `notifications` — nothing made up.
   *
   * These used to be a hard-coded "General" row and random unread counts
   * re-rolled on every focus. A row with no notice of its type is hidden.
   * Nothing writes `general` notices yet, so that row stays hidden until
   * something does.
   */
  const [generalNotification, setGeneralNotification] = useState<NotificationItemData | null>(null);
  const [tasksNotification, setTasksNotification] = useState<NotificationItemData | null>(null);

  const loadChats = useCallback(async () => {
    await fetchChats();
  }, [fetchChats]);

  const loadNotifications = useCallback(async () => {
    const userId = session?.user?.id;
    if (!isSupabaseConfigured || !userId) {
      setGeneralNotification(null);
      setTasksNotification(null);
      return;
    }

    const latestOfType = async (
      types: readonly string[],
      row: Pick<NotificationItemData, 'label' | 'pillBackgroundColor'> & { showTime: boolean; useBody: boolean }
    ): Promise<NotificationItemData | null> => {
      const [countRes, latestRes] = await Promise.all([
        supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('type', [...types])
          .is('read_at', null),
        supabase
          .from('notifications')
          .select('id,title,body,created_at')
          .eq('user_id', userId)
          .in('type', [...types])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      const latest = latestRes.data as {
        id?: string;
        title?: string | null;
        body?: string | null;
        created_at?: string | null;
      } | null;
      if (!latest?.id || !latest.title) return null;

      const createdAt = latest.created_at ? new Date(latest.created_at) : null;
      const timeText =
        createdAt && !Number.isNaN(createdAt.getTime())
          ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
          : undefined;

      // Figma 3272:62: General shows the subject; Tasks the message itself ("You have been assigned to Room 201").
      const text = row.useBody && latest.body ? latest.body : latest.title;
      return { id: latest.id, title: text, timeText: row.showTime ? timeText : undefined, unreadCount: countRes.count ?? 0, label: row.label, pillBackgroundColor: row.pillBackgroundColor };
    };

    const [general, tasks] = await Promise.all([
      // Figma 3272:62: the General row has no time under it; Tasks does.
      latestOfType(['general'], { label: 'General', pillBackgroundColor: L.notification.general, showTime: false, useBody: false }),
      // Every task type: assignments, flagged / priority rooms, cleaned rooms, tickets.
      latestOfType(TASK_NOTIFICATION_TYPES, { label: 'Tasks', pillBackgroundColor: L.notification.tasks, showTime: true, useBody: true }),
    ]);
    setGeneralNotification(general);
    setTasksNotification(tasks);
  }, [session?.user?.id]);

  // Realtime: keep chat list last-message updated instantly.
  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user?.id) return;
    if (!chats || chats.length === 0) return;

    const ids = chats.map((c) => c.id).filter(Boolean);
    if (ids.length === 0) return;

    // Supabase realtime filter supports `in` syntax: chat_id=in.(id1,id2,...)
    // Chunk to keep filter strings reasonable.
    const chunks: string[][] = [];
    const chunkSize = 40;
    for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize));

    const channels: RealtimeChannel[] = chunks.map((chunk, i) =>
      supabase
        .channel(`chat-list-messages:${session.user.id}:${i}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_id=in.(${chunk.join(',')})`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              chat_id: string;
              sender_id: string;
              type: string;
              content: string | null;
              created_at: string | null;
            };
            // We only need minimal fields to update the list item.
            // Sender name resolution is already handled in `ChatDetailScreen` via store messages;
            // for list preview, "You:" vs "Someone:" isn't critical, so keep it lightweight.
            applyIncomingMessageToChatList(row.chat_id, {
              id: row.id,
              chatId: row.chat_id,
              senderId: row.sender_id,
              senderName: row.sender_id === session.user.id ? 'You' : 'Someone',
              message: row.content ?? '',
              timestamp: row.created_at ?? new Date().toISOString(),
              type: (row.type === 'image' ? 'image' : row.type === 'file' ? 'file' : 'text') as any,
            } as any);
          }
        )
        .subscribe()
    );

    return () => {
      for (const ch of channels) {
        void supabase.removeChannel(ch);
      }
    };
  }, [session?.user?.id, chats, applyIncomingMessageToChatList]);

  /*
   * A new announcement (or anything else marked read or arriving) invalidates
   * the badges; refresh the Notifications rows with them, so a General
   * Announcement shows up here without leaving the screen.
   */
  useEffect(() => subscribeNotificationBadgeInvalidate(() => void loadNotifications()), [loadNotifications]);

  // Runs on first mount too, so this is the only initial load.
  useFocusEffect(
    useCallback(() => {
      void loadChats();
      // Also reloads the Notifications rows, through the subscription above.
      invalidateNotificationBadges();
    }, [loadChats])
  );


  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleChatPress = (chat: ChatItemData) => {
    navigation.navigate('chat/[chatId]', { chatId: chat.id, chat });
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleMessagePress = () => {
    setShowNewChatMenu(true);
  };

  const handleNewChatMenuClose = () => {
    setShowNewChatMenu(false);
  };

  const handleNewChatOptionPress = (option: NewChatMenuOption) => {
    setShowNewChatMenu(false);
    switch (option) {
      case 'createGroup':
        (navigation as any).navigate('create-chat-group/index');
        break;
      case 'newChat':
        (navigation as any).navigate('new-chat/index');
        break;
      case 'announcement':
        (navigation as any).navigate('general-announcement/index');
        break;
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadChats(), loadNotifications()]);
    setRefreshing(false);
  }, [loadChats, loadNotifications]);

  const isLoading = loading && chats.length === 0;

  const query = searchQuery.trim().toLowerCase();
  const filteredChats = chats.filter((chat) => {
    if (filter === 'unread' && !((chat.unreadCount ?? 0) > 0)) return false;
    if (filter === 'groups' && !chat.isGroup) return false;
    if (filter === 'direct' && chat.isGroup) return false;
    if (!query) return true;
    return (
      (typeof chat.name === 'string' && chat.name.toLowerCase().includes(query)) ||
      (typeof chat.lastMessage === 'string' && chat.lastMessage.toLowerCase().includes(query))
    );
  });
  const hasNotifications = Boolean(generalNotification || tasksNotification);

  return (
    <View style={styles.container}>
      {refreshing || isLoading ? <LoadingOverlay fullScreen message={refreshing ? 'Refreshing…' : 'Loading chats…'} /> : null}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.scrollContainer}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!showNewChatMenu}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            keyboardShouldPersistTaps="handled"
          >
            {hasNotifications ? (
              <>
                <Text style={[styles.sectionTitle, styles.notificationsTitle]}>Notifications</Text>
                {generalNotification ? (
                  <NotificationItem
                    item={generalNotification}
                    onPress={() => (navigation as any).navigate('(chats)/announcements')}
                  />
                ) : null}
                {tasksNotification ? (
                  <NotificationItem
                    item={tasksNotification}
                    // Each task is read by opening its room, from this list.
                    onPress={() => (navigation as any).navigate('(chats)/tasks')}
                  />
                ) : null}
              </>
            ) : null}

            <Text style={[styles.sectionTitle, hasNotifications ? styles.chatsTitle : styles.notificationsTitle]}>
              Chats
            </Text>
            {filteredChats.map((chat) => (
              <ChatItem key={chat.id} chat={chat} onPress={() => handleChatPress(chat)} />
            ))}
            {!isLoading && filteredChats.length === 0 ? (
              <Text style={styles.emptyText}>
                {chats.length === 0 ? 'No chats yet' : 'No chats match'}
              </Text>
            ) : null}
          </ScrollView>

        </View>
      </KeyboardAvoidingView>

      {/* Header - Fixed at top */}
      <ChatHeader
        onBackPress={handleBackPress}
        onSearch={handleSearch}
        onFilterPress={() => setShowFilterMenu(true)}
        filterActive={filter !== 'all'}
      />

      {/* New chat — Figma 3272:98, floating above the tab bar. */}
      <NewChatFab onPress={handleMessagePress} accessibilityLabel="New chat" />

      {/* Bottom Navigation - Outside KeyboardAvoidingView to prevent movement */}
      <BottomTabBar />

      <ChatFilterMenu
        visible={showFilterMenu}
        value={filter}
        onChange={setFilter}
        onClose={() => setShowFilterMenu(false)}
      />

      {/* New Chat Menu */}
      <NewChatMenu
        visible={showNewChatMenu}
        onClose={handleNewChatMenuClose}
        onOptionPress={handleNewChatOptionPress}
        canAnnounce={can(PERMISSIONS.CHAT_ANNOUNCE)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CHAT_COLORS.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    // The header (band, search row and its rule) ends at y242.
    paddingTop: (L.search.dividerTop + 1) * scaleX,
    // Tab bar (152) plus room to scroll the last row clear of the + button.
    paddingBottom: (L.fab.bottom + L.fab.size) * scaleX,
    minHeight: '100%',
  },
  sectionTitle: {
    paddingLeft: 28 * scaleX,
    fontSize: L.section.fontSize * scaleX,
    lineHeight: L.section.lineHeight * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.textPrimary,
  },
  notificationsTitle: {
    marginTop: L.section.notificationsTop * scaleX,
    // The first row's own top padding carries the gap down to the pill.
    marginBottom: -6 * scaleX,
  },
  chatsTitle: {
    marginTop: L.section.chatsTop * scaleX,
    marginBottom: -5 * scaleX,
  },
  emptyText: {
    marginTop: 24 * scaleX,
    paddingHorizontal: 28 * scaleX,
    fontSize: 14 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: CHAT_COLORS.textPrimary,
  },
});

