/**
 * Chat state (Zustand) – chats list and messages per chat.
 * No mock/fallback data; all from Supabase or empty.
 */

import { create } from 'zustand';
import type { ChatMessage } from '@shared/types';
import type { ChatItemData } from '../components/ChatItem';
import { getChatsForUser, getMessages, sendMessage as sendMessageApi, type SendMessageOptions } from '../services/chat';

interface ChatState {
  /** Chat list for the current user (no mock fallback) */
  chats: ChatItemData[];
  /** Messages by chat id */
  messagesByChatId: Record<string, ChatMessage[]>;
  loading: boolean;
  error: Error | null;
  fetchChats: () => Promise<void>;
  setChats: (chats: ChatItemData[]) => void;
  /** Set messages for a chat (replace) */
  setMessages: (chatId: string, messages: ChatMessage[]) => void;
  /** Append or dedupe one message (e.g. from realtime) */
  appendMessage: (chatId: string, message: ChatMessage) => void;
  /** Load messages for a chat from API and optionally subscribe to realtime */
  loadMessages: (chatId: string) => Promise<ChatMessage[]>;
  /** Send a message (optionally with tag/reply); appends to list */
  sendMessage: (chatId: string, content: string, type?: 'text' | 'image' | 'file', options?: SendMessageOptions) => Promise<ChatMessage | null>;
  /** Clear messages for a chat (e.g. on unmount to free memory, or keep for cache) */
  clearMessages: (chatId: string) => void;
  /** Remove a chat from the list (e.g. after delete) */
  removeChat: (chatId: string) => void;
  /** Update chat name in the list (e.g. after edit group name) */
  updateChatName: (chatId: string, name: string) => void;
  /** Update chat list last-message fields (e.g. from realtime) */
  applyIncomingMessageToChatList: (chatId: string, message: ChatMessage) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messagesByChatId: {},
  loading: false,
  error: null,

  setChats: (chats) => set({ chats }),

  setMessages: (chatId, messages) =>
    set((s) => ({
      messagesByChatId: { ...s.messagesByChatId, [chatId]: messages },
    })),

  appendMessage: (chatId, message) =>
    set((s) => {
      const list = s.messagesByChatId[chatId] ?? [];
      if (list.some((m) => m.id === message.id)) return s;
      return {
        messagesByChatId: { ...s.messagesByChatId, [chatId]: [...list, message] },
      };
    }),

  fetchChats: async () => {
    set({ loading: true, error: null });
    try {
      const list = await getChatsForUser();
      set({ chats: list, loading: false, error: null });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      set({ chats: [], loading: false, error: err });
    }
  },

  loadMessages: async (chatId: string) => {
    try {
      const list = await getMessages(chatId);
      set((s) => ({
        messagesByChatId: { ...s.messagesByChatId, [chatId]: list },
      }));
      return list;
    } catch {
      set((s) => ({
        messagesByChatId: { ...s.messagesByChatId, [chatId]: [] },
      }));
      return [];
    }
  },

  sendMessage: async (chatId: string, content: string, type: 'text' | 'image' | 'file' = 'text', options?: SendMessageOptions) => {
    try {
      const msg = await sendMessageApi(chatId, content, type, options);
      if (msg) get().appendMessage(chatId, msg);
      return msg;
    } catch {
      return null;
    }
  },

  clearMessages: (chatId) =>
    set((s) => {
      const next = { ...s.messagesByChatId };
      delete next[chatId];
      return { messagesByChatId: next };
    }),

  removeChat: (chatId) =>
    set((s) => ({
      chats: s.chats.filter((c) => c.id !== chatId),
      messagesByChatId: (() => {
        const next = { ...s.messagesByChatId };
        delete next[chatId];
        return next;
      })(),
    })),

  updateChatName: (chatId, name) =>
    set((s) => ({
      chats: s.chats.map((c) => (c.id === chatId ? { ...c, name } : c)),
    })),

  applyIncomingMessageToChatList: (chatId, message) =>
    set((s) => {
      const idx = s.chats.findIndex((c) => c.id === chatId);
      if (idx < 0) return s;
      const existing = s.chats[idx];
      const next: ChatItemData = {
        ...existing,
        lastMessage: message.type === 'image' ? '📷 Image' : message.type === 'file' ? (message.fileName ? `📎 ${message.fileName}` : '📎 File') : message.message,
        lastMessageSender: message.senderName ? `${message.senderName}:` : undefined,
      };
      const nextChats = [...s.chats];
      nextChats.splice(idx, 1);
      nextChats.unshift(next);
      return { chats: nextChats };
    }),
}));
