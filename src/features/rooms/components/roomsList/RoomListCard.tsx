import React from 'react';
import type { View as RNView } from 'react-native';
import type { RoomCardData, GuestInfo } from '../../types/allRooms.types';
import { SingleGuestRoomCard } from './SingleGuestRoomCard';
import { ArrivalDepartureRoomCard } from './ArrivalDepartureRoomCard';

export type RoomListCardProps = {
  room: RoomCardData;
  onPress?: () => void;
  onStatusPress?: () => void;
  onAssignPress?: () => void;
  onGuestImagePress?: (guest: GuestInfo) => void;
  isChangingStatus?: boolean;
  onLayout?: (e: import('react-native').LayoutChangeEvent) => void;
  /** Measured by the screen for the blur overlay. */
  measureRef?: React.Ref<RNView>;
  /** Measured by the screen to anchor the status popover. */
  statusPillRef?: React.Ref<RNView>;
};

/**
 * Picks the card shape for a room.
 *
 * The only structural split in the design is one guest versus two, so that is
 * the only thing branched on here. Status, priority and the guest badge are all
 * props on the card itself.
 */
export function RoomListCard({ room, ...rest }: RoomListCardProps) {
  return room.frontOfficeStatus === 'Arrival/Departure' ? (
    <ArrivalDepartureRoomCard room={room} {...rest} />
  ) : (
    <SingleGuestRoomCard room={room} {...rest} />
  );
}

export default RoomListCard;
