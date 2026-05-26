import { ChatItemData } from '@features/chat';

export const mockChatData: ChatItemData[] = [
  {
    id: 'chat-1',
    name: 'House keeping Minions',
    lastMessage: 'I just checked the room',
    lastMessageSender: 'Zoe:',
    unreadCount: 11, // Group chat: 11 unread messages
    avatar: require('../../assets/icons/profile-avatar.png'),
    isGroup: true,
  },
  {
    id: 'chat-2',
    name: 'Etleva Hoxha',
    lastMessage: 'Hello Stella',
    unreadCount: 1, // Direct message: 1 unread message
    avatar: require('../../assets/icons/profile-avatar.png'),
    isGroup: false,
  },
];

