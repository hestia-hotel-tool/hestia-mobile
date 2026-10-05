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
  // Figma 4378:174: a flag is the pale red disc (#fb5b5b at 15%) with a red flag.
  // `action-flag` is the priority runner, not a flag — the flag is `-outline`.
  room_flagged: { label: 'Room flagged', icon: 'action-flag-outline', iconSize: 20, target: 'room', colour: '#fee6e6', glyph: '#f92424' },
  room_flag_updated: { label: 'Flag updated', icon: 'action-flag-outline', iconSize: 20, target: 'room', colour: '#fee6e6', glyph: '#f92424' },
  room_unflagged: { label: 'Flag removed', icon: 'action-flag-outline', iconSize: 20, target: 'room', colour: '#9aa7bd' },
  room_priority: { label: 'Priority room', icon: 'action-priority', iconSize: 20, target: 'room', colour: '#ffebeb', glyph: '#f92424' },
  room_cleaned: { label: 'Room cleaned', icon: 'status-clean', iconSize: 20, target: 'room', colour: '#4a91fc' },
  room_rejected: { label: 'Room sent back', icon: 'status-dirty', iconSize: 18, target: 'room', colour: '#ff7a45' },
  // Figma 4378:174: started is the In Progress yellow with the vacuum, paused the same vacuum on grey.
  room_started: { label: 'Cleaning started', icon: 'status-in-progress', iconSize: 22, target: 'room', colour: '#f0be1b' },
  room_paused: { label: 'Room Paused', icon: 'status-paused-vacuum', iconSize: 22, target: 'room', colour: '#b0c0c6' },
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
  // Figma 4378:174: a ticket is red.
  ticket_assigned: { label: 'Ticket assigned', icon: 'nav-tickets', iconSize: 20, target: 'tickets', colour: '#f92424' },
  ticket_tag: { label: 'Tagged on a ticket', icon: 'nav-tickets', iconSize: 20, target: 'tickets', colour: '#f92424' },
};

/** Label, icon and destination for a task notification type (see TASK_NOTIFICATION_TYPES). */
export function taskMeta(type: string): TaskMeta {
  return META[type] ?? { label: 'Task', icon: 'nav-rooms', iconSize: 16, target: 'room', colour: BRAND };
}

const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full;

/**
 * The row's headline — Figma 4378:174: who did what to which room, short.
 * "Amara Okafor cleaned Room 408." reads "Amara Cleaned 408"; a flag reads
 * "Room 305 Flagged"; an assigned ticket "Ticket Assigned to you". Built from
 * the notification's own sentence, so it falls back to the title for any
 * kind it does not recognise.
 */
export function taskHeadline(type: string, title: string, body: string): string {
  const room = body.match(/Room\s+([\w-]+)/i)?.[1];
  const actor = body.match(/^(.+?)\s+(cleaned|paused|inspected|started cleaning)\s+Room/i);
  if (actor) {
    // As the frame writes them: "Etleva Cleaned 408", "Maria paused 401",
    // "Maria started cleaning 202".
    const said = actor[2].toLowerCase();
    const verb = said === 'cleaned' ? 'Cleaned' : said === 'inspected' ? 'Inspected' : said;
    return `${firstName(actor[1])} ${verb} ${room ?? ''}`.trim();
  }
  switch (type) {
    case 'room_flagged':
      return room ? `Room ${room} Flagged` : title;
    case 'room_unflagged':
      return room ? `Room ${room} Unflagged` : title;
    case 'ticket_assigned':
      return 'Ticket Assigned to you';
    case 'ticket_tag':
      return 'Tagged on a ticket';
    default:
      return room && !title.includes(room) ? `${title} · ${room}` : title;
  }
}
