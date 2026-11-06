import React, { useCallback, useRef, useState } from 'react';
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
import { AssignRoomPill } from './AssignRoomPill';
import { StatusCap, hasStatusCap } from './StatusCap';
import { roomBadges } from './RoomBadgeTile';
import { PorterStatusPill, GuestPresence } from './PorterStatusPill';
import { vipTierFor } from '@/domain/vip';
import { VipInfoPopover, VIP_ASSISTANT_QUESTION, VIP_POPOVER_SPACE, type VipAnchor } from './VipInfoPopover';
import type { MeasureAnchor, RevealBelow } from '../../hooks/useRevealBelow';
import { useAIChatOverlay } from '@features/ai-agent';
import { useVipTiers } from '@/store/vipTiers';

export type RoomListCardProps = {
  room: RoomCardData;
  onPress?: () => void;
  onStatusPress?: () => void;
  onAssignPress?: () => void;
  onGuestImagePress?: (guest: GuestInfo) => void;
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
  /**
   * The list's way of making room under a VIP disc (useRevealBelow), so the
   * VIP popover always opens downward. Without it (Staff › Rooms) the popover
   * opens where the disc is.
   */
  revealVip?: RevealBelow;
  /** Releases what `revealVip` held (list padding, frozen header) once the popover closes. */
  endVipReveal?: () => void;
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
  isChangingStatus,
  onLayout,
  measureRef,
  statusPillRef,
  porter,
  frontOffice = false,
  revealVip,
  endVipReveal,
}: RoomListCardProps) {
  // Live: "Credits", "Return at" and the promise move with the clock.
  // Only cards with a running clock follow the tick (see roomHasLiveClock).
  const now = useNow(roomHasLiveClock(room));
  // Subscribed, so a hotel's own tiers repaint this card once they load.
  const vipTiers = useVipTiers();
  // The guest whose VIP popover was opened (their disc or its ⓘ), by index,
  // with where the ⓘ is. Kept after closing so the modal fades out and
  // SafeModal sees it hide — unmounting a visible modal skips both, and iOS
  // can then refuse the next modal (the assistant, opened from it).
  const [vipCard, setVipCard] = useState<{
    index: number;
    anchor: VipAnchor;
    cropTop: number;
    clearAbove: number;
    open: boolean;
  } | null>(null);
  const assistant = useAIChatOverlay();

  // The card itself, measured for the VIP popover's sharp strip; the screen's
  // own `measureRef` (status popover anchoring) still gets the same node.
  const cardRef = useRef<RNView | null>(null);
  // Returns the screen ref's own cleanup: RoomRow's callback ref unregisters
  // the card from the screen's map in it, which a virtualised row that
  // scrolls away must do (React 19 calls the cleanup, not ref(null)).
  const setCardRef = useCallback(
    (node: RNView | null) => {
      cardRef.current = node;
      const cleanup = attachRef(measureRef, node);
      return () => {
        cardRef.current = null;
        cleanup();
      };
    },
    [measureRef]
  );
  const measureCardTop = () =>
    new Promise<number | null>((resolve) => {
      const node = cardRef.current;
      if (!node) return resolve(null);
      node.measureInWindow((_x, y, _w, h) => resolve(Number.isFinite(y) && h > 0 ? y : null));
    });

  // Make room below the disc (the list scrolls), then open where it now is.
  const openVip = async (index: number, measure: MeasureAnchor) => {
    const revealed = revealVip
      ? await revealVip(measure, VIP_POPOVER_SPACE)
      : await measure().then((rect) => (rect ? { rect, clearAbove: 0 } : null));
    if (!revealed) {
      endVipReveal?.();
      return;
    }
    const cropTop = (await measureCardTop()) ?? revealed.rect.y;
    setVipCard({ index, anchor: revealed.rect, cropTop, clearAbove: revealed.clearAbove, open: true });
  };
  const closeVip = () => {
    setVipCard((v) => (v ? { ...v, open: false } : v));
    endVipReveal?.();
  };
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
      priority={priority}
      onPress={onPress}
      onLayout={onLayout}
      measureRef={setCardRef}
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
          const tier = vipTierFor(guest.vipCode, vipTiers);
          return (
            <GuestRow
              key={`${guest.name}-${index}`}
              name={guest.name}
              vip={tier && guest.vipCode ? { code: guest.vipCode, tier } : undefined}
              dates={formatDatesOfStayShort(guest.datesOfStay)}
              occupancy={formatGuestCountWords(guest.guestCount)}
              timeLabel={guestTimeLabelForKind(kind, guest)}
              kind={kind}
              imageUrl={guest.imageUrl}
              onImagePress={guest.imageUrl && onGuestImagePress ? () => onGuestImagePress(guest) : undefined}
              onInfoPress={(measure) => void openVip(index, measure)}
            />
          );
        })}
      />

      <RoomCardFooter
        // Unassigned: the Assign Room pill, centred on the status pill, no label (4577:228).
        label={porter || !staff?.name ? undefined : 'Room Attendant'}
        centered={!porter && !staff?.name}
        tight={guests.length > 1}
        left={
          porter ? (
            <GuestPresence guestIn={porter.guestIn} />
          ) : !staff?.name ? (
            <AssignRoomPill roomNumber={room.roomNumber} onPress={onAssignPress} />
          ) : (
            <RoomAssigneeBlock name={staff.name} avatarUrl={staff.avatar} status={status} onPress={onAssignPress} />
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
      {(() => {
        const guest = vipCard ? guests[vipCard.index] : undefined;
        const tier = guest ? vipTierFor(guest.vipCode, vipTiers) : null;
        if (!guest || !tier) return null;
        return (
          <VipInfoPopover
            visible={!!vipCard?.open}
            onClose={closeVip}
            anchor={vipCard?.anchor ?? null}
            cropTop={vipCard?.cropTop ?? 0}
            clearAbove={vipCard?.clearAbove ?? 0}
            tier={tier}
            credits={room.credit}
            onAskAssistant={() => {
              // Close first: iOS presents one modal at a time, and SafeModal
              // holds the assistant until this one has finished hiding.
              closeVip();
              assistant.open(VIP_ASSISTANT_QUESTION);
            }}
          />
        );
      })()}
    </RoomCardShell>
  );
}

/**
 * Hands `node` to a ref of either kind and returns how to undo it — the ref's
 * own cleanup when its callback returned one (RoomRow's does: it unregisters
 * the card from the screen's map), else a call with null.
 */
function attachRef(ref: React.Ref<RNView> | undefined, node: RNView | null): () => void {
  if (typeof ref === 'function') {
    const cleanup = ref(node);
    return typeof cleanup === 'function' ? cleanup : () => ref(null);
  }
  if (ref) {
    (ref as React.MutableRefObject<RNView | null>).current = node;
    return () => {
      (ref as React.MutableRefObject<RNView | null>).current = null;
    };
  }
  return () => {};
}

export default RoomListCard;
