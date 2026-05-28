import { supabase, isSupabaseConfigured } from '@shared/lib/supabase';
import type { HistoryEvent } from '../types/roomDetail.types';
import type { TablesInsert } from '@shared/types/supabase';
import { getActivityLogsForRecord, logActivity } from '@shared/lib/activityLogs';

type RoomHistoryInsert = TablesInsert<'room_history'>;

function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function safeInitials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  const initials = parts.map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return initials || '?';
}

function formatTimeForHuman(isoOrDate: string | Date): string {
  const dt = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (!Number.isFinite(dt.getTime())) return '';
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function snippet(text: string, maxLen = 64): string {
  const t = (text ?? '').trim().replace(/\s+/g, ' ');
  if (!t) return '';
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1)}…`;
}

export type RoomHistoryEventType =
  | 'housekeeping_status'
  | 'priority'
  | 'flag'
  | 'return_later'
  | 'promise_time'
  | 'refuse_service'
  | 'note'
  | 'task'
  | 'assignment'
  | 'ticket'
  | 'checklist'
  | 'lost_and_found'
  | string;

export function buildFriendlyRoomHistoryMessage(input: {
  type: RoomHistoryEventType;
  roomNumber?: string;
  housekeepingStatus?: string;
  priority?: 'high' | 'normal';
  flagged?: boolean;
  returnLaterAtIso?: string | null;
  promiseTimeLabel?: string;
  refuseReason?: string;
  noteText?: string;
  taskText?: string;
  assignedToName?: string;
  ticketTitle?: string;
}): string {
  switch (input.type) {
    case 'housekeeping_status': {
      const s = (input.housekeepingStatus ?? '').trim();
      return s ? `Updated housekeeping status to ${s}` : 'Updated housekeeping status';
    }
    case 'priority': {
      if (input.priority === 'high') return 'Marked the room as priority';
      if (input.priority === 'normal') return 'Removed the priority mark';
      return 'Updated room priority';
    }
    case 'flag': {
      if (input.flagged === true) return 'Flagged the room';
      if (input.flagged === false) return 'Removed the room flag';
      return 'Updated room flag';
    }
    case 'return_later': {
      const t = input.returnLaterAtIso ? formatTimeForHuman(input.returnLaterAtIso) : '';
      return t ? `Set Return Later for ${t}` : 'Set Return Later';
    }
    case 'promise_time': {
      const label = (input.promiseTimeLabel ?? '').trim();
      return label ? `Set promise time to ${label}` : 'Set a promise time';
    }
    case 'refuse_service': {
      const r = snippet(input.refuseReason ?? '', 80);
      return r ? `Refused service (${r})` : 'Refused service';
    }
    case 'note': {
      const s = snippet(input.noteText ?? '', 80);
      return s ? `Added a note: “${s}”` : 'Added a note';
    }
    case 'task': {
      const s = snippet(input.taskText ?? '', 80);
      return s ? `Added a task: “${s}”` : 'Added a task';
    }
    case 'assignment': {
      const n = (input.assignedToName ?? '').trim();
      return n ? `Assigned the room to ${n}` : 'Updated room assignment';
    }
    case 'ticket': {
      const title = snippet(input.ticketTitle ?? '', 80);
      return title ? `Created a ticket: ${title}` : 'Created a ticket';
    }
    default:
      return 'Updated room';
  }
}

export async function logRoomHistoryEvent(input: {
  roomId: string;
  type: RoomHistoryEventType;
  description?: string | null;
  eventId?: string | null;
  reservationId?: string | null;
  guestId?: string | null;
  attachments?: unknown;
}): Promise<void> {
  if (!input.roomId || !isValidUUID(input.roomId)) return;

  const action = (input.description ?? '').trim() || buildFriendlyRoomHistoryMessage({ type: input.type });

  // 1) Globalized audit log (single source of truth for "room actions")
  await logActivity({
    action,
    tableName: 'rooms',
    recordId: input.roomId,
  });

  // 2) Back-compat / storage: keep using room_history for attachments (ticket photos)
  // so tickets screen can still hydrate images from room_history.attachments.
  const attachments = input.attachments as any;
  const shouldWriteRoomHistory =
    input.type === 'ticket' || (Array.isArray(attachments) && attachments.length > 0);
  if (!shouldWriteRoomHistory) return;

  if (!isSupabaseConfigured) return;

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id ?? null;

  const payload: RoomHistoryInsert = {
    room_id: input.roomId,
    user_id: userId,
    event_type: input.type,
    event_id: input.eventId ?? null,
    reservation_id: input.reservationId ?? null,
    guest_id: input.guestId ?? null,
    description: action,
    attachments: attachments ?? [],
  };

  const { error } = await supabase.from('room_history').insert(payload);
  if (error) {
    // Non-blocking: history should never break the primary workflow.
    console.warn('[roomHistory] Failed to insert room_history:', error.message, error.code);
  }
}

export async function getRoomHistoryEvents(roomId: string): Promise<HistoryEvent[]> {
  if (!roomId || !isValidUUID(roomId)) return [];

  // Read from the global activity logs table for the Room Detail History UI.
  const rows = await getActivityLogsForRecord({ tableName: 'rooms', recordId: roomId, limit: 300 });

  return rows
    .map((row) => {
      const createdAt = row.created_at ?? new Date().toISOString();
      const ts = new Date(createdAt);
      const staffName = row.users?.full_name ?? 'Staff';
      const avatarUrl = row.users?.avatar_url ?? undefined;
      const action = (row.action ?? '').trim() || 'Updated room';

      return {
        id: row.id,
        action,
        staff: {
          id: row.user_id ?? 'unknown',
          name: staffName,
          avatar: avatarUrl ? { uri: avatarUrl } : undefined,
          initials: safeInitials(staffName),
        },
        timestamp: Number.isFinite(ts.getTime()) ? ts : new Date(),
        createdAt,
      } satisfies HistoryEvent;
    })
    .filter(Boolean);
}

