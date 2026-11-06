import React from 'react';
import type { LayoutChangeEvent, View as RNView } from 'react-native';
import { formatDatesOfStayShort, formatGuestCountWords } from '@/utils/formatting';
import { useNow } from '@/hooks/useNow';
import type { RoomCardData, GuestInfo } from '../../types/allRooms.types';
import { getRoomCardStatus } from '../../types/allRooms.types';
import { guestRowKind, guestTimeLabelForKind } from '../../utils/roomCardProps';
import { assigneeStatus, promiseLine, roomHasLiveClock } from '../../utils/cleaningClock';
import { isActivePriority } from '../../utils/roomGroups';
import type { PorterStatus } from '../../utils/porter';
import { RoomCardShell } from './RoomCardShell';
import { RoomCardHeader } from './RoomCardHeader';
import { RoomCardBody } from './RoomCardBody';
import { RoomCardFooter } from './RoomCardFooter';
import { GuestRow } from './GuestRow';
import { RoomStatusPill } from './RoomStatusPill';
import { RoomPromiseRow } from './RoomPromiseRow';
import { RoomAssigneeBlock } from './RoomAssigneeBlock';
import { StatusCap, hasStatusCap } from './StatusCap';
import { roomBadges } from './RoomBadgeTile';
import { PorterStatusPill, GuestPresence } from './PorterStatusPill';

export type RoomListCardProps = {
  room: RoomCardData;
  onPress?: () => void;
  onStatusPress?: () => void;
  onAssignPress?: () => void;
  onGuestImagePress?: (guest: GuestInfo) => void;
  /** The info mark on a guest's VIP disc. Its screen is still to be designed; until then nothing passes it. */
  onGuestInfoPress?: (guest: GuestInfo) => void;
  isChangingStatus?: boolean;
  onLayout?: (e: LayoutChangeEvent) => void;
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
 * One room in the Rooms list — Figma 4553:262.
 *
 * Every state draws the same card: the number with its type chips and badge
 * tiles, the guests in a tinted panel (two on an Arrival/Departure room, the
 * arriving guest first), and a footer with the attendant and the status pill.
 * Status shows by the pill alone; priority by the red frame around the card.
 */
export function RoomListCard({
  room,
  onPress,
  onStatusPress,
  onAssignPress,
  onGuestImagePress,
  onGuestInfoPress,
  isChangingStatus,
  onLayout,
  measureRef,
  statusPillRef,
  porter,
  frontOffice = false,
}: RoomListCardProps) {
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
  // Front Office caps a Paused or In Progress card (3859:2876 / 3859:2426).
  const capped = frontOffice && !porter && !priority && hasStatusCap(displayStatus);
  const staff = room.roomAttendantAssigned;
  // Index 0 is the arriving guest and index 1 the departing one.
  const guests = room.guests.slice(0, room.frontOfficeStatus === 'Arrival/Departure' ? 2 : 1);

  return (
    <RoomCardShell
      framed={priority}
      onPress={onPress}
      onLayout={onLayout}
      measureRef={measureRef}
      cap={capped ? <StatusCap status={displayStatus} /> : undefined}
    >
      <RoomCardHeader
        roomNumber={room.roomNumber}
        type={room.frontOfficeStatus}
        badges={roomBadges(room)}
        outOfOrder={Boolean(room.outOfOrder)}
      />

      <RoomPromiseRow text={promise} />

      <RoomCardBody
        priority={priority}
        guests={guests.map((guest, index) => {
          // One derivation for both the disc and the time prefix, so they agree.
          const kind = guestRowKind(room, index);
          return (
            <GuestRow
              key={`${guest.name}-${index}`}
              name={guest.name}
              marker={guest.vipCode != null ? String(guest.vipCode) : undefined}
              dates={formatDatesOfStayShort(guest.datesOfStay)}
              occupancy={formatGuestCountWords(guest.guestCount)}
              timeLabel={guestTimeLabelForKind(kind, guest)}
              kind={kind}
              imageUrl={guest.imageUrl}
              onImagePress={guest.imageUrl && onGuestImagePress ? () => onGuestImagePress(guest) : undefined}
              onInfoPress={onGuestInfoPress ? () => onGuestInfoPress(guest) : undefined}
            />
          );
        })}
      />

      <RoomCardFooter
        label={porter ? undefined : 'Room Attendant'}
        left={
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
        pill={
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

export default RoomListCard;
