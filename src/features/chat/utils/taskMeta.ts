import type { IconName } from '@/components/Icon';

export type TaskMeta = {
  /** Heading for this kind of task — "Room flagged", "Ticket assigned". */
  label: string;
  icon: IconName;
  /** Glyph height inside the 44 disc, in design px. */
  iconSize: number;
  /** Where the task leads, if anywhere. */
  target: 'room' | 'tickets';
  /** The disc's colour — the state's own colour across the app (status pills, header). */
  colour: string;
  /** The glyph's colour; white unless the disc is pale. */
  glyph?: string;
};

/*
 * Each kind on its state's colour, so the list reads at a glance: blue for
 * cleaned, grey for paused, red for a flag, purple for Do Not Disturb, green
 * once something is resolved. Pale discs (priority, promise, return later)
 * carry a dark glyph, as their status pills do.
 */
const BRAND = '#5a759d';
const META: Record<string, TaskMeta> = {
  room_assignment: { label: 'Room assignment', icon: 'nav-rooms', iconSize: 16, target: 'room', colour: BRAND },
  room_flagged: { label: 'Room flagged', icon: 'action-flag', iconSize: 20, target: 'room', colour: '#f92424' },
  room_flag_updated: { label: 'Flag updated', icon: 'action-flag', iconSize: 20, target: 'room', colour: '#f92424' },
  room_unflagged: { label: 'Flag removed', icon: 'action-flag', iconSize: 20, target: 'room', colour: '#9aa7bd' },
  room_priority: { label: 'Priority room', icon: 'action-priority', iconSize: 20, target: 'room', colour: '#ffebeb', glyph: '#f92424' },
  room_cleaned: { label: 'Room cleaned', icon: 'status-clean', iconSize: 20, target: 'room', colour: '#4a91fc' },
  room_rejected: { label: 'Room sent back', icon: 'status-dirty', iconSize: 18, target: 'room', colour: '#ff7a45' },
  room_paused: { label: 'Cleaning on hold', icon: 'status-paused-vacuum', iconSize: 22, target: 'room', colour: '#b0c0c6' },
  room_overdue: { label: 'Taking longer than expected', icon: 'action-promised-time', iconSize: 20, target: 'room', colour: '#f59e0b' },
  room_promise: { label: 'Promise time', icon: 'action-promised-time', iconSize: 20, target: 'room', colour: '#fcf1cf', glyph: '#3f4c5f' },
  room_dnd: { label: 'Do Not Disturb', icon: 'action-dnd', iconSize: 20, target: 'room', colour: '#7c46ef' },
  room_dnd_check: { label: 'Check the DND sign', icon: 'action-dnd', iconSize: 20, target: 'room', colour: '#7c46ef' },
  room_dnd_cleared: { label: 'Do Not Disturb removed', icon: 'action-dnd', iconSize: 20, target: 'room', colour: '#41d541' },
  room_dnd_welfare: { label: 'DND welfare check', icon: 'action-dnd', iconSize: 20, target: 'room', colour: '#7c46ef' },
  room_refused: { label: 'Service refused', icon: 'action-refuse-service', iconSize: 20, target: 'room', colour: '#ff9090' },
  room_service_resumed: { label: 'Service back on', icon: 'action-refuse-service', iconSize: 20, target: 'room', colour: '#41d541' },
  room_return_later: { label: 'Return later', icon: 'action-return-later', iconSize: 20, target: 'room', colour: '#ead7f6', glyph: BRAND },
  room_return_due: { label: 'Time to go back', icon: 'action-return-later', iconSize: 20, target: 'room', colour: '#ead7f6', glyph: BRAND },
  room_return_overdue: { label: 'Return later missed', icon: 'action-return-later', iconSize: 20, target: 'room', colour: '#f92424' },
  ticket_assigned: { label: 'Ticket assigned', icon: 'nav-tickets', iconSize: 20, target: 'tickets', colour: '#334866' },
};

/** Label, icon and destination for a task notification type (see TASK_NOTIFICATION_TYPES). */
export function taskMeta(type: string): TaskMeta {
  return META[type] ?? { label: 'Task', icon: 'nav-rooms', iconSize: 16, target: 'room', colour: BRAND };
}
