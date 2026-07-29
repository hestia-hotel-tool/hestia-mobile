import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  Image,
  Modal,
  FlatList,
  useWindowDimensions,
  ActivityIndicator,
  ActionSheetIOS,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from 'expo-router';
import { RouteProp } from 'expo-router/react-navigation';
import { NativeStackNavigationProp } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { RootStackParamList } from '@/types/navigation';
import { ChatMessage } from '@shared/types';
import MessageBubble from '../components/MessageBubble';
import ChatHeader from '../components/ChatHeader';
import { colors } from '@shared/theme';
import { scaleX, CHAT_HEADER, CHAT_HEADER_BAR_HEIGHT } from '../constants/chatStyles';
import {
  getCurrentUserId,
  getChatById,
  getMyRoleInChat,
  getGroupParticipants,
  setParticipantRole,
  subscribeToMessages,
  updateGroupChat,
  deleteGroupChat,
  uploadChatAttachment,
  formatFileContent,
  type GroupParticipant,
} from '../services/chat';
import * as DocumentPicker from 'expo-document-picker';
import { useChatStore } from '../store/useChatStore';
import {
  markChatMessageNotificationsReadForChat,
  invalidateNotificationBadges,
} from '@shared/lib/inAppNotifications';
import { useToast } from '@shared/contexts/ToastContext';
import { useMessageModal } from '@shared/contexts/MessageModalContext';
import { Ionicons } from '@expo/vector-icons';

type ChatDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ChatDetail'>;

/**
 * WhatsApp-style @ compose: active while typing after `@` at a word boundary until a trailing
 * space completes the mention. Skips `@` inside emails (e.g. `user@mail.com`).
 */
function getActiveMention(text: string): { start: number; query: string } | null {
  let at = text.lastIndexOf('@');
  while (at >= 0) {
    const prev = at === 0 ? ' ' : text.charAt(at - 1);
    const atWordBoundary = at === 0 || /\s/.test(prev);
    if (atWordBoundary) {
      const after = text.slice(at + 1);
      if (after.endsWith(' ')) return null;
      return { start: at, query: after };
    }
    at = text.lastIndexOf('@', at - 1);
  }
  return null;
}

