/**
 * Chat service (Supabase)
 * Real-time chat: list chats, load messages, send message, subscribe to new messages.
 * Uploads images and files to Supabase Storage (bucket: chat-attachments).
 */

import * as FileSystem from 'expo-file-system/legacy';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ChatMessage } from '@/types';
import type { ChatItemData } from '../components/ChatItem';
import { base64ToArrayBuffer } from '@/utils/encoding';
import { notifyServer } from '@/lib/notifications';
import { getMyHotelId } from '@/lib/tenant';

const MESSAGE_TYPE = 'text'; // DB: text, image, system
export const CHAT_ATTACHMENTS_BUCKET = 'chat-attachments';

type MessageRow = {
  id: string;
  chat_id: string;
  sender_id: string;
  type: string;
  content: string | null;
  created_at: string | null;
  reply_to_id: string | null;
  tagged_user_id: string | null;
  users: { full_name: string | null; avatar_url: string | null } | null;
};

type ChatRow = {
  id: string;
  type: string;
  name: string | null;
  room_id: string | null;
  ticket_id: string | null;
  created_by_id: string;
  created_at: string | null;
};

type UserRow = { id: string; full_name: string | null; avatar_url?: string | null };

function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Content for file messages: "fileName|publicUrl" */
export function formatFileContent(fileName: string, publicUrl: string): string {
  return `${fileName}|${publicUrl}`;
}

export function parseFileContent(content: string | null): { fileName: string; fileUri: string } | null {
  if (!content || !content.includes('|')) return null;
  const i = content.indexOf('|');
  return { fileName: content.slice(0, i), fileUri: content.slice(i + 1) };
}

function mapMessageRow(
  row: MessageRow,
  currentUserId: string,
  replyMap?: Map<string, { senderName: string; message: string }>,
  taggedNameMap?: Map<string, string>
): ChatMessage {
  const replyTo =
    row.reply_to_id && replyMap?.get(row.reply_to_id)
      ? { id: row.reply_to_id, senderName: replyMap.get(row.reply_to_id)!.senderName, message: replyMap.get(row.reply_to_id)!.message }
      : undefined;
  const taggedUserName = row.tagged_user_id && taggedNameMap?.get(row.tagged_user_id) ? taggedNameMap.get(row.tagged_user_id) : undefined;
  const type = (row.type === 'image' ? 'image' : row.type === 'voice' ? 'voice' : row.type === 'file' ? 'file' : 'text') as ChatMessage['type'];
  const msg: ChatMessage = {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    senderName: row.sender_id === currentUserId ? 'You' : (row.users?.full_name ?? 'Unknown'),
    message: row.content ?? '',
    timestamp: row.created_at ?? new Date().toISOString(),
    type,
    ...(row.tagged_user_id && { taggedUserId: row.tagged_user_id }),
    ...(taggedUserName && { taggedUserName }),
    ...(replyTo && { replyTo }),
  };
  if (type === 'image' && row.content) {
    msg.imageUri = row.content;
    msg.message = '📷 Image';
  }
  if (type === 'file' && row.content) {
    const parsed = parseFileContent(row.content);
    if (parsed) {
      msg.fileUri = parsed.fileUri;
      msg.fileName = parsed.fileName;
      msg.message = `📎 ${parsed.fileName}`;
    }
  }
  return msg;
}

/**
 * Get current user id from session. Returns null if not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

/** Unread `chat_message` inbox rows per chat (`notifications.data.chatId`), for list badges. */
async function getUnreadChatMessageCountsByChatId(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!isSupabaseConfigured) return map;
  const { data, error } = await supabase
    .from('notifications')
    .select('data')
    .eq('type', 'chat_message')
    .is('read_at', null);
  if (error) {
    console.warn('[Chat] unread notification counts', error.message);
    return map;
  }
  for (const row of data ?? []) {
    const d = row?.data as { chatId?: string } | null | undefined;
    const cid = d?.chatId;
    if (typeof cid !== 'string' || !cid) continue;
    map.set(cid, (map.get(cid) ?? 0) + 1);
  }
  return map;
}

