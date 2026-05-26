import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { typography } from '@shared/theme';
import {
  CHAT_ITEM,
  CHAT_COLORS,
  CHAT_TYPOGRAPHY,
  scaleX,
} from '../constants/chatStyles';

export interface ChatItemData {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageSender?: string; // Optional sender name (e.g., "Zoe:")
  unreadCount?: number;
  avatar?: any; // Image source
  isGroup?: boolean;
}

interface ChatItemProps {
  chat: ChatItemData;
  onPress?: () => void;
}

export default function ChatItem({ chat, onPress }: ChatItemProps) {
  const unreadCount = typeof chat.unreadCount === 'number' ? chat.unreadCount : 0;
  const hasUnread = unreadCount > 0;
  const lastMsg = typeof chat.lastMessage === 'string' ? chat.lastMessage : '';
  const sender = typeof chat.lastMessageSender === 'string' ? chat.lastMessageSender : '';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {chat.avatar ? (
          <Image source={chat.avatar} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {(typeof chat.name === 'string' ? chat.name : '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.mainRow}>
        {/* Content */}
        <View style={styles.contentContainer}>
          <Text style={[styles.name, hasUnread ? styles.nameUnread : null]}>
            {typeof chat.name === 'string' ? chat.name : 'Chat'}
          </Text>

          <Text
            style={[
              styles.message,
              sender ? styles.messageLight : null,
              hasUnread ? styles.messageUnread : null,
            ]}
            numberOfLines={1}
          >
            {sender ? (
              <>
                <Text style={styles.messageSender}>{sender} </Text>
                <Text>{lastMsg}</Text>
              </>
            ) : (
              lastMsg
            )}
          </Text>

          {chat.isGroup ? (
            <View style={styles.groupLabel}>
              <Text style={styles.groupLabelText}>Group</Text>
            </View>
          ) : null}
        </View>

        {/* Figma: unread badge at top-right for every chat (dummy when missing) */}
        {hasUnread ? (
          <View style={styles.rightMeta}>
            <View style={styles.badge}>
              <Text style={styles.badgeText} numberOfLines={1}>
                {unreadCount > 99 ? '99+' : String(unreadCount)}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: CHAT_ITEM.avatar.left * scaleX,
    paddingVertical: 12 * scaleX,
    minHeight: 98 * scaleX,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CHAT_COLORS.divider,
  },
  avatarContainer: {
    width: CHAT_ITEM.avatar.size * scaleX,
    height: CHAT_ITEM.avatar.size * scaleX,
    borderRadius: CHAT_ITEM.avatar.borderRadius * scaleX,
    overflow: 'hidden',
    marginRight: 17 * scaleX, // Spacing between avatar and content
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: CHAT_COLORS.searchBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18 * scaleX,
    fontWeight: 'bold' as any,
    color: CHAT_COLORS.textSecondary,
  },
  mainRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    minWidth: 0,
  },
  contentContainer: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: CHAT_TYPOGRAPHY.chatName.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: CHAT_TYPOGRAPHY.chatName.fontWeight as any,
    color: CHAT_TYPOGRAPHY.chatName.color,
    marginBottom: 2 * scaleX,
  },
  nameUnread: {
    fontWeight: '700' as any,
  },
  message: {
    fontSize: CHAT_TYPOGRAPHY.message.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: CHAT_TYPOGRAPHY.message.fontWeight as any,
    color: CHAT_TYPOGRAPHY.message.color,
    marginTop: 2 * scaleX,
  },
  messageLight: {
    fontWeight: CHAT_TYPOGRAPHY.messageLight.fontWeight as any,
  },
  messageSender: {
    fontWeight: '700' as any,
    color: CHAT_TYPOGRAPHY.message.color,
  },
  messageUnread: {
    fontWeight: '600' as any,
    color: CHAT_TYPOGRAPHY.message.color,
  },
  groupLabel: {
    alignSelf: 'flex-start',
    backgroundColor: CHAT_ITEM.groupLabel.backgroundColor,
    borderRadius: CHAT_ITEM.groupLabel.borderRadius * scaleX,
    paddingHorizontal: CHAT_ITEM.groupLabel.paddingHorizontal * scaleX,
    paddingVertical: CHAT_ITEM.groupLabel.paddingVertical * scaleX,
    marginTop: 4 * scaleX,
  },
  groupLabelText: {
    fontSize: CHAT_TYPOGRAPHY.groupLabel.fontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: CHAT_TYPOGRAPHY.groupLabel.fontWeight as any,
    color: CHAT_TYPOGRAPHY.groupLabel.color,
  },
  rightMeta: {
    alignSelf: 'stretch',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingLeft: 8 * scaleX,
    paddingTop: 2 * scaleX,
  },
  badge: {
    width: 32 * scaleX,
    height: 32 * scaleX,
    borderRadius: 16 * scaleX,
    backgroundColor: CHAT_ITEM.badge.backgroundColor, // #FF46A3
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 15 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: CHAT_TYPOGRAPHY.badge.fontWeight as any,
    color: CHAT_TYPOGRAPHY.badge.color,
    includeFontPadding: false,
  },
});

