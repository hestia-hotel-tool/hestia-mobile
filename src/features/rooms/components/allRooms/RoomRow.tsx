import React, { useCallback } from 'react';
import { View } from 'react-native';
import type { RoomCardData } from '../../types/allRooms.types';
import type { ShiftType } from '@/types/shift.types';

/**
 * One row of the Rooms list, memoised.
 *
 * The screen used to build each card inline, which gave every card four fresh
 * closures on every render of a 1,200-line screen — including the two `ref`
 * callbacks, the expensive ones: a new identity makes React detach and
 * re-attach the ref on each commit, and the card forces `collapsable={false}`,
 * so those are real native views being churned.
 *
 * Memoising only pays off if the props hold still, so everything this takes is
 * either the room itself or a stable callback owned by the screen. The
 * per-card closures are rebuilt here instead, where they are scoped to one room
 * and only change when that room does.
 *
 * What this buys, beyond scroll: tab screens are frozen on blur, so returning
 * to Rooms re-renders the whole tree. With the cards memoised and their props
 * unchanged, every one of them bails out and the tab switch costs a handful of
 * fibers instead of the whole list.
 *
 * Both card shapes live here rather than in two components, because the choice
 * between them is per-variant chrome, not per-row, and splitting it would mean
 * two memo boundaries to keep in step.
 */
export type RoomRowProps = {
  room: RoomCardData;
  /** `chrome.rebuiltCard` — which card shape this variant draws. */
  rebuilt: boolean;
  selectedShift: ShiftType | undefined;
  /** Omitted for a reader who may not change housekeeping status. */
  canChangeStatus: boolean;
  isChangingStatus: boolean;
  isAssigningStaff: boolean;
  onPress: (room: RoomCardData) => void;
  onStatusPress: (room: RoomCardData) => void;
  onAssignPress: (room: RoomCardData) => void;
  /** The screen keeps the ref maps, for the status popover's anchoring. */
  registerCardRef: (roomId: string, ref: unknown) => void;
  registerPillRef: (roomId: string, ref: View | null) => void;
  /** Injected so this file does not import the screen's card components. */
  RebuiltCard: React.ComponentType<any>;
  LegacyCard: React.ComponentType<any>;
  /** The rebuilt card's slot style, owned by the screen's stylesheet. */
  slotStyle?: any;
};

function RoomRowInner({
  room,
  rebuilt,
  selectedShift,
  canChangeStatus,
  isChangingStatus,
  isAssigningStaff,
  onPress,
  onStatusPress,
  onAssignPress,
  registerCardRef,
  registerPillRef,
  RebuiltCard,
  LegacyCard,
  slotStyle,
}: RoomRowProps) {
  const handlePress = useCallback(() => onPress(room), [onPress, room]);
  const handleStatusPress = useCallback(() => onStatusPress(room), [onStatusPress, room]);
  const handleAssignPress = useCallback(() => onAssignPress(room), [onAssignPress, room]);

  const measureRef = useCallback(
    (ref: unknown) => {
      if (ref) registerCardRef(room.id, ref);
    },
    [registerCardRef, room.id]
  );
  const pillRef = useCallback(
    (ref: View | null) => {
      if (ref) registerPillRef(room.id, ref);
    },
    [registerPillRef, room.id]
  );

  if (rebuilt) {
    return (
      <View style={slotStyle}>
        <RebuiltCard
          room={room}
          onPress={handlePress}
          onStatusPress={canChangeStatus ? handleStatusPress : undefined}
          onAssignPress={handleAssignPress}
          isChangingStatus={isChangingStatus}
          measureRef={measureRef}
          statusPillRef={pillRef}
        />
      </View>
    );
  }

  return (
    <LegacyCard
      ref={measureRef}
      room={room}
      onPress={handlePress}
      onStatusPress={canChangeStatus ? handleStatusPress : undefined}
      // The legacy card calls this with the room, so it takes the screen's
      // handler directly rather than the per-row closure.
      onAssignStaffPress={onAssignPress}
      statusButtonRef={pillRef}
      selectedShift={selectedShift}
      isChangingStatus={isChangingStatus}
      isAssigningStaff={isAssigningStaff}
    />
  );
}

export const RoomRow = React.memo(RoomRowInner);

export default RoomRow;
