import { supabase } from '@/lib/supabase';

/**
 * Who may resolve and reassign which ticket (migration 20261026090000).
 *
 *   Resolve  (status)   — people in the ticket's department.
 *   Reassign (assignee) — that department's leads, to someone in it.
 *   Hotel-wide          — the Hotel Manager and platform admins: both, anywhere.
 *   No department       — older tickets: their author or tickets.manage.
 *
 * The database enforces this in `_tickets_guard_edit`; the app uses the same
 * rules only to hide controls a person cannot use, so nobody taps into an
 * error. Loaded once per signed-in user (`ticket_access_for_me`).
 */
export type TicketAccess = {
  userId: string | null;
  departmentId: string | null;
  departmentName: string | null;
  isLead: boolean;
  hotelWide: boolean;
  canManage: boolean;
};

export type TicketRef = {
  departmentId?: string | null;
  createdById?: string | null;
};

const NONE: TicketAccess = {
  userId: null,
  departmentId: null,
  departmentName: null,
  isLead: false,
  hotelWide: false,
  canManage: false,
};

let cache: { userId: string; promise: Promise<TicketAccess> } | null = null;

/** Forget the cached answer (sign-out, switching user). */
export function clearTicketAccessCache(): void {
  cache = null;
}

export function fetchTicketAccess(userId: string | null): Promise<TicketAccess> {
  if (!userId) return Promise.resolve(NONE);
  if (cache?.userId === userId) return cache.promise;
  const promise = (async () => {
    // Cast: ticket_access_for_me postdates the generated types.
    const { data, error } = await (supabase as any).rpc('ticket_access_for_me');
    if (error || !data) {
      if (__DEV__) console.warn('[ticketAccess] could not load', error?.message);
      cache = null; // try again next time
      return { ...NONE, userId };
    }
    const d = data as Record<string, unknown>;
    return {
      userId,
      departmentId: (d.department_id as string | null) ?? null,
      departmentName: (d.department_name as string | null) ?? null,
      isLead: d.is_lead === true,
      hotelWide: d.hotel_wide === true,
      canManage: d.can_manage === true,
    };
  })();
  cache = { userId, promise };
  return promise;
}

/** May this person change the ticket's status (resolve it)? */
export function canResolveTicket(access: TicketAccess, ticket: TicketRef): boolean {
  if (access.hotelWide) return true;
  if (!ticket.departmentId) return access.canManage || (!!access.userId && ticket.createdById === access.userId);
  return !!access.departmentId && access.departmentId === ticket.departmentId;
}

/** May this person change who the ticket is assigned to? */
export function canReassignTicket(access: TicketAccess, ticket: TicketRef): boolean {
  if (access.hotelWide) return true;
  if (!ticket.departmentId) return access.canManage || (!!access.userId && ticket.createdById === access.userId);
  return access.isLead && !!access.departmentId && access.departmentId === ticket.departmentId;
}
