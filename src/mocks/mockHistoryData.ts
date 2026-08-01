import type { HistoryEvent } from '@features/rooms';

export const getMockHistoryEvents = (roomNumber: string): HistoryEvent[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Today's events
  const todayEvents: HistoryEvent[] = [
    {
      id: '1',
      action: 'clicked on in progress',
      staff: {
        id: '1',
        name: 'Etleva Hoxha',
        avatar: require('../../assets/icons/Etleva_Hoxha.png'),
      },
      timestamp: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 15),
      createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15, 15).toISOString(),
    },
    {
      id: '2',
      action: 'clicked on in progress',
      staff: {
        id: '2',
        name: 'John Doe',
        avatar: require('../../assets/icons/profile-avatar.png'),
      },
      timestamp: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30),
      createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 30).toISOString(),
    },
    {
      id: '3',
      action: 'clicked on in progress',
      staff: {
        id: '3',
        name: 'Jane Smith',
        avatar: require('../../assets/icons/profile-avatar.png'),
      },
      timestamp: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 45),
      createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 45).toISOString(),
    },
    {
      id: '4',
      action: 'clicked on in progress',
      staff: {
        id: '4',
        name: 'Victor',
        initials: 'V',
        avatarColor: '#ff4dd8',
      },
      timestamp: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 20),
      createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 20).toISOString(),
    },
    {
      id: '5',
      action: 'clicked on in progress',
      staff: {
        id: '5',
        name: 'Zoe',
        initials: 'Z',
        avatarColor: '#5a759d',
      },
      timestamp: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 10),
      createdAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 10).toISOString(),
    },
  ];

  // Yesterday's events
  const yesterdayEvents: HistoryEvent[] = [
    {
      id: '6',
      action: 'clicked on in progress',
      staff: {
        id: '1',
        name: 'Etleva Hoxha',
        avatar: require('../../assets/icons/Etleva_Hoxha.png'),
      },
      timestamp: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 15, 15),
      createdAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 15, 15).toISOString(),
    },
    {
      id: '7',
      action: 'clicked on in progress',
      staff: {
        id: '2',
        name: 'John Doe',
        avatar: require('../../assets/icons/profile-avatar.png'),
      },
      timestamp: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 14, 30),
      createdAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 14, 30).toISOString(),
    },
    {
      id: '8',
      action: 'clicked on in progress',
      staff: {
        id: '3',
        name: 'Jane Smith',
        avatar: require('../../assets/icons/profile-avatar.png'),
      },
      timestamp: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 13, 45),
      createdAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 13, 45).toISOString(),
    },
    {
      id: '9',
      action: 'clicked on in progress',
      staff: {
        id: '4',
        name: 'Victor',
        initials: 'V',
        avatarColor: '#ff4dd8',
      },
      timestamp: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 12, 20),
      createdAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 12, 20).toISOString(),
    },
    {
      id: '10',
      action: 'clicked on in progress',
      staff: {
        id: '5',
        name: 'Zoe',
        initials: 'Z',
        avatarColor: '#5a759d',
      },
      timestamp: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 11, 10),
      createdAt: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 11, 10).toISOString(),
    },
  ];

  // Two days before today (day -2)
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoEvents: HistoryEvent[] = [
    {
      id: '11',
      action: 'changed status to cleaned',
      staff: {
        id: '1',
        name: 'Etleva Hoxha',
        avatar: require('../../assets/icons/Etleva_Hoxha.png'),
      },
      timestamp: new Date(twoDaysAgo.getFullYear(), twoDaysAgo.getMonth(), twoDaysAgo.getDate(), 16, 30),
      createdAt: new Date(twoDaysAgo.getFullYear(), twoDaysAgo.getMonth(), twoDaysAgo.getDate(), 16, 30).toISOString(),
    },
    {
      id: '12',
      action: 'added a note',
      staff: {
        id: '2',
        name: 'John Doe',
        avatar: require('../../assets/icons/profile-avatar.png'),
      },
      timestamp: new Date(twoDaysAgo.getFullYear(), twoDaysAgo.getMonth(), twoDaysAgo.getDate(), 14, 15),
      createdAt: new Date(twoDaysAgo.getFullYear(), twoDaysAgo.getMonth(), twoDaysAgo.getDate(), 14, 15).toISOString(),
    },
    {
      id: '13',
      action: 'reassigned to different staff',
      staff: {
        id: '3',
        name: 'Jane Smith',
        avatar: require('../../assets/icons/profile-avatar.png'),
      },
      timestamp: new Date(twoDaysAgo.getFullYear(), twoDaysAgo.getMonth(), twoDaysAgo.getDate(), 12, 0),
      createdAt: new Date(twoDaysAgo.getFullYear(), twoDaysAgo.getMonth(), twoDaysAgo.getDate(), 12, 0).toISOString(),
    },
  ];

  // Three days before today (day -3)
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysAgoEvents: HistoryEvent[] = [
    {
      id: '14',
      action: 'changed status to inspected',
      staff: {
        id: '1',
        name: 'Etleva Hoxha',
        avatar: require('../../assets/icons/Etleva_Hoxha.png'),
      },
      timestamp: new Date(threeDaysAgo.getFullYear(), threeDaysAgo.getMonth(), threeDaysAgo.getDate(), 17, 45),
      createdAt: new Date(threeDaysAgo.getFullYear(), threeDaysAgo.getMonth(), threeDaysAgo.getDate(), 17, 45).toISOString(),
    },
    {
      id: '15',
      action: 'clicked on in progress',
      staff: {
        id: '4',
        name: 'Victor',
        initials: 'V',
        avatarColor: '#ff4dd8',
      },
      timestamp: new Date(threeDaysAgo.getFullYear(), threeDaysAgo.getMonth(), threeDaysAgo.getDate(), 15, 20),
      createdAt: new Date(threeDaysAgo.getFullYear(), threeDaysAgo.getMonth(), threeDaysAgo.getDate(), 15, 20).toISOString(),
    },
    {
      id: '16',
      action: 'added a task',
      staff: {
        id: '5',
        name: 'Zoe',
        initials: 'Z',
        avatarColor: '#5a759d',
      },
      timestamp: new Date(threeDaysAgo.getFullYear(), threeDaysAgo.getMonth(), threeDaysAgo.getDate(), 13, 10),
      createdAt: new Date(threeDaysAgo.getFullYear(), threeDaysAgo.getMonth(), threeDaysAgo.getDate(), 13, 10).toISOString(),
    },
  ];

  return [...todayEvents, ...yesterdayEvents, ...twoDaysAgoEvents, ...threeDaysAgoEvents];
};
