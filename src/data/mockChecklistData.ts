/**
 * Mock Checklist Data
 */

import type { ChecklistCategory, ChecklistData } from '@features/rooms';

export const DEFAULT_CHECKLIST_TEMPLATE: ChecklistCategory[] = [
  {
    id: 'minibar',
    name: 'Mini bar',
    order: 1,
    showLoadMore: true,
    items: [
      { 
        id: 'minibar-1', 
        categoryId: 'minibar', 
        name: 'Valser Sparkling water', 
        description: 'How many bottles of Valser Sparkling water was consumed',
        quantity: 0,
        initialStock: 10,
        order: 1,
        image: require('../../assets/images/sparling-water.png')
      },
      { 
        id: 'minibar-2', 
        categoryId: 'minibar', 
        name: 'Valser Still water', 
        description: 'How many bottles of Valser Still water was consumed',
        quantity: 0,
        initialStock: 10,
        order: 2,
        image: require('../../assets/images/valser-still-water.png')
      },
      { 
        id: 'minibar-3', 
        categoryId: 'minibar', 
        name: 'Coca Cola Zero', 
        description: 'How many bottles of Coca Cola Zero',
        quantity: 0,
        initialStock: 10,
        order: 3,
        image: require('../../assets/images/coca-cola-zero.png')
      },
      { 
        id: 'minibar-4', 
        categoryId: 'minibar', 
        name: 'Rivella', 
        description: 'How many bottles of Rivella was consumed',
        quantity: 0,
        initialStock: 10,
        order: 4,
        image: require('../../assets/images/rivella.png')
      },
    ],
  },
  {
    id: 'laundry',
    name: 'Laundry',
    order: 2,
    items: [
      { 
        id: 'laundry-1', 
        categoryId: 'laundry', 
        name: 'Towels changed', 
        description: 'How many times were towels changed',
        quantity: 0,
        order: 1,
        image: require('../../assets/images/large-towels.png')
      },
      { 
        id: 'laundry-2', 
        categoryId: 'laundry', 
        name: 'Medium Towels', 
        description: 'MediumTowels',
        quantity: 0,
        order: 2,
        image: require('../../assets/images/medium-towels.png')
      },
      { 
        id: 'laundry-3', 
        categoryId: 'laundry', 
        name: 'Face Towels', 
        description: 'Face Towels',
        quantity: 0,
        order: 3,
        image: require('../../assets/images/face-towels.png')
      },
    ],
  },
];

export function getDefaultChecklist(roomNumber: string): ChecklistData {
  const now = new Date();
  
  // Format date as "12 December 2025"
  const formatDate = (date: Date): string => {
    const day = date.getDate();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Format time as "12:00"
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return {
    roomNumber,
    categories: DEFAULT_CHECKLIST_TEMPLATE,
    registeredBy: {
      id: '1',
      name: 'Etleva Hoxha',
      avatar: require('../../assets/icons/profile-avatar.png'),
    },
    registeredAt: {
      time: formatTime(now),
      date: formatDate(now),
    },
  };
}