export type UploadChatAttachmentOptions = {
  type: 'image' | 'file';
  fileName?: string;
  mimeType?: string;
};

/**
 * Upload an image or file from a local URI to chat-attachments bucket.
 * Returns the public URL. Caller should then send a message with that URL.
 */
export async function uploadChatAttachment(
  localUri: string,
  options: UploadChatAttachmentOptions
): Promise<{ url: string }> {
  if (!isSupabaseConfigured) throw new Error('Supabase not configured');
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('Not authenticated');
  const hotelId = await getMyHotelId();
  if (!hotelId) throw new Error('No hotel assigned to this user.');

  // content:// and ph:// URIs (e.g. from Android picker) must be copied to cache before reading
  let uriToRead = localUri;
  if (!localUri.startsWith('file://')) {
    const ext = options.type === 'image' ? 'jpg' : (options.fileName?.includes('.') ? options.fileName.replace(/^.*\./, '') : 'bin');
    const tempPath = `${FileSystem.cacheDirectory}chat_upload_${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: localUri, to: tempPath });
    uriToRead = tempPath;
  }

  const base64 = await FileSystem.readAsStringAsync(uriToRead, { encoding: FileSystem.EncodingType.Base64 });
  const arrayBuffer = base64ToArrayBuffer(base64);
  const ext = options.fileName?.includes('.') ? options.fileName.replace(/^.*\./, '') : (options.type === 'image' ? 'jpg' : 'bin');
  const safeName = (options.fileName || `attachment.${ext}`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${hotelId}/${userId}/${Date.now()}_${safeName}`;
  const mimeType = options.mimeType ?? (options.type === 'image' ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : 'application/octet-stream');

  const { error } = await supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(path, arrayBuffer, { contentType: mimeType, upsert: false });

  if (error) throw error;
  const { data: urlData } = supabase.storage.from(CHAT_ATTACHMENTS_BUCKET).getPublicUrl(path);
  return { url: urlData.publicUrl };
}

// Small runtime caches to avoid N+1 lookups from Realtime handlers.
// Scoped to the JS runtime (clears on app restart).
const userCache = new Map<string, { full_name: string | null; avatar_url: string | null }>();
const replySnippetCache = new Map<string, { senderName: string; message: string }>();

async function getUsersByIds(ids: string[]): Promise<Map<string, { full_name: string | null; avatar_url: string | null }>> {
  const result = new Map<string, { full_name: string | null; avatar_url: string | null }>();
  const unique = Array.from(new Set(ids.filter((x) => isValidUUID(x))));
  if (unique.length === 0) return result;

  const missing = unique.filter((id) => !userCache.has(id));
  if (missing.length > 0) {
    const { data } = await supabase.from('users').select('id, full_name, avatar_url').in('id', missing);
    for (const row of (data ?? []) as UserRow[]) {
      userCache.set(row.id, { full_name: row.full_name ?? null, avatar_url: row.avatar_url ?? null });
    }
    // Cache negative lookups too (prevents repeated fetch attempts).
    for (const id of missing) {
      if (!userCache.has(id)) userCache.set(id, { full_name: null, avatar_url: null });
    }
  }

  for (const id of unique) {
    const v = userCache.get(id);
    if (v) result.set(id, v);
  }
  return result;
}

async function getReplySnippetById(messageId: string): Promise<{ senderName: string; message: string } | null> {
  if (!isValidUUID(messageId)) return null;
  const cached = replySnippetCache.get(messageId);
  if (cached) return cached;

  const { data } = await supabase
    .from('messages')
    .select('id, content, sender_id, users!sender_id(full_name)')
    .eq('id', messageId)
    .maybeSingle();

  if (!data) return null;
  const row = data as { id: string; content: string | null; users: { full_name: string | null } | null };
  const content = row.content ?? '';
  const snippet = content.slice(0, 80) + (content.length > 80 ? '…' : '');
  const resolved = { senderName: row.users?.full_name ?? 'Unknown', message: snippet };
  replySnippetCache.set(messageId, resolved);
  return resolved;
}

/**
 * Fetch all chats for the current user (where they are a participant),
 * with last message and display name/avatar for list.
 */
export async function getChatsForUser(): Promise<ChatItemData[]> {
  const userId = await getCurrentUserId();
  if (!userId) {
    console.warn('[Chat] getChatsForUser: no userId');
    return [];
  }

  const { data: participantRows, error: partError } = await supabase
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', userId);

  if (partError) {
    console.warn('[Chat] getChatsForUser: chat_participants error', partError.message, partError.code);
    return [];
  }
  if (!participantRows?.length) return [];

  const chatIds = participantRows.map((p) => p.chat_id);

  const { data: chats, error: chatsError } = await supabase
    .from('chats')
    .select('id, type, name, created_by_id')
    .in('id', chatIds);

  if (chatsError) {
    console.warn('[Chat] getChatsForUser: chats error', chatsError.message, chatsError.code);
    return [];
  }
  if (!chats?.length) return [];

  const unreadByChatId = await getUnreadChatMessageCountsByChatId();

  // Fetch all last messages in one go (then pick the first per chat_id).
  const { data: messageRows } = await supabase
    .from('messages')
    .select('id, chat_id, content, created_at, sender_id, users!sender_id(full_name)')
    .in('chat_id', chatIds)
    .order('created_at', { ascending: false });

  const lastByChatId = new Map<
    string,
    { id: string; chat_id: string; content: string | null; created_at: string | null; sender_id: string; users?: { full_name: string | null } | null }
  >();
  for (const row of (messageRows ?? []) as Array<{
    id: string;
    chat_id: string;
    content: string | null;
    created_at: string | null;
    sender_id: string;
    users?: { full_name: string | null } | null;
  }>) {
    if (!lastByChatId.has(row.chat_id)) lastByChatId.set(row.chat_id, row);
  }

  // Fetch other participants in one go (up to 3 per chat for groups).
  const { data: participantRowsAll } = await supabase
    .from('chat_participants')
    .select('chat_id, user_id, users(full_name, avatar_url)')
    .in('chat_id', chatIds)
    .neq('user_id', userId);

  const othersByChatId = new Map<
    string,
    Array<{ user_id: string; users: { full_name: string | null; avatar_url: string | null } | null }>
  >();
  for (const r of (participantRowsAll ?? []) as Array<{
    chat_id: string;
    user_id: string;
    users: { full_name: string | null; avatar_url: string | null } | null;
  }>) {
    const list = othersByChatId.get(r.chat_id) ?? [];
    list.push({ user_id: r.user_id, users: r.users });
    othersByChatId.set(r.chat_id, list);
  }

  const result: (ChatItemData & { lastMessageAt: string })[] = [];
  for (const chat of chats as unknown as ChatRow[]) {
    const lastMsg = lastByChatId.get(chat.id);
    const lastMessageText = lastMsg?.content ?? '';
    const lastMessageAt = lastMsg?.created_at ?? '';
    const lastMessageSender =
      lastMsg?.sender_id === userId ? 'You:' : lastMsg?.users?.full_name ? `${lastMsg.users.full_name}:` : '';

    const allOthers = othersByChatId.get(chat.id) ?? [];
    const others = (chat.type === 'group' ? allOthers.slice(0, 3) : allOthers.slice(0, 1)) as Array<{
      user_id: string;
      users: { full_name: string | null; avatar_url: string | null } | null;
    }>;

    const displayName =
      chat.type === 'group'
        ? (chat.name && chat.name.trim()
            ? chat.name.trim()
            : others.map((o) => o.users?.full_name ?? 'Unknown').join(', ') || 'Group')
        : others[0]?.users?.full_name ?? 'Chat';
    const avatarUrl = others[0]?.users?.avatar_url ?? null;

    result.push({
      id: chat.id,
      name: displayName,
      lastMessage: lastMessageText,
      lastMessageSender: lastMessageSender || undefined,
      unreadCount: unreadByChatId.get(chat.id) ?? 0,
      avatar: avatarUrl ? { uri: avatarUrl } : undefined,
      isGroup: chat.type === 'group',
      lastMessageAt: lastMessageAt || chat.created_at || '',
    });
  }

  result.sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));

  return result.map(({ lastMessageAt: _, ...item }) => item);
}

