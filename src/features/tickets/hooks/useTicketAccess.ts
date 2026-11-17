import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@features/auth/hooks/useAuth';
import {
  canReassignTicket,
  canResolveTicket,
  fetchTicketAccess,
  type TicketAccess,
  type TicketRef,
} from '../services/ticketAccess';

/**
 * The signed-in person's ticket rights — see services/ticketAccess.ts.
 * Until loaded, nothing is allowed: a control appearing a moment late is
 * better than one that appears and then errors.
 */
export function useTicketAccess() {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const [access, setAccess] = useState<TicketAccess | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchTicketAccess(userId).then((a) => {
      if (!cancelled) setAccess(a);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const canResolve = useCallback((t: TicketRef) => !!access && canResolveTicket(access, t), [access]);
  const canReassign = useCallback((t: TicketRef) => !!access && canReassignTicket(access, t), [access]);

  return { access, canResolve, canReassign };
}