export default function ChatDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'ChatDetail'>>();
  const navigation = useNavigation<ChatDetailScreenNavigationProp>();
  const { chatId, chat: chatParam } = route.params;
  const scrollViewRef = useRef<ScrollView>(null);
  const textInputRef = useRef<TextInput>(null);

  const isSupabaseChat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(chatId);
  const [fetchedChat, setFetchedChat] = useState<{ name: string; isGroup: boolean; created_by_id: string } | null>(null);
  const baseChat = chatParam ?? (isSupabaseChat ? { id: chatId, name: 'Chat', lastMessage: '', isGroup: false } : null);
  const isGroup = fetchedChat ? fetchedChat.isGroup : (baseChat?.isGroup ?? false);
  const chat = baseChat
    ? {
        ...baseChat,
        name: (fetchedChat?.name != null && fetchedChat.name !== '' ? fetchedChat.name : baseChat.name) ?? 'Chat',
        isGroup,
      }
    : null;

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<'admin' | 'member' | null>(null);
  const isGroupAdmin = isGroup && myRole === 'admin';
  const isGroupCreator = Boolean(isGroup && currentUserId && fetchedChat?.created_by_id && currentUserId === fetchedChat.created_by_id);

  const { messagesByChatId, loadMessages, appendMessage, sendMessage: sendMessageToStore, removeChat, updateChatName, clearMessages } = useChatStore();
  const messages = messagesByChatId[chatId] ?? [];
  const messageLayoutY = useRef<Record<string, number>>({});

  const messagesTaggingMe = useMemo(() => {
    const uid = currentUserId ?? '';
    if (!uid) return [];
    return messages.filter((m) => m.taggedUserId === uid && m.senderId !== uid);
  }, [messages, currentUserId]);

  const latestMentionOfMe = messagesTaggingMe.length > 0 ? messagesTaggingMe[messagesTaggingMe.length - 1] : null;

  const latestMentionSnippet = useMemo(() => {
    const m = latestMentionOfMe;
    if (!m) return '';
    if (m.type === 'image') return '📷 Photo';
    if (m.type === 'file') return m.fileName ? `📎 ${m.fileName}` : '📎 File';
    if (m.type === 'voice') return '🎤 Voice message';
    return (m.message || '').trim().slice(0, 120);
  }, [latestMentionOfMe]);

  const scrollToMentionMessage = useCallback(() => {
    if (!latestMentionOfMe) return;
    const y = messageLayoutY.current[latestMentionOfMe.id];
    if (y == null) {
      scrollViewRef.current?.scrollToEnd({ animated: true });
      return;
    }
    scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
  }, [latestMentionOfMe]);
  const toast = useToast();
  const messageModal = useMessageModal();

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const isRecording = recorderState.isRecording;
  const recordingSeconds = Math.floor(recorderState.durationMillis / 1000);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string } | null>(null);
  const [taggedUser, setTaggedUser] = useState<{ id: string; name: string } | null>(null);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);
  const [groupParticipants, setGroupParticipants] = useState<GroupParticipant[]>([]);
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [tagParticipantsList, setTagParticipantsList] = useState<GroupParticipant[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseChat) {
      setMessagesLoading(false);
      return;
    }
    let cancelled = false;
    getCurrentUserId().then(setCurrentUserId);
    setMessagesLoading(true);
    loadMessages(chatId).finally(() => {
      if (!cancelled) setMessagesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [chatId, isSupabaseChat, loadMessages]);

  useFocusEffect(
    useCallback(() => {
      if (!isSupabaseChat) return;
      void markChatMessageNotificationsReadForChat(chatId).then(() => invalidateNotificationBadges());
    }, [chatId, isSupabaseChat])
  );

  useEffect(() => {
    if (!isSupabaseChat) return;
    getChatById(chatId).then((row) => {
      if (row) {
        setFetchedChat({
          name: row.type === 'group' && row.name && row.name.trim() ? row.name.trim() : (row.name ?? ''),
          isGroup: row.type === 'group',
          created_by_id: row.created_by_id,
        });
      }
    });
  }, [chatId, isSupabaseChat]);

  useEffect(() => {
    if (!isSupabaseChat || !isGroup) return;
    getMyRoleInChat(chatId).then(setMyRole);
  }, [chatId, isSupabaseChat, isGroup]);

  useEffect(() => {
    if (!isSupabaseChat || !isGroup) return;
    getGroupParticipants(chatId).then(setTagParticipantsList);
  }, [chatId, isSupabaseChat, isGroup]);

  useEffect(() => {
    if (!isSupabaseChat) return;
    const unsub = subscribeToMessages(chatId, (msg) => {
      appendMessage(chatId, msg);
    });
    return () => {
      unsub?.();
    };
  }, [chatId, isSupabaseChat, appendMessage]);

  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const responsiveScale = screenWidth / 440;
  const bottomPadding = insets.bottom;
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => hide.remove();
  }, []);
  const handleInputFocus = useCallback(() => {
    setKeyboardVisible(true);
    scrollToBottom();
  }, []);
  
  const uid = currentUserId ?? '';
  /** Exclude current user from participant lists (they shouldn't see themselves). */
  const otherParticipants = tagParticipantsList.filter((p) => p.user_id !== uid);
  /** Format participant names for header subtitle (WhatsApp-style: "Alice, Bob and 3 others") */
  const formatParticipantsSubtitle = (participants: GroupParticipant[]): string => {
    const names = participants
      .map((p) => (p.full_name || '').trim())
      .filter((n) => n.length > 0);
    if (names.length === 0) return '';
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]}`;
    return `${names[0]}, ${names[1]} and ${names.length - 2} others`;
  };
  /** WhatsApp-style: show picker while composing `@name` (group only). */
  const activeMention = useMemo(() => (isGroup ? getActiveMention(inputText) : null), [isGroup, inputText]);

  const mentionPickerItems = useMemo(() => {
    const q = (activeMention?.query ?? '').trim().toLowerCase();
    const base = otherParticipants.map((p) => ({
      id: p.user_id,
      name: (p.full_name || '').trim() || 'Unknown',
    }));
    if (!q) return base;
    return base.filter((x) => x.name.toLowerCase().includes(q));
  }, [activeMention?.query, otherParticipants]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    // Scroll to bottom when messages load
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    const hasContent = inputText.trim() || selectedImage || selectedFile;
    if (!hasContent || !chat) return;

    if (isSupabaseChat) {
      try {
        const options: import('../services/chat').SendMessageOptions = {};
        if (taggedUser) {
          options.taggedUserId = taggedUser.id;
          options.taggedUserName = taggedUser.name;
        }
        if (replyToMessage) {
          options.replyToMessageId = replyToMessage.id;
          options.replyToSenderName = replyToMessage.senderName;
          options.replyToMessagePreview = (replyToMessage.message || '').slice(0, 80) + ((replyToMessage.message || '').length > 80 ? '…' : '');
        }
        let content: string;
        let type: 'text' | 'image' | 'file' = 'text';
        if (selectedImage) {
          const { url } = await uploadChatAttachment(selectedImage, { type: 'image' });
          content = url;
          type = 'image';
        } else if (selectedFile) {
          const { url } = await uploadChatAttachment(selectedFile.uri, {
            type: 'file',
            fileName: selectedFile.name,
          });
          content = formatFileContent(selectedFile.name, url);
          type = 'file';
        } else {
          content = inputText.trim();
        }
        await sendMessageToStore(chatId, content, type, Object.keys(options).length > 0 ? options : undefined);
        setInputText('');
        setSelectedImage(null);
        setSelectedFile(null);
        setTaggedUser(null);
        setReplyToMessage(null);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      } catch (e) {
        console.warn('Send failed', e);
        const message = e instanceof Error ? e.message : 'Could not send. Try again.';
        if (message.includes('Bucket not found') || message.includes('bucket')) {
          messageModal.show({
            title: 'Storage not set up',
            message:
              'Create a storage bucket named "chat-attachments" in your Supabase project (Dashboard → Storage → New bucket), then try again.',
            buttons: [{ text: 'OK' }],
          });
        } else {
          toast.show(message, { type: 'error', title: 'Send failed' });
        }
      }
      return;
    }

    setInputText('');
    setSelectedImage(null);
    setSelectedFile(null);
    setTaggedUser(null);
    setReplyToMessage(null);
  };

  /** Camera icon: show Camera vs Choose from Library */
  const showPhotoOptions = () => {
    messageModal.show({
      title: 'Photo',
      buttons: [
        { text: 'Camera', onPress: handleTakePhoto },
        { text: 'Choose from Library', onPress: handlePickFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ],
      cancelable: true,
    });
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setSelectedFile({ uri: asset.uri, name: asset.name ?? 'file' });
    } catch (error) {
      console.error('Error picking file:', error);
      toast.show('Failed to pick file. Please try again.', { type: 'error', title: 'Error' });
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        toast.show('Please grant camera permissions to take photos.', { type: 'error', title: 'Permission needed' });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      toast.show('Failed to take photo. Please try again.', { type: 'error', title: 'Error' });
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        toast.show('Please grant camera roll permissions to upload images.', { type: 'error', title: 'Permission needed' });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      toast.show('Failed to pick image. Please try again.', { type: 'error', title: 'Error' });
    }
  };

  const handleVoiceRecord = async () => {
    if (!chat) return;

    if (recorderState.isRecording) {
      // Stop recording and send
      try {
        const durationSec = Math.round(recorderState.durationMillis / 1000) || 0;
        await audioRecorder.stop();
        const uri = audioRecorder.uri;

        if (uri && durationSec > 0 && isSupabaseChat) {
          const newMessage: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            chatId: chatId,
            senderId: uid,
            senderName: 'You',
            message: '🎤 Voice message',
            timestamp: new Date().toISOString(),
            type: 'voice',
            voiceUri: uri,
            voiceDuration: durationSec,
            taggedUserId: taggedUser?.id,
            taggedUserName: taggedUser?.name,
          };
          appendMessage(chatId, newMessage);
          setTaggedUser(null);
          scrollToBottom();
        } else {
          toast.show('Please record for at least 1 second.', { type: 'error', title: 'Recording too short' });
        }
      } catch (error) {
        console.error('Error stopping recording:', error);
        toast.show('Failed to save voice message. Please try again.', { type: 'error', title: 'Error' });
      }
      return;
    }

    // Start recording
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        toast.show('Please grant microphone permissions to record voice messages.', { type: 'error', title: 'Permission needed' });
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.show('Failed to start recording. Please try again.', { type: 'error', title: 'Error' });
    }
  };

  const handleTagUser = useCallback(async () => {
    if (!isGroup || !isSupabaseChat) return;
    let participants = tagParticipantsList;
    if (participants.length === 0) {
      participants = await getGroupParticipants(chatId);
      setTagParticipantsList(participants);
    }
    const others = participants.filter((p) => p.user_id !== (currentUserId ?? ''));
    if (others.length === 0) {
      toast.show('No other members to mention in this group.', { type: 'info', title: 'Mentions' });
      return;
    }
    setInputText((prev) => (getActiveMention(prev) ? prev : `${prev}@`));
    requestAnimationFrame(() => textInputRef.current?.focus());
  }, [isGroup, isSupabaseChat, chatId, tagParticipantsList, currentUserId, toast]);

  const handleSelectTaggedUser = (userId: string, userName: string) => {
    const display = userName.trim() || 'Unknown';
    setTaggedUser({ id: userId, name: display });
    setInputText((prev) => {
      const mention = getActiveMention(prev);
      const token = `@${display} `;
      if (mention) return prev.slice(0, mention.start) + token;
      return `${prev}${token}`;
    });
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (taggedUser) {
      const needle = `@${taggedUser.name}`;
      if (!text.includes(needle)) setTaggedUser(null);
    }
  };

  const removeImage = () => setSelectedImage(null);
  const removeFile = () => setSelectedFile(null);

  const shouldShowDateSeparator = (currentMessage: ChatMessage, prevMessage: ChatMessage | null): boolean => {
    if (!prevMessage) return true;
    
    const currentDate = new Date(currentMessage.timestamp);
    const prevDate = new Date(prevMessage.timestamp);
    
    return (
      currentDate.getDate() !== prevDate.getDate() ||
      currentDate.getMonth() !== prevDate.getMonth() ||
      currentDate.getFullYear() !== prevDate.getFullYear()
    );
  };

  const formatDateSeparator = (timestamp: string): string => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleMessageLongPress = useCallback(
    (msg: ChatMessage) => {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', 'Reply'],
            cancelButtonIndex: 0,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) setReplyToMessage(msg);
          }
        );
        return;
      }
      messageModal.show({
        title: 'Message',
        buttons: [
          { text: 'Reply', onPress: () => setReplyToMessage(msg) },
          { text: 'Cancel', style: 'cancel' },
        ],
        cancelable: true,
      });
    },
    [messageModal]
  );

  const handleGroupOptionsPress = () => {
    const buttons: { text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }[] = [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Edit group name',
        onPress: () => {
          setEditGroupName(typeof chat?.name === 'string' ? chat.name : '');
          setShowEditGroupModal(true);
        },
      },
      {
        text: 'Group members',
        onPress: async () => {
          const participants = await getGroupParticipants(chatId);
          setGroupParticipants(participants);
          setShowGroupMembersModal(true);
        },
      },
    ];
    if (isGroupCreator) {
      buttons.push({
        text: 'Delete group',
        style: 'destructive',
        onPress: () => {
          messageModal.show({
            title: 'Delete group?',
            message: 'This will permanently delete the group and all messages. This cannot be undone.',
            buttons: [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  const ok = await deleteGroupChat(chatId);
                  if (ok) {
                    removeChat(chatId);
                    clearMessages(chatId);
                    navigation.goBack();
                  } else {
                    toast.show('Could not delete the group.', { type: 'error', title: 'Error' });
                  }
                },
              },
            ],
          });
        },
      });
    }
    messageModal.show({ title: 'Group options', buttons, cancelable: true });
  };

  const handleMakeAdmin = async (participantUserId: string) => {
    const ok = await setParticipantRole(chatId, participantUserId, 'admin');
    if (ok) {
      const participants = await getGroupParticipants(chatId);
      setGroupParticipants(participants);
    } else {
      toast.show('Could not make admin.', { type: 'error', title: 'Error' });
    }
  };

  const handleEditGroupSave = async () => {
    const name = editGroupName.trim();
    if (!name) return;
    const ok = await updateGroupChat(chatId, { name });
    if (ok) {
      updateChatName(chatId, name);
      setFetchedChat((prev) => (prev ? { ...prev, name } : null));
      setShowEditGroupModal(false);
    } else {
      toast.show('Could not update group name.', { type: 'error', title: 'Error' });
    }
  };

  if (!chat || !chatId) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text>Chat not found</Text>
      </View>
    );
  }

  const keyboardBehavior = Platform.select({
    ios: 'padding' as const,
    android: 'padding' as const,
    default: 'padding' as const,
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={keyboardBehavior}
        // Keep header fixed; move messages + input above keyboard.
        keyboardVerticalOffset={Platform.OS === 'ios' ? CHAT_HEADER_BAR_HEIGHT : 0}
      >
        {/* Header - WhatsApp style */}
        <ChatHeader
          onBackPress={handleBackPress}
          showSearch={false}
          title={typeof chat.name === 'string' ? chat.name : 'Chat'}
          subtitle={isGroup && otherParticipants.length > 0 ? formatParticipantsSubtitle(otherParticipants) : undefined}
          isGroup={isGroup}
          avatar={chat.avatar}
          showAvatar={true}
          showMessageButton={false}
          onGroupOptionsPress={isGroupAdmin ? handleGroupOptionsPress : undefined}
        />

        {/* @mentions of you: compact row under header — flow layout only (no absolute blur bleed onto list) */}
        {latestMentionOfMe ? (
          <Pressable
            onPress={scrollToMentionMessage}
            style={({ pressed }) => [styles.mentionBannerOuter, pressed && styles.mentionBannerPressed]}
          >
            <BlurView
              pointerEvents="none"
              intensity={Platform.OS === 'ios' ? 40 : 25}
              tint="light"
              style={styles.mentionBannerBlurBg}
            />
            <View style={styles.mentionBannerRow} pointerEvents="box-none">
              <View style={styles.mentionSnippetBox}>
                <Text style={styles.mentionSnippetFaded} numberOfLines={2}>
                  {latestMentionSnippet || '—'}
                </Text>
              </View>
              <View style={styles.mentionBannerTextCol}>
                <Text style={styles.mentionBannerTitle}>Mentioned you</Text>
                <Text style={styles.mentionBannerSender} numberOfLines={1}>
                  {latestMentionOfMe.senderName}
                </Text>
                {messagesTaggingMe.length > 1 ? (
                  <Text style={styles.mentionBannerMore}>+{messagesTaggingMe.length - 1} more</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-down-circle-outline" size={24} color={colors.primary.main} />
            </View>
          </Pressable>
        ) : null}

        {/* Messages List */}
        <View style={styles.messagesWrapper}>
        <ScrollView
          ref={scrollViewRef}
          style={[styles.messagesContainer, { marginTop: 0 }]}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingTop: 0, paddingBottom: 12 * responsiveScale },
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }}
        >
        {messages.map((message, index) => {
          const effectiveCurrentId = currentUserId ?? '';
          const isCurrentUser = message.senderId === effectiveCurrentId;
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const showDateSeparator = shouldShowDateSeparator(message, prevMessage);
          // Key: id + index so duplicate ids (e.g. from realtime race) don't break React
          return (
            <View
              key={`${message.id}-${index}`}
              onLayout={(e) => {
                messageLayoutY.current[message.id] = e.nativeEvent.layout.y;
              }}
            >
              {showDateSeparator ? (
                <View style={styles.dateSeparator}>
                  <View style={styles.dateSeparatorLine} />
                  <Text style={styles.dateSeparatorText}>
                    {formatDateSeparator(message.timestamp)}
                  </Text>
                  <View style={styles.dateSeparatorLine} />
                </View>
              ) : null}
              <MessageBubble
                message={message}
                isCurrentUser={isCurrentUser}
                isGroup={isGroup}
                onLongPress={handleMessageLongPress}
                onSwipeReply={(msg) => setReplyToMessage(msg)}
              />
            </View>
          );
        })}
        </ScrollView>
        {messagesLoading && (
          <View style={styles.messagesLoadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color={colors.primary.main} />
          </View>
        )}
        </View>

        {/* Input Area - minimal padding, flush above keyboard when open */}
        <View style={[
          styles.inputSafeArea,
          {
            paddingBottom: keyboardVisible ? 0 : bottomPadding,
            paddingTop: keyboardVisible ? 0 : 6,
          },
        ]}>
          {/* WhatsApp order: @ picker (if open) → reply strip → composer — vertical stack, no overlap */}
          {Boolean(activeMention) && !isRecording && (
            <View style={styles.tagListPanel}>
              <Text style={styles.tagListHeader}>Mention someone</Text>
              <FlatList
                data={mentionPickerItems}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                style={styles.tagListScroll}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.tagListItem}
                    onPress={() => handleSelectTaggedUser(item.id, item.name)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.tagListAvatar}>
                      <Text style={styles.tagListInitial} numberOfLines={1}>
                        {(item.name || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.tagListName} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyTagList}>
                    {otherParticipants.length === 0
                      ? 'Loading members…'
                      : (activeMention?.query ?? '').trim()
                        ? 'No matching members'
                        : 'No members to mention'}
                  </Text>
                }
              />
            </View>
          )}

          {replyToMessage && (
            <View style={styles.replyPreviewBar}>
              <View style={styles.replyPreviewAccent} />
              <View style={styles.replyPreviewContent}>
                <Text style={styles.replyPreviewLabel}>Replying to {replyToMessage.senderName}</Text>
                <Text style={styles.replyPreviewSnippet} numberOfLines={1}>
                  {replyToMessage.message}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyToMessage(null)} style={styles.replyPreviewDismiss}>
                <Text style={styles.replyPreviewDismissText}>×</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputRow}>
            {!isRecording && isGroup && (
              <TouchableOpacity style={styles.iconButton} onPress={handleTagUser} activeOpacity={0.7}>
                <Ionicons name="at-outline" size={22} color={colors.text.secondary} />
              </TouchableOpacity>
            )}

            <View style={styles.inputWithAttachments}>
              {!isRecording && (selectedImage || selectedFile) && (
                <View style={styles.attachmentPreviewRow}>
                  {selectedImage && (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: selectedImage }} style={styles.imagePreview} resizeMode="cover" />
                      <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
                        <Text style={styles.removeImageText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {selectedFile && (
                    <View style={styles.filePreviewContainer}>
                      <Ionicons name="attach-outline" size={18} color={colors.text.secondary} />
                      <Text style={styles.filePreviewName} numberOfLines={1}>{selectedFile.name}</Text>
                      <TouchableOpacity style={styles.removeImageButton} onPress={removeFile}>
                        <Text style={styles.removeImageText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {isRecording ? (
                <Text style={styles.recordingTime} numberOfLines={1}>
                  {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                </Text>
              ) : null}

              {!isRecording && (
                <TextInput
                  ref={textInputRef}
                  style={styles.input}
                  placeholder="Message"
                  placeholderTextColor={colors.text.tertiary}
                  value={inputText}
                  onChangeText={handleInputChange}
                  onFocus={handleInputFocus}
                  multiline
                  maxLength={500}
                  returnKeyType="default"
                  blurOnSubmit={false}
                  textAlignVertical={Platform.OS === 'android' ? 'center' : 'top'}
                  underlineColorAndroid="transparent"
                />
              )}
            </View>

            {!isRecording && (
              <TouchableOpacity style={styles.iconButton} onPress={handlePickFile} activeOpacity={0.7}>
                <Ionicons name="attach-outline" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            )}

            {!isRecording && (
              <TouchableOpacity style={styles.iconButton} onPress={showPhotoOptions} activeOpacity={0.7}>
                <Ionicons name="camera-outline" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.sendOrMicButton,
                (inputText.trim() || selectedImage || selectedFile) && styles.sendButtonActive,
                isRecording && styles.sendButtonRecording,
              ]}
              onPress={isRecording ? handleVoiceRecord : (inputText.trim() || selectedImage || selectedFile) ? handleSend : handleVoiceRecord}
              activeOpacity={0.7}
            >
              {(inputText.trim() || selectedImage || selectedFile) && !isRecording ? (
                <Ionicons name="arrow-up" size={22} color={colors.text.white} />
              ) : (
                <Ionicons name="mic-outline" size={22} color={isRecording ? colors.text.white : colors.text.secondary} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Edit Group Name Modal (admin only) */}
        <Modal
          visible={showEditGroupModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowEditGroupModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit group name</Text>
                <TouchableOpacity onPress={() => setShowEditGroupModal(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.editGroupNameInput}
                placeholder="Group name"
                placeholderTextColor={colors.text.tertiary}
                value={editGroupName}
                onChangeText={setEditGroupName}
                maxLength={64}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.editGroupSaveBtn, !editGroupName.trim() && styles.editGroupSaveBtnDisabled]}
                onPress={handleEditGroupSave}
                disabled={!editGroupName.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.editGroupSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Group members modal (admins): list participants, creator can Make admin */}
        <Modal
          visible={showGroupMembersModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowGroupMembersModal(false)}
          statusBarTranslucent={Platform.OS === 'android'}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Group members</Text>
                <TouchableOpacity onPress={() => setShowGroupMembersModal(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={groupParticipants.filter((p) => p.user_id !== uid)}
                keyExtractor={(item) => item.user_id}
                renderItem={({ item }) => (
                  <View style={styles.groupMemberRow}>
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.groupMemberAvatar} />
                    ) : (
                      <View style={styles.groupMemberAvatarPlaceholder}>
                        <Text style={styles.groupMemberInitial}>
                          {(item.full_name || '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.groupMemberInfo}>
                      <Text style={styles.groupMemberName} numberOfLines={1}>
                        {item.full_name || 'Unknown'}
                        {item.is_creator ? ' (creator)' : ''}
                      </Text>
                      <Text style={styles.groupMemberRole}>{item.role === 'admin' ? 'Admin' : 'Member'}</Text>
                    </View>
                    {isGroupCreator && item.role === 'member' && item.user_id !== currentUserId ? (
                      <TouchableOpacity
                        style={styles.makeAdminBtn}
                        onPress={() => handleMakeAdmin(item.user_id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.makeAdminBtnText}>Make admin</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  inputSafeArea: {
    backgroundColor: colors.background.tertiary,
    paddingTop: 6,
    paddingHorizontal: 8 * scaleX,
    paddingBottom: 0,
    flexShrink: 0,
  },
  messagesWrapper: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  mentionBannerOuter: {
    width: '100%',
    flexShrink: 0,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.background.secondary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.light,
    ...Platform.select({
      android: { elevation: 0 },
    }),
  },
  mentionBannerPressed: {
    opacity: 0.9,
  },
  mentionBannerBlurBg: {
    ...StyleSheet.absoluteFill,
  },
  mentionBannerRow: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10 * scaleX,
    paddingHorizontal: 12 * scaleX,
    minHeight: 52 * scaleX,
    zIndex: 1,
  },
  mentionSnippetBox: {
    flex: 1,
    minHeight: 40 * scaleX,
    maxHeight: 40 * scaleX,
    justifyContent: 'center',
    borderRadius: 8 * scaleX,
    paddingHorizontal: 10 * scaleX,
    paddingVertical: 4 * scaleX,
    marginRight: 10 * scaleX,
    backgroundColor: 'rgba(0,0,0,0.055)',
    overflow: 'hidden',
  },
  mentionSnippetFaded: {
    fontSize: 14 * scaleX,
    fontFamily: 'Helvetica',
    lineHeight: 18 * scaleX,
    color: colors.text.primary,
    opacity: 0.4,
  },
  mentionBannerTextCol: {
    width: 118 * scaleX,
    flexShrink: 0,
    marginRight: 4 * scaleX,
  },
  mentionBannerTitle: {
    fontSize: 13 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '700' as any,
    color: colors.primary.main,
  },
  mentionBannerSender: {
    fontSize: 12 * scaleX,
    fontFamily: 'Helvetica',
    color: colors.text.secondary,
    marginTop: 2 * scaleX,
  },
  mentionBannerMore: {
    fontSize: 11 * scaleX,
    fontFamily: 'Helvetica',
    color: colors.text.tertiary,
    marginTop: 2 * scaleX,
  },
  messagesLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  messagesContent: {
    flexGrow: 1,
    // Start messages at top (no empty space above first message).
    justifyContent: 'flex-start',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputWithAttachments: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  iconButton: {
    width: 40 * scaleX,
    height: 40 * scaleX,
    borderRadius: 20 * scaleX,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4 * scaleX,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 16 * scaleX,
    color: colors.text.primary,
    backgroundColor: colors.background.primary,
    borderRadius: 24 * scaleX,
    maxHeight: 104 * scaleX,
    paddingVertical: 10 * scaleX,
    paddingHorizontal: 14 * scaleX,
    textAlignVertical: Platform.OS === 'android' ? 'center' : 'top',
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },
  recordingTime: {
    flex: 1,
    minWidth: 0,
    fontSize: 15 * scaleX,
    color: colors.text.secondary,
    paddingHorizontal: 8 * scaleX,
    ...(Platform.OS === 'android' && { includeFontPadding: false }),
  },
  sendOrMicButton: {
    width: 44 * scaleX,
    height: 44 * scaleX,
    borderRadius: 22 * scaleX,
    backgroundColor: colors.border.medium,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8 * scaleX,
  },
  sendButtonActive: {
    backgroundColor: colors.primary.main,
  },
  sendButtonRecording: {
    backgroundColor: colors.primary.main,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 16 * scaleX,
    paddingHorizontal: 16 * scaleX,
  },
  dateSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.medium,
  },
  dateSeparatorText: {
    fontSize: 12 * scaleX,
    fontFamily: 'Helvetica',
    color: colors.text.tertiary,
    marginHorizontal: 12 * scaleX,
    fontWeight: '400' as any,
  },
  attachmentPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingBottom: 6 * scaleX,
    gap: 6 * scaleX,
  },
  imagePreviewContainer: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  imagePreview: {
    width: 44 * scaleX,
    height: 44 * scaleX,
    borderRadius: 8 * scaleX,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6 * scaleX,
    right: -6 * scaleX,
    width: 20 * scaleX,
    height: 20 * scaleX,
    borderRadius: 10 * scaleX,
    backgroundColor: colors.status.dirty,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: colors.text.white,
    fontSize: 16 * scaleX,
    fontWeight: 'bold' as any,
  },
  filePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6 * scaleX,
    paddingHorizontal: 10 * scaleX,
    backgroundColor: colors.background.tertiary,
    borderRadius: 10 * scaleX,
    alignSelf: 'flex-start',
    maxWidth: 140 * scaleX,
    position: 'relative',
  },
  filePreviewName: {
    fontSize: 12 * scaleX,
    fontFamily: 'Helvetica',
    color: colors.text.primary,
    marginLeft: 6 * scaleX,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20 * scaleX,
    borderTopRightRadius: 20 * scaleX,
    maxHeight: '60%',
    paddingBottom: 40 * scaleX,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20 * scaleX,
    paddingVertical: 16 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.medium,
  },
  modalTitle: {
    fontSize: 18 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '600' as any,
    color: colors.text.primary,
  },
  modalCloseText: {
    fontSize: 24 * scaleX,
    color: colors.text.tertiary,
  },
  participantItem: {
    paddingHorizontal: 20 * scaleX,
    paddingVertical: 16 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  participantName: {
    fontSize: 16 * scaleX,
    fontFamily: 'Helvetica',
    color: colors.text.primary,
  },
  tagListPanel: {
    maxHeight: 220,
    flexShrink: 0,
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 12 * scaleX,
    borderTopRightRadius: 12 * scaleX,
    marginHorizontal: 8 * scaleX,
    marginBottom: 8 * scaleX,
    borderWidth: 1,
    borderColor: colors.border.light,
    overflow: 'hidden',
  },
  tagListHeader: {
    fontSize: 13 * scaleX,
    fontFamily: 'Helvetica',
    fontWeight: '600' as any,
    color: colors.text.tertiary,
    paddingHorizontal: 12 * scaleX,
    paddingTop: 10 * scaleX,
    paddingBottom: 6 * scaleX,
  },
  tagListScroll: {
    maxHeight: 170,
  },
  tagListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10 * scaleX,
    paddingHorizontal: 12 * scaleX,
  },
  tagListAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12 * scaleX,
  },
  tagListInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.main,
  },
  tagListName: {
    flex: 1,
    fontSize: 16 * scaleX,
    fontFamily: 'Helvetica',
    color: colors.text.primary,
  },
  emptyTagList: {
    padding: 20,
    textAlign: 'center',
    color: colors.text.tertiary,
  },
  replyPreviewBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.background.primary,
    borderRadius: 8 * scaleX,
    marginBottom: 8 * scaleX,
    overflow: 'hidden',
    flexShrink: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.light,
    ...Platform.select({
      android: { elevation: 0 },
    }),
  },
  replyPreviewAccent: {
    width: 4 * scaleX,
    backgroundColor: colors.primary.main,
    alignSelf: 'stretch',
  },
  replyPreviewContent: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8 * scaleX,
    paddingLeft: 10 * scaleX,
    paddingRight: 6 * scaleX,
    justifyContent: 'center',
  },
  replyPreviewLabel: {
    fontSize: 12 * scaleX,
    fontWeight: '600',
    color: colors.primary.main,
    marginBottom: 2,
  },
  replyPreviewSnippet: {
    fontSize: 13 * scaleX,
    color: colors.text.secondary,
  },
  replyPreviewDismiss: {
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10 * scaleX,
    paddingVertical: 8 * scaleX,
  },
  replyPreviewDismissText: {
    fontSize: 20,
    color: colors.text.tertiary,
  },
  editGroupNameInput: {
    height: 48 * scaleX,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 8 * scaleX,
    paddingHorizontal: 12 * scaleX,
    marginHorizontal: 20 * scaleX,
    marginTop: 16 * scaleX,
    fontSize: 16,
    color: colors.text.primary,
  },
  editGroupSaveBtn: {
    marginHorizontal: 20 * scaleX,
    marginTop: 20 * scaleX,
    height: 48 * scaleX,
    borderRadius: 8 * scaleX,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editGroupSaveBtnDisabled: {
    opacity: 0.5,
  },
  editGroupSaveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.white,
  },
  groupMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20 * scaleX,
    paddingVertical: 12 * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  groupMemberAvatar: {
    width: 40 * scaleX,
    height: 40 * scaleX,
    borderRadius: 20 * scaleX,
  },
  groupMemberAvatarPlaceholder: {
    width: 40 * scaleX,
    height: 40 * scaleX,
    borderRadius: 20 * scaleX,
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupMemberInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.main,
  },
  groupMemberInfo: {
    flex: 1,
    marginLeft: 12 * scaleX,
  },
  groupMemberName: {
    fontSize: 16 * scaleX,
    fontFamily: 'Helvetica',
    color: colors.text.primary,
  },
  groupMemberRole: {
    fontSize: 13 * scaleX,
    color: colors.text.secondary,
    marginTop: 2,
  },
  makeAdminBtn: {
    paddingHorizontal: 12 * scaleX,
    paddingVertical: 6 * scaleX,
    borderRadius: 6 * scaleX,
    backgroundColor: colors.primary.main,
  },
  makeAdminBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.white,
  },
});