/**
 * Fetch a single chat by id (for display name / type / creator). Returns null if not found.
 */
export async function getChatById(chatId: string): Promise<{ id: string; name: string | null; type: string; created_by_id: string } | null> {
  if (!isValidUUID(chatId)) return null;
  const { data, error } = await supabase
    .from('chats')
    .select('id, name, type, created_by_id')
    .eq('id', chatId)
    .single();
  if (error || !data) return null;
  const row = data as unknown as { id: string; name: string | null; type: string; created_by_id: string };
  return { id: row.id, name: row.name ?? null, type: row.type, created_by_id: row.created_by_id };
}

/**
 * Get current user's role in a chat ('admin' | 'member'), or null if not a participant.
 * For group chats, creator is admin; creator can promote others to admin.
 */
export async function getMyRoleInChat(chatId: string): Promise<'admin' | 'member' | null> {
  const userId = await getCurrentUserId();
  if (!userId || !isValidUUID(chatId)) return null;
  const { data, error } = await supabase
    .from('chat_participants')
    .select('role')
    .eq('chat_id', chatId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  const role = (data as { role?: string }).role;
  if (role === 'admin') return 'admin';
  if (role === 'member') return 'member';
  return null;
}

/**
 * Update a group chat (name). Only group admins can update.
 * Returns true on success.
 */
export async function updateGroupChat(chatId: string, updates: { name: string }): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId || !isValidUUID(chatId)) return false;
  const chatRow = await getChatById(chatId);
  if (!chatRow || chatRow.type !== 'group') return false;
  const role = await getMyRoleInChat(chatId);
  if (role !== 'admin') return false;
  const name = typeof updates.name === 'string' && updates.name.trim() ? updates.name.trim() : (chatRow.name ?? '');
  const { error } = await supabase.from('chats').update({ name } as any).eq('id', chatId);
  return !error;
}

