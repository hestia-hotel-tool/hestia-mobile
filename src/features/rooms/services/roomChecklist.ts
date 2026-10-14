/**
 * Room Checklist — what a room used from the minibar and the laundry.
 *
 * The catalogue is the hotel's `consumables` (active ones); a Submit records
 * `consumptions` against the guest staying in the room (migration
 * 20261014000200). Both go through RPCs: `room_checklist` loads the tab in one
 * call, `submit_room_checklist` is the only way to write, and is idempotent on
 * the submission id, so a retried or double-tapped Submit records once.
 */
import { supabase } from '@/lib/supabase';

export type ChecklistCatalogueItem = {
  id: string;
  name: string;
  /** 'mini_bar' | 'laundry' | … — free text in the catalogue. */
  category: string;
  /** The question the row asks ("How many bottles … were consumed?"). */
  description: string | null;
  /** A bundled picture (see constants/checklistImages). */
  imageKey: string | null;
  unitPrice: number | null;
  billable: boolean;
  /** How many are stocked; the stepper stops there. Null: no limit. */
  parLevel: number | null;
};

export type ChecklistStay = {
  reservationId: string;
  guestName: string | null;
  arrivalDate: string;
  departureDate: string;
};

export type ChecklistPerson = { id: string; fullName: string; avatarUrl: string | null };

export type ChecklistSubmission = {
  submissionId: string;
  reportedAt: string;
  reportedBy: ChecklistPerson | null;
  remarks: string | null;
  total: number | null;
  items: {
    consumableId: string;
    name: string;
    category: string;
    imageKey: string | null;
    quantity: number;
    unitPrice: number | null;
    total: number | null;
  }[];
};

export type RoomChecklist = {
  me: ChecklistPerson | null;
  /** The guest the checklist is recorded against; null when nobody is staying. */
  stay: ChecklistStay | null;
  items: ChecklistCatalogueItem[];
  /** What was recorded this stay (or, with no guest, in the last day), newest first. */
  submissions: ChecklistSubmission[];
};

// Cast: these RPCs land in 20261014000200; the generated types predate them.
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args: Record<string, unknown>
) => PromiseLike<{ data: unknown; error: { message?: string; code?: string } | null }>;

type Json = Record<string, any>;

const num = (v: unknown): number | null => (v == null ? null : Number(v));

const person = (p: Json | null | undefined): ChecklistPerson | null =>
  p && p.id ? { id: p.id, fullName: p.full_name ?? 'Staff', avatarUrl: p.avatar_url ?? null } : null;

export async function fetchRoomChecklist(roomId: string): Promise<RoomChecklist> {
  const { data, error } = await rpc('room_checklist', { p_room_id: roomId });
  if (error) throw new Error(error.message || 'The checklist could not be loaded.');
  const d = (data ?? {}) as Json;
  return {
    me: person(d.me),
    stay: d.stay
      ? {
          reservationId: d.stay.reservation_id,
          guestName: d.stay.guest_name ?? null,
          arrivalDate: d.stay.arrival_date,
          departureDate: d.stay.departure_date,
        }
      : null,
    items: ((d.items ?? []) as Json[]).map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category ?? 'other',
      description: i.description ?? null,
      imageKey: i.image_key ?? null,
      unitPrice: num(i.unit_price),
      billable: Boolean(i.billable),
      parLevel: num(i.par_level),
    })),
    submissions: ((d.submissions ?? []) as Json[]).map((s) => ({
      submissionId: s.submission_id,
      reportedAt: s.reported_at,
      reportedBy: person(s.reported_by),
      remarks: s.remarks ?? null,
      total: num(s.total),
      items: ((s.items ?? []) as Json[]).map((i) => ({
        consumableId: i.consumable_id,
        name: i.name,
        category: i.category ?? 'other',
        imageKey: i.image_key ?? null,
        quantity: Number(i.quantity) || 0,
        unitPrice: num(i.unit_price),
        total: num(i.total),
      })),
    })),
  };
}

/** A v4 UUID for the submission (idempotency key). */
export function newSubmissionId(): string {
  const hex = (n: number) =>
    Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${hex(3)}-${hex(12)}`;
}

export async function submitRoomChecklist(
  roomId: string,
  submissionId: string,
  items: { consumableId: string; quantity: number }[],
  remarks?: string | null
): Promise<{ count: number; total: number | null; duplicate: boolean }> {
  const { data, error } = await rpc('submit_room_checklist', {
    p_room_id: roomId,
    p_items: items
      .filter((i) => i.quantity > 0)
      .map((i) => ({ consumable_id: i.consumableId, quantity: i.quantity })),
    p_submission_id: submissionId,
    p_remarks: remarks?.trim() || null,
  });
  if (error) throw new Error(error.message || 'The checklist could not be submitted.');
  const d = (data ?? {}) as Json;
  return { count: Number(d.count) || 0, total: num(d.total), duplicate: Boolean(d.duplicate) };
}
