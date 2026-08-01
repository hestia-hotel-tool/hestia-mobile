import { HomeScreenData } from '@features/home';

export const mockHomeData: HomeScreenData = {
  user: {
    name: 'Stella Kitou',
    role: 'Executive Housekeeper',
    avatar: 'https://i.pravatar.cc/150?img=1',
    hasFlag: true,
  },
  selectedShift: 'AM',
  date: 'Mon 23 Feb 2025',
  categories: [
    {
      id: 'flagged',
      name: 'Flagged',
      total: 8,
      priority: 4,
      borderColor: '#6e1eee',
      status: {
        dirty: 4,
        inProgress: 2,
        cleaned: 1,
        inspected: 1,
      },
    },
    {
      id: 'arrivals',
      name: 'Arrivals',
      total: 30,
      priority: 2,
      borderColor: '#41d541',
      status: {
        dirty: 20,
        inProgress: 5,
        cleaned: 3,
        inspected: 2,
      },
    },
    {
      id: 'stayovers',
      name: 'StayOvers',
      total: 28,
      priority: 3,
      borderColor: '#8d908d',
      status: {
        dirty: 15,
        inProgress: 5,
        cleaned: 8,
        inspected: 3,
      },
    },
  ],
  notifications: {
    chat: 12, // Total: 11 (group) + 1 (direct) = 12 unread messages
  },
};