/**
 * Delete a group chat. Only the user who created the group can delete.
 * Messages and participants are deleted by DB CASCADE.
 * Returns true on success.
 */
export async function deleteGroupChat(chatId: string): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId || !isValidUUID(chatId)) return false;
  const row = await getChatById(chatId);
  if (!row || row.type !== 'group' || row.created_by_id !== userId) return false;
  const { error } = await supabase.from('chats').delete().eq('id', chatId).eq('created_by_id', userId);
  return !error;
}

export type GroupParticipant = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'member';
  is_creator: boolean;
};

/**
 * List group participants with role. Only for group chats.
 */
export async function getGroupParticipants(chatId: string): Promise<GroupParticipant[]> {
  const userId = await getCurrentUserId();
  if (!userId || !isValidUUID(chatId)) return [];
  const chatRow = await getChatById(chatId);
  if (!chatRow || chatRow.type !== 'group') return [];
  const { data, error } = await supabase
    .from('chat_participants')
    .select('user_id, role, users(full_name, avatar_url)')
    .eq('chat_id', chatId);
  if (error || !data) return [];
  const rows = data as unknown as Array<{
    user_id: string;
    role: string;
    users: { full_name: string | null; avatar_url: string | null } | null;
  }>;
  return rows.map((r) => ({
    user_id: r.user_id,
    full_name: r.users?.full_name ?? null,
    avatar_url: r.users?.avatar_url ?? null,
    role: r.role === 'admin' ? 'admin' : 'member',
    is_creator: r.user_id === chatRow.created_by_id,
  }));
}

/**
 * Set a participant's role (e.g. promote to admin). Only the group creator can change roles.
 * Returns true on success.
 */
