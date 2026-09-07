import { isRoomPaused, STATUS_CONFIGS } from '../types/allRooms.types';
import type { RoomCardData } from '../types/allRooms.types';

/**
 * The bands the supervisor Rooms list is divided into — Figma 3838:1117, top to
 * bottom.
 */
export type RoomGroupKey =
  | 'paused'
  | 'inProgress'
  | 'priority'
  | 'dirty'
  | 'cleaned'
  | 'inspected';

export interface RoomGroup {
  key: RoomGroupKey;
  label: string;
  /** Section heading colour, and the header strip fill when the group is pinned. */
  color: string;
  rooms: RoomCardData[];
}

/**
 * Order is also precedence: a room lands in the first band it qualifies for.
 *
 * That matters because the bands overlap in the data. Paused is an overlay on
 * In Progress rather than a status of its own, and any room can be flagged
 * priority regardless of how clean it is — so without a fixed order the same
 * room would appear twice.
 */
const GROUP_ORDER: readonly RoomGroupKey[] = [
  'paused',
  'inProgress',
  'priority',
  'dirty',
  'cleaned',
  'inspected',
];

const GROUP_LABEL: Record<RoomGroupKey, string> = {
  paused: 'Paused',
  inProgress: 'In Progress',
  priority: 'Priority',
  dirty: 'Dirty',
  cleaned: 'Cleaned',
  inspected: 'Inspected',
};

const GROUP_COLOR: Record<RoomGroupKey, string> = {
  paused: STATUS_CONFIGS.Paused.color,
  inProgress: STATUS_CONFIGS.InProgress.color,
  // Priority is a call to action, not a cleanliness state; it borrows Dirty's red.
  priority: STATUS_CONFIGS.Dirty.color,
  dirty: STATUS_CONFIGS.Dirty.color,
  cleaned: STATUS_CONFIGS.Cleaned.color,
  inspected: STATUS_CONFIGS.Inspected.color,
};

/** Which band a room belongs to. Exported so a caller can highlight one room. */
export function roomGroupKey(room: RoomCardData): RoomGroupKey {
  if (isRoomPaused(room)) return 'paused';
  if (room.houseKeepingStatus === 'InProgress') return 'inProgress';
  if (room.isPriority) return 'priority';
  switch (room.houseKeepingStatus) {
    case 'Cleaned':
      return 'cleaned';
    case 'Inspected':
      return 'inspected';
    case 'Dirty':
    default:
      return 'dirty';
  }
}

/**
 * Split rooms into the supervisor list's bands, in display order.
 *
 * Empty bands are dropped — a heading with nothing under it reads as a loading
 * failure, and with filters applied most bands are usually empty.
 */
export function groupRoomsByStatus(rooms: readonly RoomCardData[]): RoomGroup[] {
  const buckets = new Map<RoomGroupKey, RoomCardData[]>();
  for (const room of rooms) {
    const key = roomGroupKey(room);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(room);
    else buckets.set(key, [room]);
  }

  return GROUP_ORDER.flatMap((key) => {
    const groupRooms = buckets.get(key);
    if (!groupRooms || groupRooms.length === 0) return [];
    return [{ key, label: GROUP_LABEL[key], color: GROUP_COLOR[key], rooms: groupRooms }];
  });
}
