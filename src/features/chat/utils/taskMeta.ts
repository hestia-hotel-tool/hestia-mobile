import type { IconName } from '@/components/Icon';

export type TaskMeta = {
  /** Heading for this kind of task — "Room flagged", "Ticket assigned". */
  label: string;
  icon: IconName;
  /** Glyph height inside the 44 disc, in design px. */
  iconSize: number;
  /** Where the task leads, if anywhere. */
  target: 'room' | 'tickets';
};

const META: Record<string, TaskMeta> = {
  room_assignment: { label: 'Room assignment', icon: 'nav-rooms', iconSize: 16, target: 'room' },
  room_flagged: { label: 'Room flagged', icon: 'action-flag', iconSize: 20, target: 'room' },
  room_priority: { label: 'Priority room', icon: 'action-priority', iconSize: 20, target: 'room' },
  room_cleaned: { label: 'Room cleaned', icon: 'action-check-bold', iconSize: 16, target: 'room' },
  room_rejected: { label: 'Room sent back', icon: 'action-return-later', iconSize: 20, target: 'room' },
  room_paused: { label: 'Cleaning on hold', icon: 'status-paused', iconSize: 20, target: 'room' },
  room_overdue: { label: 'Taking longer than expected', icon: 'action-promised-time', iconSize: 20, target: 'room' },
  room_promise: { label: 'Promise time', icon: 'action-promised-time', iconSize: 20, target: 'room' },
  ticket_assigned: { label: 'Ticket assigned', icon: 'nav-tickets', iconSize: 20, target: 'tickets' },
};

/** Label, icon and destination for a task notification type (see TASK_NOTIFICATION_TYPES). */
export function taskMeta(type: string): TaskMeta {
  return META[type] ?? { label: 'Task', icon: 'nav-rooms', iconSize: 16, target: 'room' };
}
