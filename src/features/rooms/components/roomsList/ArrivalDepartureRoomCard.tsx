import React from 'react';
import type { View as RNView } from 'react-native';
import { formatDatesOfStayCompact, formatGuestCount } from '@/utils/formatting';
import type { RoomCardData, GuestInfo } from '../../types/allRooms.types';
import { getRoomCardStatus } from '../../types/allRooms.types';
import { guestRowKind, guestTimeLabelForKind } from '../../utils/roomCardProps';
import { assigneeStatus, promiseLine } from '../../utils/cleaningClock';
import { useNow } from '@/hooks/useNow';
import { roomCardSpecName, ROOM_CARD_SPECS } from './roomCardLayout';
import { RoomCardBody } from './RoomCardBody';
import { RoomCardShell } from './RoomCardShell';
import { RoomCardHeader } from './RoomCardHeader';
import { GuestRow } from './GuestRow';
import { RoomStatusPill } from './RoomStatusPill';
import { RoomPromiseRow } from './RoomPromiseRow';
import { RoomAssigneeBlock } from './RoomAssigneeBlock';
import { isActivePriority } from '../../utils/roomGroups';
import { roomBadges } from './RoomBadgeTile';

export type ArrivalDepartureRoomCardProps = {
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
 * A room turning over on the same day — Figma 3883:5881 / 4349:2226.
 *
 * Two guest rows, 73 apart with nothing between them: the arriving guest's
 * disc green, the departing guest's red. The pill is one control centred
 * across both. The card takes its state's style like every other
 * (`roomCardSpecName`): white with a panel for In Progress, Cleaned and
 * Inspected; white with a rule for Dirty and the service exceptions.
 */
export function ArrivalDepartureRoomCard({
  room,
  onPress,
  onStatusPress,
  onAssignPress,
  onGuestImagePress,
  isChangingStatus,
  onLayout,
  measureRef,
  statusPillRef,
}: ArrivalDepartureRoomCardProps) {
  // Live: "Credits", "Return at" and the promise move with the clock.
  const now = useNow();
  const status = assigneeStatus(room, now);
  const promise = promiseLine(room, now);
  const displayStatus = getRoomCardStatus(room);
  const priority = isActivePriority(room);
  const spec = ROOM_CARD_SPECS[roomCardSpecName(displayStatus, true, priority)];
  const staff = room.roomAttendantAssigned;

  const renderGuest = (guest: GuestInfo, index: number) => {
    // One derivation, used for both the badge and the time prefix — on this
    // card in particular they must agree, because index 0 is the arriving
    // guest and index 1 the departing one. See `guestTimeLabelForKind`.
    const kind = guestRowKind(room, index);
    return (
      <GuestRow
        key={`${guest.name}-${index}`}
        name={guest.name}
        marker={guest.vipCode != null ? String(guest.vipCode) : undefined}
        dates={formatDatesOfStayCompact(guest.datesOfStay)}
        occupancy={formatGuestCount(guest.guestCount)}
        timeLabel={guestTimeLabelForKind(kind, guest)}
        kind={kind}
        imageUrl={guest.imageUrl}
        onImagePress={guest.imageUrl && onGuestImagePress ? () => onGuestImagePress(guest) : undefined}
      />
    );
  };

  return (
    <RoomCardShell spec={spec} framed={priority} onPress={onPress} onLayout={onLayout} measureRef={measureRef}>
      <RoomCardHeader
        spec={spec}
        roomNumber={room.roomNumber}
        category={`${room.roomCategory} - ${room.credit}`}
        typeLabel="Arrival/Departure"
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
        guests={room.guests.slice(0, 2).map(renderGuest)}
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

export default ArrivalDepartureRoomCard;
