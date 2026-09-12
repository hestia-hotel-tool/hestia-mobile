import React from 'react';
import type { View as RNView } from 'react-native';
import { formatDatesOfStayCompact, formatGuestCount } from '@/utils/formatting';
import type { RoomCardData, GuestInfo } from '../../types/allRooms.types';
import { STATUS_CONFIGS, getRoomDisplayStatus } from '../../types/allRooms.types';
import { guestRowKind, guestTimeLabel, roomCardState } from '../../utils/roomCardProps';
import { View } from '@/tw';
import { ROOM_CARD } from './roomCardLayout';
import { RoomCardShell } from './RoomCardShell';
import { RoomStatusCap } from './RoomStatusCap';
import { RoomCardHeader } from './RoomCardHeader';
import { GuestRow } from './GuestRow';
import { RoomStatusPill } from './RoomStatusPill';
import { RoomAssigneeBlock } from './RoomAssigneeBlock';

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
 * A room turning over on the same day — Figma 3883:5881.
 *
 * Its own component rather than a branch inside the single-guest card, because
 * two things genuinely differ and neither is a prop: there are two guest rows
 * with a rule between them, and the arriving guest's disc is green while the
 * departing guest's is red. Everything else — the shell, the cap, the header,
 * the panel, the pill, the assignee — is the same shared piece.
 *
 * The pill is a single control centred across both rows, which falls out of
 * `RoomGuestPanel` centring its action column.
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
  const { statusLine } = roomCardState(room);
  const displayStatus = getRoomDisplayStatus(room);
  const config = STATUS_CONFIGS[displayStatus];
  const staff = room.roomAttendantAssigned;
  const capped = displayStatus === 'Paused' || displayStatus === 'InProgress';

  const renderGuest = (guest: GuestInfo, index: number) => (
    <GuestRow
      key={`${guest.name}-${index}`}
      name={guest.name}
      marker={guest.vipCode != null ? String(guest.vipCode) : undefined}
      dates={formatDatesOfStayCompact(guest.datesOfStay)}
      occupancy={formatGuestCount(guest.guestCount)}
      timeLabel={guestTimeLabel(guest)}
      kind={guestRowKind(room, index)}
      imageUrl={guest.imageUrl}
      onImagePress={guest.imageUrl && onGuestImagePress ? () => onGuestImagePress(guest) : undefined}
    />
  );

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
        typeLabel="Arrival/Departure"
        assignee={
          <RoomAssigneeBlock
            name={staff?.name}
            avatarUrl={staff?.avatar}
            statusLine={statusLine}
            onPress={onAssignPress}
          />
        }
      />

      {/* A full-bleed rule under the header, then the guests on the card
          itself — node 3883:5642 is a 392px line spanning the whole 392px
          card, not an inset one. */}
      <View className="h-px bg-border-medium" />

      <View className="flex-row items-center gap-md px-xl py-lg">
        {/* Stacked and spaced, with nothing between them. The single-guest
            cards put their one guest inside a tinted rgba(223,230,240,0.4)
            panel, but the Arrival/Departure card has no such panel and no rule
            between the two guests — the header rule above is the only divider
            it draws. */}
        <View className="flex-1 gap-lg">
          {room.guests.slice(0, 2).map((guest, index) => (
            <React.Fragment key={`guest-${index}`}>{renderGuest(guest, index)}</React.Fragment>
          ))}
        </View>

        {/* One control for the room, centred across both guests. */}
        <View className="items-center justify-center" style={{ width: ROOM_CARD.pill.width }}>
          <RoomStatusPill
            status={displayStatus}
            tone={room.isPriority ? 'priority' : 'solid'}
            onPress={onStatusPress}
            loading={isChangingStatus}
            measureRef={statusPillRef}
          />
        </View>
      </View>
    </RoomCardShell>
  );
}

export default ArrivalDepartureRoomCard;
