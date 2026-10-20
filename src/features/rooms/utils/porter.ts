import { colors } from '@/theme';
import type { RoomCardData, RoomDisplayStatus } from '../types/allRooms.types';
import type { RoomGroup } from './roomGroups';

/**
 * The porter round — Figma 3859:1041.
 *
 * A porter walks the rooms (rubbish, items left behind) and marks each one.
 * That mark is the porter's own, kept apart from the room's cleaning status
 * (`porter_room_checks`, migration 20261019130000): no mark is UnChecked.
 */
export type PorterStatus = 'unchecked' | 'in_progress' | 'paused' | 'checked';
export type PorterAction = 'start' | 'pause' | 'resume' | 'check' | 'uncheck';

export type PorterCheck = {
  status: Exclude<PorterStatus, 'unchecked'>;
  userId: string | null;
  userName: string | null;
  startedAt: string | null;
  pausedAt: string | null;
  checkedAt: string | null;
};

/** Pill and band colours: the room statuses' palette, so the two lists read alike. */
export const PORTER_STATUS_UI: Record<PorterStatus, { label: string; color: string }> = {
  unchecked: { label: 'UnChecked', color: colors.status.dirty },
  in_progress: { label: 'In Progress', color: colors.status.inProgress },
  paused: { label: 'Paused', color: colors.status.paused },
  checked: { label: 'Checked', color: colors.status.cleaned },
};

/** What a porter may do next from a status — offered in this order. */
export function porterActionsFor(status: PorterStatus): { action: PorterAction; label: string; destructive?: boolean }[] {
  switch (status) {
    case 'unchecked':
      return [
        { action: 'start', label: 'Start (In Progress)' },
        { action: 'check', label: 'Mark Checked' },
      ];
    case 'in_progress':
      return [
        { action: 'check', label: 'Mark Checked' },
        { action: 'pause', label: 'Pause' },
      ];
    case 'paused':
      return [
        { action: 'resume', label: 'Resume' },
        { action: 'check', label: 'Mark Checked' },
      ];
    case 'checked':
      return [{ action: 'uncheck', label: 'Undo — set UnChecked', destructive: true }];
  }
}

/** The status an action leads to (for the optimistic update). */
export function porterStatusAfter(action: PorterAction): PorterStatus {
  switch (action) {
    case 'start':
    case 'resume':
      return 'in_progress';
    case 'pause':
      return 'paused';
    case 'check':
      return 'checked';
    case 'uncheck':
      return 'unchecked';
  }
}

/**
 * Is a guest staying in the room now — "Guest in" (green) vs "Guest Out"
 * (red) on the porter's card. In-house is what the reservation says: occupied
 * or checked in, including a guest due out today who has not left yet.
 */
const IN_HOUSE = new Set(['occupied', 'checked in', 'due out', 'due in / due out', 'due out / out of order']);
export function isGuestIn(room: Pick<RoomCardData, 'guests' | 'reservationStatus'>): boolean {
  if (!room.guests || room.guests.length === 0) return false;
  return IN_HOUSE.has(String(room.reservationStatus ?? '').trim().toLowerCase());
}

/**
 * The porter list's bands, top to bottom: what is being done, what was
 * stopped, the priority rooms still to do, then Checked and UnChecked (the
 * order of Figma 3859:1041). Empty bands are dropped.
 */
export function groupRoomsForPorter(
  rooms: readonly RoomCardData[],
  statusOf: (roomId: string) => PorterStatus
): RoomGroup[] {
  const bands: { key: RoomGroup['key']; label: string; color: string; rooms: RoomCardData[] }[] = [
    { key: 'inProgress', label: 'In Progress', color: PORTER_STATUS_UI.in_progress.color, rooms: [] },
    { key: 'paused', label: 'Paused', color: PORTER_STATUS_UI.paused.color, rooms: [] },
    { key: 'priority', label: 'Priority', color: colors.status.dirty, rooms: [] },
    { key: 'checked', label: 'Checked', color: PORTER_STATUS_UI.checked.color, rooms: [] },
    { key: 'unchecked', label: 'UnChecked', color: PORTER_STATUS_UI.unchecked.color, rooms: [] },
  ];
  const byKey = new Map(bands.map((b) => [b.key, b]));
  for (const room of rooms) {
    const status = statusOf(room.id);
    const key =
      status === 'in_progress'
        ? 'inProgress'
        : status === 'paused'
          ? 'paused'
          : status === 'checked'
            ? 'checked'
            : room.isPriority
              ? 'priority'
              : 'unchecked';
    byKey.get(key)!.rooms.push(room);
  }
  return bands.filter((b) => b.rooms.length > 0);
}

/** The card style a porter status borrows: done, being done, stopped, to do. */
export const PORTER_SPEC_STATUS: Record<PorterStatus, RoomDisplayStatus> = {
  checked: 'Cleaned',
  in_progress: 'InProgress',
  paused: 'Paused',
  unchecked: 'Dirty',
};