export async function setParticipantRole(
  chatId: string,
  participantUserId: string,
  role: 'admin' | 'member'
): Promise<boolean> {
  const userId = await getCurrentUserId();
  if (!userId || !isValidUUID(chatId) || !isValidUUID(participantUserId)) return false;
  const chatRow = await getChatById(chatId);
  if (!chatRow || chatRow.type !== 'group' || chatRow.created_by_id !== userId) return false;
  const { error } = await supabase
    .from('chat_participants')
    .update({ role } as any)
    .eq('chat_id', chatId)
    .eq('user_id', participantUserId);
  return !error;
}

/**
 * Fetch messages for a chat, ordered by created_at ascending (oldest first).
 * Enriches reply_to and tagged_user with names.
 */
export async function getMessages(chatId: string): Promise<ChatMessage[]> {
  const userId = await getCurrentUserId();
  if (!userId || !isValidUUID(chatId)) {
    if (!userId) console.warn('[Chat] getMessages: no userId');
    return [];
  }

  const { data, error } = await supabase
    .from('messages')
    .select('id, chat_id, sender_id, type, content, created_at, reply_to_id, tagged_user_id, users!sender_id(full_name, avatar_url)')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[Chat] getMessages error:', error.message, error.code, error.details);
    return [];
  }
  const rows = (data ?? []) as unknown as MessageRow[];

  const replyIds = [...new Set(rows.map((r) => r.reply_to_id).filter(Boolean) as string[])];
  const taggedIds = [...new Set(rows.map((r) => r.tagged_user_id).filter(Boolean) as string[])];
  const replyMap = new Map<string, { senderName: string; message: string }>();
  const taggedNameMap = new Map<string, string>();

  if (replyIds.length > 0) {
    const { data: replyRows } = await supabase
      .from('messages')
      .select('id, content, sender_id, users!sender_id(full_name)')
      .in('id', replyIds);
    for (const r of replyRows ?? []) {
      const msg = r as { id: string; content: string | null; sender_id: string; users: { full_name: string | null } | null };
      const snippet = (msg.content ?? '').slice(0, 80);
      replyMap.set(msg.id, {
        senderName: msg.users?.full_name ?? 'Unknown',
        message: snippet + ((msg.content ?? '').length > 80 ? '…' : ''),
      });
    }
  }
  if (taggedIds.length > 0) {
    const { data: userRows } = await supabase.from('users').select('id, full_name').in('id', taggedIds);
    for (const u of userRows ?? []) {
      const us = u as { id: string; full_name: string | null };
      taggedNameMap.set(us.id, us.full_name ?? 'Unknown');
    }
  }

  return rows.map((row) => mapMessageRow(row, userId, replyMap, taggedNameMap));
}

export type SendMessageOptions = {
  taggedUserId?: string;
  taggedUserName?: string;
  replyToMessageId?: string;
  replyToSenderName?: string;
  replyToMessagePreview?: string;
};

/**
 * Send a text, image, or file message to a chat. Supports tag and reply.
 * For image: content = image public URL.
 * For file: content = formatFileContent(fileName, url).
 * Returns the created message.
 */
