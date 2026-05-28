import { ChatMessage } from '@shared/types';

// Get today's date
const today = new Date();
const todayISO = today.toISOString().split('T')[0]; // Get YYYY-MM-DD format

// Mock messages for different chats - using today's date
export const mockChatMessages: Record<string, ChatMessage[]> = {
  'chat-1': [
    {
      id: 'msg-1',
      chatId: 'chat-1',
      senderId: 'user-1',
      senderName: 'Zoe',
      message: 'Good morning team!',
      timestamp: `${todayISO}T08:00:00Z`,
    },
    {
      id: 'msg-2',
      chatId: 'chat-1',
      senderId: 'current-user',
      senderName: 'You',
      message: 'Good morning everyone!',
      timestamp: `${todayISO}T08:02:00Z`,
    },
    {
      id: 'msg-3',
      chatId: 'chat-1',
      senderId: 'user-2',
      senderName: 'Etleva',
      message: 'Morning Zoe!',
      timestamp: `${todayISO}T08:05:00Z`,
    },
    {
      id: 'msg-4',
      chatId: 'chat-1',
      senderId: 'user-1',
      senderName: 'Zoe',
      message: 'I just checked room 201, everything looks good.',
      timestamp: `${todayISO}T08:10:00Z`,
    },
    {
      id: 'msg-5',
      chatId: 'chat-1',
      senderId: 'current-user',
      senderName: 'You',
      message: 'Great work Zoe!',
      timestamp: `${todayISO}T08:11:00Z`,
    },
    {
      id: 'msg-6',
      chatId: 'chat-1',
      senderId: 'user-3',
      senderName: 'Yenchai',
      message: 'Thanks for the update!',
      timestamp: `${todayISO}T08:12:00Z`,
    },
    {
      id: 'msg-7',
      chatId: 'chat-1',
      senderId: 'user-1',
      senderName: 'Zoe',
      message: 'I just checked the room',
      timestamp: `${todayISO}T08:15:00Z`,
    },
    {
      id: 'msg-8',
      chatId: 'chat-1',
      senderId: 'current-user',
      senderName: 'You',
      message: 'Perfect, keep up the good work!',
      timestamp: `${todayISO}T08:16:00Z`,
    },
  ],
  'chat-2': [
    {
      id: 'msg-6',
      chatId: 'chat-2',
      senderId: 'user-2',
      senderName: 'Etleva',
      message: 'Hello Stella',
      timestamp: `${todayISO}T09:00:00Z`,
    },
    {
      id: 'msg-7',
      chatId: 'chat-2',
      senderId: 'current-user',
      senderName: 'You',
      message: 'Hi Etleva! How can I help you?',
      timestamp: `${todayISO}T09:05:00Z`,
    },
    {
      id: 'msg-8',
      chatId: 'chat-2',
      senderId: 'user-2',
      senderName: 'Etleva',
      message: 'I need to discuss room 204 with you.',
      timestamp: `${todayISO}T09:10:00Z`,
    },
    {
      id: 'msg-9',
      chatId: 'chat-2',
      senderId: 'current-user',
      senderName: 'You',
      message: 'Sure, what about it?',
      timestamp: `${todayISO}T09:12:00Z`,
    },
  ],
};

// Current user ID (for determining if message is from current user)
export const CURRENT_USER_ID = 'current-user';

