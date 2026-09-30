import React from 'react';
import type { View as RNView } from 'react-native';
import { formatDatesOfStayCompact, formatGuestCount } from '@/utils/formatting';
import type { RoomCardData, GuestInfo } from '../../types/allRooms.types';
import { getRoomCardStatus } from '../../types/allRooms.types';
import { guestRowKind, guestTimeLabelForKind } from '../../utils/roomCardProps';
import { assigneeStatus, promiseLine } from '../../utils/cleaningClock';
import { useNow } from '@/hooks/useNow';
import { getStayoverDisplayLabel } from '../../utils/stayoverLinen';
import { RoomCardShell } from './RoomCardShell';
import { RoomCardHeader } from './RoomCardHeader';
import { RoomCardBody } from './RoomCardBody';
import { roomCardSpecName, ROOM_CARD_SPECS } from './roomCardLayout';
import { GuestRow } from './GuestRow';
import { RoomStatusPill } from './RoomStatusPill';
import { RoomPromiseRow } from './RoomPromiseRow';
import { RoomAssigneeBlock } from './RoomAssigneeBlock';
import { isActivePriority } from '../../utils/roomGroups';
import { roomBadges } from './RoomBadgeTile';

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
 * Figma 3883:5570 draws this card in the style of its state (see
 * `roomCardSpecName`): the grey 422 card for Paused and In Progress, the
 * off-white card for Dirty, the white card with a panel for Cleaned and
 * Inspected, and the white card with a rule for Refused, Return Later and
 * Do Not Disturb. Everything below takes its measures from that spec.
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
  // Live: "Credits", "Return at" and the promise move with the clock.
  const now = useNow();
  const status = assigneeStatus(room, now);
  const promise = promiseLine(room, now);
  const displayStatus = getRoomCardStatus(room);
  const priority = isActivePriority(room);
  const spec = ROOM_CARD_SPECS[roomCardSpecName(displayStatus, false, priority)];
  const guest = room.guests[0];
  const staff = room.roomAttendantAssigned;
  const kind = guestRowKind(room, 0);

  return (
    <RoomCardShell spec={spec} framed={priority} onPress={onPress} onLayout={onLayout} measureRef={measureRef}>
      <RoomCardHeader
        spec={spec}
        roomNumber={room.roomNumber}
        category={`${room.roomCategory} - ${room.credit}`}
        typeLabel={getStayoverDisplayLabel(room)}
        badges={roomBadges(room)}
        assignee={
          <RoomAssigneeBlock
            name={staff?.name}
            avatarUrl={staff?.avatar}
            // Unassigned rooms skip "Not Started" — the Assign room button says it.
            status={staff?.name || status.text !== 'Not Started' ? status : null}
            onPress={onAssignPress}
          />
        }
      />

      <RoomPromiseRow text={promise} />

      <RoomCardBody
        spec={spec}
        guests={
          guest
            ? [
                <GuestRow
                  key="guest-0"
                  name={guest.name}
                  marker={guest.vipCode != null ? String(guest.vipCode) : undefined}
                  dates={formatDatesOfStayCompact(guest.datesOfStay)}
                  occupancy={formatGuestCount(guest.guestCount)}
                  timeLabel={guestTimeLabelForKind(kind, guest)}
                  kind={kind}
                  imageUrl={guest.imageUrl}
                  onImagePress={guest.imageUrl && onGuestImagePress ? () => onGuestImagePress(guest) : undefined}
                />,
              ]
            : []
        }
        action={
          <RoomStatusPill
            status={displayStatus}
            tone={priority ? 'priority' : 'solid'}
            onPress={onStatusPress}
            loading={isChangingStatus}
            measureRef={statusPillRef}
          />
        }
      />
    </RoomCardShell>
  );
}

export default SingleGuestRoomCard;
