/** `drafts`: this person's unfinished registrations, kept on the device (store/lostAndFoundDrafts). */
export type LostAndFoundTab = 'created' | 'stored' | 'returned' | 'drafts' | 'discarded';

export type LostAndFoundStatus = 'stored' | 'shipped' | 'returned' | 'discarded';

export interface LostAndFoundItem {
  id: string;
  itemName: string;
  itemId: string; // e.g., "FH31390"
  location: string; // e.g., "Room 201", "Brasserie"
  guestName?: string; // e.g., "Mr Mohamed. B"
  /** VIP code for the guest (drives the red badge on the guest avatar). */
  guestVipCode?: string | null;
  publicArea?: string; // e.g., "Public Area"
  roomNumber?: number; // e.g., 11
  guestDates?: string; // e.g., "07/10-15/10"
  guestCount?: number; // e.g., 2
  guestImage?: { uri: string } | any; // Guest avatar/image
  /** The mark on the guest's photo, from the stay (arrival, departure, stayover…). */
  guestKind?: import('@features/rooms/components/roomsList/GuestRow').GuestRowKind;
  /** A reclamation email went to the guest (`guest_email` set) — the card's "Email sent to guest". */
  emailSent?: boolean;
  /** Who set it Discarded (`status_changed_by_id`), for the card's "Discarded By". */
  discardedBy?: string;
  storedLocation: string; // e.g., "Office"
  /** The notes typed when it was registered (`description`), shown on the card. */
  notes?: string | null;
  /** When status is `shipped`/`returned`, where the item was shipped to (Figma 3107:70). */
  shippedLocation?: string;
  registeredBy: {
    name: string;
    avatar?: any; // Image source
    timestamp: string; // e.g., "15:00, 11 November 2025"
  };
  image?: { uri: string } | any; // Remote image source (Supabase URL) or local
  status: LostAndFoundStatus;
  createdAt: string; // ISO date string for filtering
  storedAt?: string; // ISO date string
  returnedAt?: string; // ISO date string
  discardedAt?: string; // ISO date string
}

