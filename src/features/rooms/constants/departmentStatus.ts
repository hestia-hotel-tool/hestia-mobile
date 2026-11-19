import type { IconName } from '@/components/Icon';
import type { DepartmentRoomStatus } from '../types/allRooms.types';

/**
 * How each engineering round status looks on the room card's pill and in the
 * status menu — housekeeping's analogy (user, 2026-11-18): Unchecked is its
 * Dirty red, In Progress its amber, Paused its grey, Checked its Inspected
 * green; Priority is the same red runner pill.
 *
 * The glyphs are Figma 4686:686 (Change Status) and 4759:820 (Room Detail):
 * Uncheck the thumbs-down, In Progress the clock-reset, Checked the thumbs-up.
 * The thumbs are two-tone by design (white body, edge in the disc's colour),
 * so a tint does not reach them. Paused is still PROVISIONAL — no frame
 * shows it yet.
 */
export const DEPARTMENT_STATUS_APPEARANCE: Record<
  DepartmentRoomStatus,
  { label: string; color: string; icon: IconName; glyphHeight: number }
> = {
  unchecked: { label: 'Uncheck', color: '#f92424', icon: 'action-thumbs-down', glyphHeight: 25.5 },
  in_progress: { label: 'In Progress', color: '#F0BE1B', icon: 'action-time-reset', glyphHeight: 24 },
  paused: { label: 'Paused', color: '#b0c0c6', icon: 'status-pause-circle', glyphHeight: 28 },
  checked: { label: 'Checked', color: '#41d541', icon: 'action-thumbs-up', glyphHeight: 25.5 },
};