export async function sendMessage(
  chatId: string,
  content: string,
  type: 'text' | 'image' | 'file' = 'text',
  options?: SendMessageOptions
): Promise<ChatMessage> {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  const hotelId = await getMyHotelId();
  if (!hotelId) throw new Error('Missing hotel context');

  const dbType = type === 'image' ? 'image' : type === 'file' ? 'file' : MESSAGE_TYPE;
  const insertPayload: Record<string, unknown> = {
    chat_id: chatId,
    sender_id: userId,
    type: dbType,
    content: content.trim(),
    hotel_id: hotelId,
  };
  if (options?.taggedUserId) insertPayload.tagged_user_id = options.taggedUserId;
  if (options?.replyToMessageId) insertPayload.reply_to_id = options.replyToMessageId;

  const { data: inserted, error } = await supabase
    .from('messages')
    .insert(insertPayload as any)
    .select('id, chat_id, sender_id, type, content, created_at, reply_to_id, tagged_user_id')
    .single();

  if (error) throw error;
  const row = inserted as unknown as MessageRow & { users?: null };

  // Fire-and-forget push notifications to other participants.
  // Server will create in-app notification rows and dispatch Expo push.
  notifyServer({ type: 'chat_message', messageId: row.id }).catch(() => {});

  const msg: ChatMessage = {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    senderName: 'You',
    message: row.content ?? '',
    timestamp: row.created_at ?? new Date().toISOString(),
    type: (type === 'image' ? 'image' : type === 'file' ? 'file' : 'text') as ChatMessage['type'],
  };
  if (type === 'image' && row.content) {
    msg.imageUri = row.content;
    msg.message = '📷 Image';
  }
  if (type === 'file' && row.content) {
    const parsed = parseFileContent(row.content);
    if (parsed) {
      msg.fileUri = parsed.fileUri;
      msg.fileName = parsed.fileName;
      msg.message = `📎 ${parsed.fileName}`;
    }
  }
  if (options?.taggedUserId && options?.taggedUserName) {
    msg.taggedUserId = options.taggedUserId;
    msg.taggedUserName = options.taggedUserName;
  }
  if (options?.replyToMessageId && options?.replyToSenderName != null && options?.replyToMessagePreview != null) {
    msg.replyTo = {
      id: options.replyToMessageId,
      senderName: options.replyToSenderName,
      message: options.replyToMessagePreview,
    };
  }
  return msg;
}

/**
 * Subscribe to new messages in a chat (real-time, WhatsApp-style).
 * Call the returned function to unsubscribe.
 */
