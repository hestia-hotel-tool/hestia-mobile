/**
 * Navigation type definitions
 * Centralized navigation types for type safety
 */

import type { RoomType } from '@features/rooms/types/roomDetail.types';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Main: undefined;
  UserProfile: { user: import('@features/home/types/home.types').UserProfile };
  AllRooms: { showBackButton?: boolean };
  RoomDetail: {
    room?: any; 
    roomType?: RoomType; 
    roomId?: string;
    initialTab?: 'Overview' | 'Tickets' | 'Checklist' | 'History';
    departmentName?: string;
  };
  ArrivalDepartureDetail: { 
    room: any; 
    initialTab?: 'Overview' | 'Tickets' | 'Checklist' | 'History';
    departmentName?: string;
  };
  AssignRooms: { staffId: string; staffName: string; shift: 'AM' | 'PM' };
  ChatDetail: { chatId: string; chat?: import('@features/chat/components/ChatItem').ChatItemData };
  NewChat: undefined;
  CreateChatGroup: undefined;
  TicketDetail: { ticketId: string };
  CreateTicket: undefined;
  SelectTicketLocation: { departmentName: string };
  CreateTicketForm: { 
    departmentId?: string; 
    departmentName?: string; 
    roomId?: string; 
    roomNumber?: string;
    guestId?: string;
    guestName?: string;
    checkIn?: string;
    checkOut?: string;
    guestCount?: number;
    vipCode?: string;
    guestImageUrl?: string;
    isPublicArea?: boolean;
    publicAreaName?: string;
  };
};

/** Tab/screen to return to when back is pressed */
export type ReturnToTab = 'Home' | 'Rooms' | 'Chat' | 'Tickets' | 'LostAndFound' | 'Staff' | 'Settings';

export type MainTabsParamList = {
  Home: undefined;
  /** When true (tab opened via Rooms badge), list shows only this user’s assigned rooms, newest assignment first. */
  Rooms: { prioritizeMyAssignedRooms?: boolean } | undefined;
  Chat: undefined;
  Tickets: undefined;
  LostAndFound: {
    openRegisterModal?: boolean;
    returnToTab?: ReturnToTab;
    preselectedRoomId?: string;
  } | undefined;
  Staff: { returnToTab?: ReturnToTab } | undefined;
  Settings: { returnToTab?: ReturnToTab } | undefined;
};
