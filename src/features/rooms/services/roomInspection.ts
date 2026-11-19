/**
 * Room inspection — a department's condition checklist for a room (Figma
 * 4759:225, engineering). Every item is Good, Issue or Unchecked, per service
 * day; an issue carries a note and can become a ticket.
 *
 * Not housekeeping's checklist (services/roomChecklist counts consumables).
 * Everything goes through the RPCs of migration 20261118110000:
 * `room_inspection` loads, `set_room_inspection_result` saves one mark (and,
 * for the technician, starts the round), `finish_room_inspection` completes it
 * and marks the round Checked, `raise_room_inspection_tickets` turns the open
 * issues into tickets.
 */
import { supabase } from '@/lib/supabase';
import type { AssignmentDepartment } from '@/domain/assignments';

export type InspectionResult = 'good' | 'issue';

export type InspectionItem = {
  id: string;
  /** 'electrical' | 'plumbing' | 'woodwork' | 'extras' — free text in the catalogue. */
  category: string;
  name: string;
  /** A bundled picture (constants/inspectionImages). */
  imageKey: string | null;
  sortOrder: number;
  /** Null: not checked yet. */
  result: InspectionResult | null;
  note: string | null;
  /** The ticket raised for this issue, if any. */
  ticketId: string | null;
};

export type RoomInspection = {
  serviceDay: string;
  completedAt: string | null;
  completedBy: string | null;
  items: InspectionItem[];
};

// The RPCs are newer than the generated types (see project notes on codegen drift).
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args: Record<string, unknown>
) => Promise<{ data: unknown; error: { message: string } | null }>;

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export function fetchRoomInspection(roomId: string, department: AssignmentDepartment): Promise<RoomInspection> {
  return call<RoomInspection>('room_inspection', { p_room_id: roomId, p_department: department });
}

/** Save one mark; `null` sets the item back to Unchecked. */
export function setRoomInspectionResult(
  roomId: string,
  department: AssignmentDepartment,
  itemId: string,
  result: InspectionResult | null,
  note?: string | null
): Promise<void> {
  return call<void>('set_room_inspection_result', {
    p_room_id: roomId,
    p_department: department,
    p_item_id: itemId,
    p_result: result,
    p_note: note ?? null,
  });
}

/** Every item marked → complete, and the round goes Checked. A lead acting for the technician gives a reason. */
export function finishRoomInspection(
  roomId: string,
  department: AssignmentDepartment,
  reason?: string | null
): Promise<{ issues: number }> {
  return call<{ issues: number }>('finish_room_inspection', {
    p_room_id: roomId,
    p_department: department,
    p_reason: reason ?? null,
  });
}

/** One ticket per issue that has none yet. Returns how many were raised. */
export function raiseRoomInspectionTickets(roomId: string, department: AssignmentDepartment): Promise<number> {
  return call<number>('raise_room_inspection_tickets', { p_room_id: roomId, p_department: department });
}
