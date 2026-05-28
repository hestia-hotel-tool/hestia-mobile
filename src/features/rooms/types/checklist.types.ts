export interface ChecklistItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  image: any;
  quantity: number;
  initialStock?: number; // For mini bar items showing initial inventory
  order: number;
}

export interface ChecklistCategory {
  id: string;
  name: string;
  items: ChecklistItem[];
  order: number;
  showLoadMore?: boolean; // For Mini Bar section
}

export interface ChecklistData {
  roomNumber: string;
  categories: ChecklistCategory[];
  registeredBy: {
    id: string;
    name: string;
    avatar?: any;
  };
  registeredAt: {
    time: string; // e.g., "12:00"
    date: string; // e.g., "12 December 2025"
  };
}

export interface ChecklistSubmissionData {
  roomNumber: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
  }>;
  registeredBy: string;
  registeredAt: string;
}
