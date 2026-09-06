import type { RoomType } from '@features/rooms/types/roomDetail.types';

export type RootStackParamList = {
  index: undefined;
  '(auth)/login': undefined;
  '(tabs)': undefined;
  'room/[roomId]': {
    room?: any;
    roomType?: RoomType;
    roomId?: string;
    initialTab?: 'Overview' | 'Tickets' | 'Checklist' | 'History';
    departmentName?: string;
  };
  'assign-rooms/index': { staffId: string; staffName: string; shift: 'AM' | 'PM' };
  'chat/[chatId]': { chatId: string; chat?: import('@features/chat/components/ChatItem').ChatItemData };
  'new-chat/index': undefined;
  'create-chat-group/index': undefined;
  'create-ticket/index': undefined;
  'select-ticket-location/index': { departmentName: string };
  'create-ticket-form/index': {
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
  'user-profile/index': { user: import('@features/home/types/home.types').UserProfile };
};

export type ReturnToTab =
  | '(home)/index'
  | '(rooms)/index'
  | '(chats)/index'
  | '(tickets)/index'
  | '(lost_and_found)/index'
  | '(staff)/index'
  | '(settings)/index';

export type MainTabsParamList = {
  '(home)/index': undefined;
  '(rooms)/index': { prioritizeMyAssignedRooms?: boolean } | undefined;
  '(chats)/index': undefined;
  '(tickets)/index': undefined;
  '(lost_and_found)/index': {
    openRegisterModal?: boolean;
    returnToTab?: ReturnToTab;
    preselectedRoomId?: string;
  } | undefined;
  '(staff)/index': { returnToTab?: ReturnToTab } | undefined;
  '(settings)/index': { returnToTab?: ReturnToTab } | undefined;
};
