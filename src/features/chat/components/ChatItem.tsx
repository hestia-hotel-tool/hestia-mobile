import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { typography } from '@/theme';
import { CHAT_COLORS, CHAT_LIST as L, scaleX } from '../constants/chatStyles';
import { UnreadBadge } from './UnreadBadge';

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

/**
 * "Zoe Tsakeri:" → "Zoe:". The frame prefixes a group's last message with the
 * sender's first name; "You:" passes through unchanged.
 */
function senderPrefix(sender: string): string {
  const name = sender.replace(/:\s*$/, '').trim();
  return name ? `${name.split(/\s+/)[0]}:` : '';
}

/**
 * A conversation row on the chat list — Figma 3272:62.
 *
 * Group ("House keeping Minions"): ringed avatar, bold name, "Zoe: " in bold
 * before a light message, and a pink "Group" tag. Direct ("Etleva Hoxha"): no
 * ring, no sender prefix, regular-weight message. Unread badge on the right.
 */
export default function ChatItem({ chat, onPress }: ChatItemProps) {
  const unreadCount = typeof chat.unreadCount === 'number' ? chat.unreadCount : 0;
  const name = typeof chat.name === 'string' ? chat.name : 'Chat';
  const lastMsg = typeof chat.lastMessage === 'string' ? chat.lastMessage : '';
  const sender =
    chat.isGroup && typeof chat.lastMessageSender === 'string' ? senderPrefix(chat.lastMessageSender) : '';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7} accessibilityRole="button">
      <View style={[styles.avatar, chat.isGroup ? styles.avatarGroup : null]}>
        {chat.avatar ? (
          <Image source={chat.avatar} style={styles.avatarImage} resizeMode="cover" />
        ) : (
          <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>

        {lastMsg ? (
          <Text style={[styles.message, sender ? styles.messageLight : null]} numberOfLines={1}>
            {sender ? <Text style={styles.messageSender}>{sender} </Text> : null}
            {lastMsg}
          </Text>
        ) : null}

        {chat.isGroup ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>Group</Text>
          </View>
        ) : null}
      </View>

      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <UnreadBadge count={unreadCount} />
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 27 * scaleX,
    paddingRight: L.badge.right * scaleX,
    paddingTop: L.chat.paddingTop * scaleX,
    paddingBottom: L.chat.paddingBottom * scaleX,
    minHeight: L.chat.minHeight * scaleX,
    borderBottomWidth: 1,
    borderBottomColor: CHAT_COLORS.divider,
  },
  avatar: {
    width: L.chat.avatar * scaleX,
    height: L.chat.avatar * scaleX,
    borderRadius: (L.chat.avatar / 2) * scaleX,
    // Android does not clip an image to borderRadius without this.
    overflow: 'hidden',
    backgroundColor: CHAT_COLORS.searchBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGroup: {
    borderWidth: 1,
    borderColor: L.chat.groupAvatarBorder,
    backgroundColor: '#ffffff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitial: {
    fontSize: 18 * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.title,
  },
  content: {
    flex: 1,
    minWidth: 0,
    marginLeft: L.chat.avatarGap * scaleX,
    marginRight: 12 * scaleX,
  },
  name: {
    marginTop: L.chat.nameTop * scaleX,
    fontSize: L.chat.nameFontSize * scaleX,
    lineHeight: L.chat.nameLineHeight * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '700',
    color: CHAT_COLORS.textPrimary,
  },
  message: {
    marginTop: L.chat.messageTop * scaleX,
    fontSize: L.chat.messageFontSize * scaleX,
    lineHeight: L.chat.messageLineHeight * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '400',
    color: CHAT_COLORS.textPrimary,
  },
  messageLight: {
    fontWeight: '300',
  },
  messageSender: {
    fontWeight: '700',
  },
  tag: {
    alignSelf: 'flex-start',
    marginTop: L.chat.tagTop * scaleX,
    height: L.chat.tagHeight * scaleX,
    paddingHorizontal: L.chat.tagPaddingX * scaleX,
    borderRadius: L.chat.tagRadius * scaleX,
    backgroundColor: L.chat.tagBackground,
    justifyContent: 'center',
  },
  tagText: {
    fontSize: L.chat.tagFontSize * scaleX,
    fontFamily: typography.fontFamily.primary,
    fontWeight: '300',
    color: '#000000',
    includeFontPadding: false,
  },
  badge: {
    marginTop: L.chat.badgeTop * scaleX,
  },
});
