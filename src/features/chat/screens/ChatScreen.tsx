import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { typography } from '@shared/theme';
import BottomTabBar from '@app/components/BottomTabBar';
import { LoadingOverlay } from '@shared/ui/LoadingOverlay';
import ChatHeader from '../components/ChatHeader';
import ChatItem, { ChatItemData } from '../components/ChatItem';
import NotificationItem, { NotificationItemData } from '../components/NotificationItem';
import NewChatMenu, { NewChatMenuOption } from '../components/NewChatMenu';
import { useAIChatOverlay } from '@/contexts/AIChatOverlayContext';
import { useChatStore } from '../store/useChatStore';
import { invalidateNotificationBadges } from '@/services/inAppNotifications';
import { supabase, isSupabaseConfigured } from '@shared/lib/supabase';
import { useAuth } from '@features/auth';
import { CHAT_SPACING, CHAT_COLORS, CHAT_ITEM, scaleX } from '../constants/chatStyles';
import type { RealtimeChannel } from '@supabase/supabase-js';

type MainTabsParamList = {
  Home: undefined;
  Rooms: undefined;
  Chat: undefined;
  Tickets: undefined;
  LostAndFound: undefined;
  Staff: undefined;
  Settings: undefined;
};

import type { RootStackParamList } from '@app/navigation/types';

type ChatScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList, 'Chat'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function ChatScreen() {
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const route = useRoute();
  const { open: openAIChatOverlay } = useAIChatOverlay();
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState('Chat');
  const [showNewChatMenu, setShowNewChatMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { chats, loading, fetchChats, applyIncomingMessageToChatList } = useChatStore();
  const [refreshing, setRefreshing] = useState(false);
  const [topNotification, setTopNotification] = useState<NotificationItemData | null>(null);
  const [dummyGeneralUnreadCount, setDummyGeneralUnreadCount] = useState(() => Math.floor(Math.random() * 10) + 1);
  const [dummyTasksUnreadCount, setDummyTasksUnreadCount] = useState(() => Math.floor(Math.random() * 10) + 1);

  const rerollDummyNotificationCounts = useCallback(() => {
    setDummyGeneralUnreadCount(Math.floor(Math.random() * 10) + 1);
    setDummyTasksUnreadCount(Math.floor(Math.random() * 10) + 1);
  }, []);

  const dummyGeneralNotification: NotificationItemData = {
    id: 'dummy-general',
    label: 'General',
    title: 'All hotel staff are invited for the...',
    timeText: '20:00',
    unreadCount: dummyGeneralUnreadCount,
    pillBackgroundColor: '#ff46a3',
    pillTextColor: '#ffffff',
  };

  const loadChats = useCallback(async () => {
    await fetchChats();
  }, [fetchChats]);

  const loadTopNotification = useCallback(async () => {
    if (!isSupabaseConfigured || !session?.user?.id) {
      setTopNotification(null);
      return;
    }
    const [countRes, latestRes] = await Promise.all([
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null)
        .eq('type', 'room_assignment'),
      supabase
        .from('notifications')
        .select('id,title,created_at')
        .eq('type', 'room_assignment')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const unreadCount = countRes.count ?? 0;
    const latest = latestRes.data as { id?: string; title?: string | null; created_at?: string | null } | null;
    if (!latest?.id || !latest?.title) {
      setTopNotification(null);
      return;
    }

    const createdAt = latest.created_at ? new Date(latest.created_at) : null;
    const timeText =
      createdAt && !Number.isNaN(createdAt.getTime())
        ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
        : undefined;

    setTopNotification({
      id: latest.id,
      label: 'Tasks',
      title: latest.title,
      timeText,
      unreadCount,
    });
  }, [session?.user?.id]);

  useEffect(() => {
    loadChats();
    void loadTopNotification();
    rerollDummyNotificationCounts();
  }, [loadChats, loadTopNotification]);

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

  useFocusEffect(
    useCallback(() => {
      void loadChats();
      void loadTopNotification();
      invalidateNotificationBadges();
      rerollDummyNotificationCounts();
    }, [loadChats, loadTopNotification])
  );

  const handleTabPress = (tab: string, options?: { fromRoomsAssignmentBadge?: boolean }) => {
    if (tab === 'AIHome') {
      openAIChatOverlay();
      return;
    }
    setActiveTab(tab); // Update immediately
    const returnToTab = (route.name as string) as 'Home' | 'Rooms' | 'Chat' | 'Tickets' | 'LostAndFound' | 'Staff' | 'Settings';
    if (tab === 'Home') {
      navigation.navigate('Home' as any);
    } else if (tab === 'Rooms') {
      navigation.navigate('Rooms' as any, {
        prioritizeMyAssignedRooms: !!options?.fromRoomsAssignmentBadge,
      });
    } else if (tab === 'Chat') {
      navigation.navigate('Chat' as any);
    } else if (tab === 'Tickets') {
      navigation.navigate('Tickets' as any);
    } else if (tab === 'LostAndFound') {
      (navigation as any).navigate('LostAndFound', { returnToTab });
    } else if (tab === 'Staff') {
      (navigation as any).navigate('Staff', { returnToTab });
    } else if (tab === 'Settings') {
      (navigation as any).navigate('Settings', { returnToTab });
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
  };

  const handleChatPress = (chat: ChatItemData) => {
    navigation.navigate('ChatDetail', { chatId: chat.id, chat });
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
        (navigation as any).navigate('CreateChatGroup');
        break;
      case 'newChat':
        (navigation as any).navigate('NewChat');
        break;
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    rerollDummyNotificationCounts();
    await loadChats();
    await loadTopNotification();
    setRefreshing(false);
  }, [loadChats, loadTopNotification, rerollDummyNotificationCounts]);

  const isLoading = loading && chats.length === 0;

  // Filter chats based on search query
  const filteredChats = searchQuery
    ? chats.filter(
        (chat) =>
          (typeof chat.name === 'string' && chat.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (typeof chat.lastMessage === 'string' && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chats;

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
            <Text style={styles.sectionTitle}>Notifications</Text>
            <NotificationItem item={dummyGeneralNotification} />
            <NotificationItem
              item={
                topNotification ?? {
                  id: 'dummy-tasks',
                  label: 'Tasks',
                  title: 'You have been assigned to Room 201',
                  timeText: '20:00',
                  unreadCount: dummyTasksUnreadCount,
                  pillBackgroundColor: '#4a91fc',
                  pillTextColor: '#ffffff',
                }
              }
              onPress={() => navigation.navigate('Rooms' as any)}
            />

            <Text style={styles.sectionTitle}>Chats</Text>
            {/* Chat Items */}
            {filteredChats.map((chat) => (
              <React.Fragment key={chat.id}>
                <ChatItem
                  chat={chat}
                  onPress={() => handleChatPress(chat)}
                />
              </React.Fragment>
            ))}
          </ScrollView>

          {/* Blur Overlay for content only */}
          {showNewChatMenu && (
            <BlurView intensity={80} style={styles.contentBlurOverlay} tint="light">
              <View style={styles.blurOverlayDarkener} />
            </BlurView>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Header - Fixed at top */}
      <ChatHeader
        onBackPress={handleBackPress}
        onSearch={handleSearch}
        onMessagePress={handleMessagePress}
      />

      {/* Bottom Navigation - Outside KeyboardAvoidingView to prevent movement */}
      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />

      {/* New Chat Menu */}
      <NewChatMenu
        visible={showNewChatMenu}
        onClose={handleNewChatMenuClose}
        onOptionPress={handleNewChatOptionPress}
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
    paddingTop: CHAT_SPACING.contentPaddingTop * scaleX,
    paddingBottom: CHAT_SPACING.contentPaddingBottom * scaleX,
    minHeight: '100%',
  },
  sectionTitle: {
    marginTop: 12 * scaleX,
    marginBottom: 8 * scaleX,
    paddingHorizontal: CHAT_ITEM.avatar.left * scaleX,
    fontSize: 16 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700' as any,
    color: CHAT_COLORS.textPrimary,
    includeFontPadding: false,
  },
  contentBlurOverlay: {
    position: 'absolute',
    top: 217 * scaleX, // Start below header
    left: 0,
    right: 0,
    bottom: 152 * scaleX, // Stop above bottom nav
    zIndex: 1,
  },
  blurOverlayDarkener: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(200, 200, 200, 0.6)',
  },
});

