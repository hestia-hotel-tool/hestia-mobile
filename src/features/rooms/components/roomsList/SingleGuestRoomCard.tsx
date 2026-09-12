import React from 'react';
import type { View as RNView } from 'react-native';
import { formatDatesOfStayCompact, formatGuestCount } from '@/utils/formatting';
import type { RoomCardData, GuestInfo } from '../../types/allRooms.types';
import { STATUS_CONFIGS, getRoomDisplayStatus } from '../../types/allRooms.types';
import { guestRowKind, guestTimeLabel, roomCardState } from '../../utils/roomCardProps';
import { getStayoverDisplayLabel } from '../../utils/stayoverLinen';
import { RoomCardShell } from './RoomCardShell';
import { RoomStatusCap } from './RoomStatusCap';
import { RoomCardHeader } from './RoomCardHeader';
import { RoomGuestPanel } from './RoomGuestPanel';
import { GuestRow } from './GuestRow';
import { RoomStatusPill } from './RoomStatusPill';
import { RoomAssigneeBlock } from './RoomAssigneeBlock';

export type SingleGuestRoomCardProps = {
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
 * A room with one guest — Paused, In Progress, Departure, Arrival, Stayover and
 * Turndown all render through here.
 *
 * They are one card, not six. The only differences the design draws are the
 * coloured cap (Paused and In Progress carry one, the rest do not), the pill's
 * colour, and the badge on the guest photo — all of which are props. The card
 * this replaces encoded the same variation as four fixed card heights and a
 * per-type table of `top` and `left` values.
 *
 * Arrival/Departure is *not* here: it has two guest rows and a rule between
 * them, so it gets its own component rather than a `guests.length` branch.
 */
export function SingleGuestRoomCard({
  room,
  onPress,
  onStatusPress,
  onAssignPress,
  onGuestImagePress,
  isChangingStatus,
  onLayout,
  measureRef,
  statusPillRef,
}: SingleGuestRoomCardProps) {
  const { statusLine } = roomCardState(room);
  const displayStatus = getRoomDisplayStatus(room);
  const config = STATUS_CONFIGS[displayStatus];
  const guest = room.guests[0];
  const staff = room.roomAttendantAssigned;

  // Only these two bands are capped in the design.
  const capped = displayStatus === 'Paused' || displayStatus === 'InProgress';

  return (
    <RoomCardShell
      onPress={onPress}
      onLayout={onLayout}
      measureRef={measureRef}
      framed={room.isPriority}
      cap={
        capped ? (
          <RoomStatusCap
            label={config.label ?? displayStatus}
            color={config.color}
            iconName={config.iconName}
            glyphHeight={config.glyphHeight}
          />
        ) : undefined
      }
    >
      <RoomCardHeader
        roomNumber={room.roomNumber}
        category={`${room.roomCategory} - ${room.credit}`}
        typeLabel={getStayoverDisplayLabel(room)}
        assignee={
          <RoomAssigneeBlock
            name={staff?.name}
            avatarUrl={staff?.avatar}
            statusLine={statusLine}
            onPress={onAssignPress}
          />
        }
      />

      <RoomGuestPanel
        action={
          <RoomStatusPill
            status={displayStatus}
            tone={room.isPriority ? 'priority' : 'solid'}
            onPress={onStatusPress}
            loading={isChangingStatus}
            measureRef={statusPillRef}
          />
        }
      >
        {guest && (
          <GuestRow
            name={guest.name}
            dates={formatDatesOfStayCompact(guest.datesOfStay)}
            occupancy={formatGuestCount(guest.guestCount)}
            timeLabel={guestTimeLabel(guest)}
            kind={guestRowKind(room, 0)}
            imageUrl={guest.imageUrl}
            onImagePress={
              guest.imageUrl && onGuestImagePress ? () => onGuestImagePress(guest) : undefined
            }
          />
        )}
      </RoomGuestPanel>
    </RoomCardShell>
  );
}

export default SingleGuestRoomCard;
