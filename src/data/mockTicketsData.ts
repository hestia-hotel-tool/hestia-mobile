import { TicketsScreenData } from '@features/tickets';

export const mockTicketsData: TicketsScreenData = {
  selectedTab: 'myTickets',
  tickets: [
    {
      id: 'ticket-1',
      title: 'TV not working',
      description: 'Guest could not connect the TV\nwith chrome cast, kindly assist',
      roomNumber: '201',
      dueTime: '10 mins',
      createdBy: {
        name: 'Stella Kitou',
        avatar: require('../../assets/icons/profile-avatar.png'),
      },
      status: 'unsolved',
      locationIcon: require('../../assets/icons/menu-icon.png'), // Placeholder for location pin icon
    },
    {
      id: 'ticket-2',
      title: 'Deliver Laundry',
      description: 'Guest wants his laundry back',
      roomNumber: '301',
      category: 'Laundry',
      categoryIcon: require('../../assets/icons/laundary.png'),
      createdBy: {
        name: 'Stella Kitou',
        avatar: require('../../assets/icons/profile-avatar.png'),
      },
      status: 'done',
      locationIcon: require('../../assets/icons/menu-icon.png'), // Placeholder for location pin icon
    },
  ],
};

