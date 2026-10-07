import { useCallback } from 'react';

import { PERMISSIONS } from '@/domain/rbac/permissions';
import { usePermissions } from '@/domain/rbac/usePermissions';
import { useAuth } from '@features/auth/hooks/useAuth';
import type { RoomCardData, StatusChangeOption } from '../types/allRooms.types';
import {
  allowedStatusOptions,
  isWithinUndoWindow,
  roomStateOf,
  type ResolvedOption,
  type RoomState,
  type RoomStatusCaller,
} from '../utils/roomStatusMachine';
import { useRoomStatusConfig } from './useRoomStatusConfig';

export type RoomStatusAccess = {
  state: RoomState;
  caller: RoomStatusCaller;
  /** The status options this reader may use, and how (as assignee, inspector or override). */
  allowed: Map<StatusChangeOption, ResolvedOption>;
};

/**
 * What the signed-in person may do to a room's status — the client half of
 * `room_action()`. Both the Rooms list and Room Detail build their status
 * menu from this, so the two screens offer the same thing for the same room.
 */
export function useRoomStatusAccess() {
  const { can } = usePermissions();
  const { session } = useAuth();
  const { rules, undoSeconds } = useRoomStatusConfig();
  const me = session?.user?.id ?? null;

  const canUpdateOwn = can(PERMISSIONS.ROOMS_STATUS_UPDATE);
  const canInspect = can(PERMISSIONS.ROOMS_INSPECT);
  const canOverride = can(PERMISSIONS.ROOMS_STATUS_OVERRIDE);

  /**
   * `assigneeId` overrides the room's own attendant — Room Detail knows the
   * assignee from its own load, which can be fresher than the card's.
   */
  const accessFor = useCallback(
    (room: RoomCardData, assigneeId?: string | null): RoomStatusAccess => {
      const assignee = assigneeId !== undefined ? assigneeId : room.roomAttendantAssigned?.userId ?? null;
      const caller: RoomStatusCaller = {
        canUpdateOwn,
        canInspect,
        canOverride,
        isAssignee: !!me && assignee === me,
        roomHasAssignee: !!assignee,
      };
      const state = roomStateOf(room);
      const withinUndo = isWithinUndoWindow(room.inProgressStartedAt, undoSeconds);
      return { state, caller, allowed: allowedStatusOptions(state, caller, rules, withinUndo) };
    },
    [canUpdateOwn, canInspect, canOverride, me, rules, undoSeconds]
  );

  return {
    accessFor,
    /** Anyone who could act on a room's status at all. */
    canChangeAnyStatus: canUpdateOwn || canInspect || canOverride,
    canInspect,
  };
}

export default useRoomStatusAccess;
