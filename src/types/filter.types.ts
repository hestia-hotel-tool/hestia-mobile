/**
 * Filter Type Definitions
 */

export type RoomStateFilter = 'dirty' | 'inProgress' | 'cleaned' | 'inspected' | 'priority' | 'paused' | 'refused' | 'returnLater';
export type GuestFilter = 'arrivals' | 'departures' | 'turnDown' | 'noTask' | 'stayOver' | 'stayOverWithLinen' | 'stayOverNoLinen' | 'checkedIn' | 'checkedOut' | 'checkedOutDueIn' | 'outOfOrder' | 'outOfService';
export type ReservationFilter = 'occupied' | 'vacant';
export type FloorFilter = 'all' | string; // 'all' or floor number as string: '1','2','3',...

export interface FilterState {
  roomStates: {
    dirty: boolean;
    inProgress: boolean;
    cleaned: boolean;
    inspected: boolean;
    priority: boolean;
    paused?: boolean;
    refused?: boolean;
    returnLater?: boolean;
  };
  guests: {
    arrivals: boolean;
    departures: boolean;
    turnDown: boolean;
    noTask?: boolean;
    stayOver: boolean;
    stayOverWithLinen?: boolean;
    stayOverNoLinen?: boolean;
    checkedIn?: boolean;
    checkedOut?: boolean;
    checkedOutDueIn?: boolean;
    outOfOrder?: boolean;
    outOfService?: boolean;
  };
  reservations?: {
    occupied: boolean;
    vacant: boolean;
  };
  floors?: Record<string, boolean>; // 'all' + floor numbers '1','2','3',...
}

export interface FilterCounts {
  roomStates: {
    dirty: number;
    inProgress: number;
    cleaned: number;
    inspected: number;
    priority: number;
    paused?: number;
    refused?: number;
    returnLater?: number;
  };
  guests: {
    arrivals: number;
    departures: number;
    turnDown: number;
    noTask?: number;
    stayOver: number;
    stayOverWithLinen?: number;
    stayOverNoLinen?: number;
    checkedIn?: number;
    checkedOut?: number;
    checkedOutDueIn?: number;
    outOfOrder?: number;
    outOfService?: number;
  };
  reservations?: {
    occupied: number;
    vacant: number;
  };
  floors?: Record<string, number>; // 'all' + floor numbers '1','2','3',... with room counts
  totalRooms?: number;
}

export interface FilterOption {
  id: string;
  label: string;
  icon: any; // require() path to icon
  iconColor?: string;
  count: number;
  selected: boolean;
  type: RoomStateFilter | GuestFilter;
}

export interface RoomStateFilterOption extends FilterOption {
  type: RoomStateFilter;
}

export interface GuestFilterOption extends FilterOption {
  type: GuestFilter;
}