export function subscribeToMessages(
  chatId: string,
  onMessage: (message: ChatMessage) => void
): () => void {
  if (!isValidUUID(chatId)) return () => {};

  let channel: RealtimeChannel;
  const userIdPromise = getCurrentUserId();

  channel = supabase
    .channel(`messages:${chatId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      },
      async (payload) => {
        const row = payload.new as MessageRow & { reply_to_id?: string | null; tagged_user_id?: string | null };
        const userId = await userIdPromise;
        if (!userId) return;
        if (row.sender_id === userId) return;

        const users = await getUsersByIds([row.sender_id, row.tagged_user_id ?? ''].filter(Boolean));
        const senderName = users.get(row.sender_id)?.full_name ?? 'Unknown';
        const msgType = (row.type === 'image' ? 'image' : row.type === 'file' ? 'file' : 'text') as ChatMessage['type'];
        const msg: ChatMessage = {
          id: row.id,
          chatId: row.chat_id,
          senderId: row.sender_id,
          senderName,
          message: row.content ?? '',
          timestamp: row.created_at ?? new Date().toISOString(),
          type: msgType,
        };
        if (msgType === 'image' && row.content) {
          msg.imageUri = row.content;
          msg.message = '📷 Image';
        }
        if (msgType === 'file' && row.content) {
          const parsed = parseFileContent(row.content);
          if (parsed) {
            msg.fileUri = parsed.fileUri;
            msg.fileName = parsed.fileName;
            msg.message = `📎 ${parsed.fileName}`;
          }
        }
        if (row.tagged_user_id) {
          msg.taggedUserId = row.tagged_user_id;
          msg.taggedUserName = users.get(row.tagged_user_id)?.full_name ?? 'Unknown';
        }
        if (row.reply_to_id) {
          const snippet = await getReplySnippetById(row.reply_to_id);
          if (snippet) msg.replyTo = { id: row.reply_to_id, ...snippet };
        }
        onMessage(msg);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Create a direct chat with one other user (or return existing chat).
 * Returns chat id.
 */
export async function getOrCreateDirectChat(otherUserId: string): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId || !isValidUUID(otherUserId)) return null;
  const hotelId = await getMyHotelId();
  if (!hotelId) {
    console.warn('[Chat] getOrCreateDirectChat: missing hotelId');
    return null;
  }

  const { data: allParticipantChats } = await supabase
    .from('chat_participants')
    .select('chat_id')
    .eq('user_id', userId);

  if (!allParticipantChats?.length) {
    const { data: newChat, error: createErr } = await supabase
      .from('chats')
      .insert({ type: 'direct', created_by_id: userId, hotel_id: hotelId })
      .select('id')
      .single();
    if (createErr || !newChat) {
      if (createErr) console.warn('[Chat] create direct chat error:', createErr.message, createErr.code);
      return null;
    }
    const { error: selfErr } = await supabase
      .from('chat_participants')
      .insert([{ chat_id: newChat.id, user_id: userId, hotel_id: hotelId }]);
    if (selfErr) {
      console.warn('[Chat] add direct chat participants (self) error:', selfErr.message, selfErr.code);
      return null;
    }
    const { error: otherErr } = await supabase
      .from('chat_participants')
      .insert([{ chat_id: newChat.id, user_id: otherUserId, hotel_id: hotelId }]);
    if (otherErr) {
      console.warn('[Chat] add direct chat participants (other) error:', otherErr.message, otherErr.code);
      return null;
    }
    return newChat.id;
  }

  for (const { chat_id } of allParticipantChats) {
    const { data: chat } = await supabase.from('chats').select('id, type').eq('id', chat_id).single();
    if ((chat as { type?: string })?.type !== 'direct') continue;
    const { data: participants } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', chat_id);
    const userIds = (participants ?? []).map((p: { user_id: string }) => p.user_id);
    if (userIds.includes(userId) && userIds.includes(otherUserId) && userIds.length === 2) return chat_id;
  }

  const { data: newChat, error: createErr } = await supabase
    .from('chats')
    .insert({ type: 'direct', created_by_id: userId, hotel_id: hotelId })
    .select('id')
    .single();
  if (createErr || !newChat) {
    if (createErr) console.warn('[Chat] create direct chat (existing) error:', createErr.message, createErr.code);
    return null;
  }
  const { error: selfErr } = await supabase
    .from('chat_participants')
    .insert([{ chat_id: newChat.id, user_id: userId, hotel_id: hotelId }]);
  if (selfErr) {
    console.warn('[Chat] add direct chat participants (existing, self) error:', selfErr.message, selfErr.code);
    return null;
  }
  const { error: otherErr } = await supabase
    .from('chat_participants')
    .insert([{ chat_id: newChat.id, user_id: otherUserId, hotel_id: hotelId }]);
  if (otherErr) {
    console.warn('[Chat] add direct chat participants (existing, other) error:', otherErr.message, otherErr.code);
    return null;
  }
  return newChat.id;
}

/**
 * Create a new group chat with the current user and selected participant user ids.
 * groupName is stored as the chat display name.
 * Returns the new chat id or null on failure.
 */
export async function createGroupChat(participantUserIds: string[], groupName: string): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const hotelId = await getMyHotelId();
  if (!hotelId) {
    console.warn('[Chat] createGroupChat: missing hotelId');
    return null;
  }

  const uniqueIds = Array.from(new Set(participantUserIds.filter((id) => isValidUUID(id))));
  if (uniqueIds.length === 0) return null;

  const name = typeof groupName === 'string' && groupName.trim() ? groupName.trim() : 'Group';
  const { data: newChat, error: createErr } = await supabase
    .from('chats')
    .insert({ type: 'group', name, created_by_id: userId, hotel_id: hotelId })
    .select('id')
    .single();

  if (createErr || !newChat) {
    if (createErr) console.warn('[Chat] create group chat error:', createErr.message, createErr.code);
    return null;
  }

  const others = uniqueIds.filter((id) => id !== userId);
  const { error: selfErr } = await supabase.from('chat_participants').insert([
    { chat_id: newChat.id, user_id: userId, role: 'admin', hotel_id: hotelId },
  ]);
  if (selfErr) {
    console.warn('[Chat] add group chat participants (self) error:', selfErr.message, selfErr.code);
    return null;
  }
  if (others.length > 0) {
    const { error: othersErr } = await supabase
      .from('chat_participants')
      .insert(others.map((uid) => ({ chat_id: newChat.id, user_id: uid, role: 'member', hotel_id: hotelId })));
    if (othersErr) {
      console.warn('[Chat] add group chat participants (others) error:', othersErr.message, othersErr.code);
      return null;
    }
  }
  return newChat.id;
}
