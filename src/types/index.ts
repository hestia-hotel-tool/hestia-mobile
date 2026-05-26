/**
 * Core type definitions
 * Central export point for all types
 */

// Re-export navigation types
export type { RootStackParamList, MainTabsParamList } from '@app/navigation/types';

// Room types
export type RoomStatus = 'dirty' | 'inProgress' | 'cleaned' | 'inspected' | 'priority';
export type RoomType = 'arrival' | 'departure' | 'stayover' | 'turndown' | 'vacant';

export interface Room {
  id: string;
  number: string;
  type: RoomType;
  status: RoomStatus;
  guestName?: string;
  checkIn?: string;
  checkOut?: string;
  assignedTo?: string;
  notes?: string[];
  priority?: boolean;
  promiseTime?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  avatar?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  room?: string;
  location?: string;
  department: string;
  status: 'open' | 'closed';
  createdBy: string;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
  dueTime?: string;
  createdAt: string;
}

/** Reply-to quote shown above the message content */
export interface ChatMessageReplyTo {
  id: string;
  senderName: string;
  message: string; // snippet, e.g. first 100 chars
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  type?: 'text' | 'image' | 'voice' | 'file';
  imageUri?: string;
  voiceUri?: string;
  voiceDuration?: number; // Duration in seconds
  fileUri?: string;
  fileName?: string;
  taggedUserId?: string;
  taggedUserName?: string;
  /** When set, this message is a reply to another message */
  replyTo?: ChatMessageReplyTo;
}

export interface Chat {
  id: string;
  name: string;
  type: 'individual' | 'group';
  participants: string[];
  lastMessage?: ChatMessage;
  unreadCount?: number;
  avatar?: string;
}

export interface LostFoundItem {
  id: string;
  trackingNumber: string;
  name: string;
  location: string;
  registeredBy: string;
  status: 'created' | 'stored' | 'returned' | 'discarded';
  dateFound: string;
  photos?: string[];
}

export interface Staff {
  id: string;
  name: string;
  department: string;
  onShift: boolean;
  currentTask?: string;
  avatar?: string;
}

