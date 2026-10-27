import React from 'react';
import type { View as RNView } from 'react-native';
import { formatDatesOfStayCompact, formatGuestCount } from '@/utils/formatting';
import type { RoomCardData, GuestInfo } from '../../types/allRooms.types';
import { getRoomCardStatus } from '../../types/allRooms.types';
import { guestRowKind, guestTimeLabelForKind } from '../../utils/roomCardProps';
import { assigneeStatus, promiseLine, roomHasLiveClock } from '../../utils/cleaningClock';
import { useNow } from '@/hooks/useNow';
import { roomCardSpecName, ROOM_CARD_SPECS } from './roomCardLayout';
import { RoomCardBody } from './RoomCardBody';
import { RoomCardShell } from './RoomCardShell';
import { RoomCardHeader } from './RoomCardHeader';
import { GuestRow } from './GuestRow';
import { RoomStatusPill } from './RoomStatusPill';
import { RoomPromiseRow } from './RoomPromiseRow';
import { RoomAssigneeBlock } from './RoomAssigneeBlock';
import { StatusCap, hasStatusCap } from './StatusCap';
import { isActivePriority } from '../../utils/roomGroups';
import { roomBadges } from './RoomBadgeTile';
import { PorterStatusPill, GuestPresence } from './PorterStatusPill';
import { PORTER_SPEC_STATUS, type PorterStatus } from '../../utils/porter';

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
  /**
   * The porter's view (Figma 3859:1041): the porter check replaces the
   * room status pill, and Guest in / Guest Out replaces the assignee.
   */
  porter?: { status: PorterStatus; guestIn: boolean };
  /** Front Office's dress — Figma 3859:1919 (see ROOMS_LIST_CHROME.front_office). */
  frontOffice?: boolean;
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
  porter,
  frontOffice = false,
}: ArrivalDepartureRoomCardProps) {
  // Live: "Credits", "Return at" and the promise move with the clock.
  // Only cards with a running clock follow the tick (see roomHasLiveClock).
  const now = useNow(roomHasLiveClock(room));
  const status = assigneeStatus(room, now, { minutes: frontOffice });
  const promise = promiseLine(room, now);
  const displayStatus = getRoomCardStatus(room);
  // The red frame and rush pill are for a priority room still to be started
  // (Figma 3883:5765, "Not Started"). Once it is In Progress, paused, DND or
  // anything else, the card shows that state and its pill, like any room.
  const priority = porter
    ? !!room.isPriority && porter.status === 'unchecked'
    : isActivePriority(room) && displayStatus === 'Dirty';
  // A porter's card is styled by the porter check, not the cleaning status.
  const specStatus = porter ? PORTER_SPEC_STATUS[porter.status] : displayStatus;
  // Front Office caps a Paused or In Progress card (3859:2876 / 3859:2426).
  const capped = frontOffice && !porter && !priority && hasStatusCap(displayStatus);
  const spec = ROOM_CARD_SPECS[roomCardSpecName(specStatus, true, priority)];
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
    <RoomCardShell
      spec={spec}
      framed={priority}
      onPress={onPress}
      onLayout={onLayout}
      measureRef={measureRef}
      cap={capped ? <StatusCap status={displayStatus} /> : undefined}
    >
      <RoomCardHeader
        spec={spec}
        roomNumber={room.roomNumber}
        category={`${room.roomCategory} - ${room.credit}`}
        typeLabel="Arrival/Departure"
        badges={roomBadges(room)}
        outOfOrder={Boolean(room.outOfOrder)}
        assigneeKey={porter ? `guest|${porter.guestIn}` : `${staff?.name ?? ''}|${status.text}`}
        assignee={
          porter ? (
            <GuestPresence guestIn={porter.guestIn} />
          ) : (
          <RoomAssigneeBlock
            name={staff?.name}
            avatarUrl={staff?.avatar}
            // Unassigned rooms skip "Not Started" — the Assign room button says it.
            status={staff?.name || status.text !== 'Not Started' ? status : null}
            onPress={onAssignPress}
          />
          )
        }
      />

      <RoomPromiseRow text={promise} />

      <RoomCardBody
        spec={spec}
        guests={room.guests.slice(0, 2).map(renderGuest)}
        action={
          porter ? (
            <PorterStatusPill
              status={porter.status}
              onPress={onStatusPress}
              loading={isChangingStatus}
              measureRef={statusPillRef}
            />
          ) : (
          <RoomStatusPill
            status={displayStatus}
            tone={priority ? 'priority' : 'solid'}
            frontOffice={frontOffice}
            onPress={onStatusPress}
            loading={isChangingStatus}
            measureRef={statusPillRef}
          />
          )
        }
      />
    </RoomCardShell>
  );
}

export default ArrivalDepartureRoomCard;
