/**
 * Resolves the signed-in user's permissions once per session.
 *
 * Everything downstream — tab visibility, route guards, screen capabilities —
 * reads from the Set this holds, so a permission check is an O(1) lookup with
 * no query behind it.
 *
 * This replaces a client-side role→permission table that had to be kept in step
 * with the database by hand. The server is now the only authority: one call to
 * `get_my_permissions()`, which walks users → job_titles → roles →
 * role_permissions. Client gating remains UX only; the security boundary is RLS
 * (`auth_has_permission`).
 *
 * Fails closed. Before the fetch resolves, and on any error, the permission set
 * is empty and `isLoading` is true — consumers should show a loading state
 * rather than an empty app.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@features/auth/hooks/useAuth';
import type { Permission } from '@/domain/rbac/permissions';
import type { HomeVariant, RoomsVariant } from '@/domain/rbac/matrix';

/** The error a network or server failure leaves; only this one is retried. */
const LOAD_FAILED = 'Could not load your permissions.';
const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000];

interface PermissionContextValue {
  permissions: ReadonlySet<Permission>;
  /** Which HomeScreen layout this user sees. */
  homeVariant: HomeVariant;
  /** Which Rooms list layout this user sees. */
  roomsVariant: RoomsVariant;
  /** The user's department (their job title's), or null when unknown. */
  departmentId: string | null;
  /**
   * Laundry attendants and porters work from tickets: the app opens on
   * Tickets and their list is their own plus their department's; Rooms is
   * there for reference (client, 2026-11-09). See `worksFromTicketsFor`.
   */
  worksFromTickets: boolean;
  /**
   * In the Laundry department (laundry attendants): Tickets first in the tab
   * bar, their profile on Tickets rather than Rooms (client, 2026-11-09).
   */
  inLaundry: boolean;
  /** True until the first resolution completes. Gate on this, don't render an empty app. */
  isLoading: boolean;
  /** Set when resolution failed; the permission set is empty in that case. */
  error: string | null;
  /** Re-resolve, e.g. after an admin changes someone's job title. */
  refresh: () => Promise<void>;
}

const EMPTY: ReadonlySet<Permission> = new Set<Permission>();

const ROOMS_VARIANTS: ReadonlySet<string> = new Set<RoomsVariant>([
  'default',
  'leadership',
  'supervisor',
  'attendant',
  'front_office',
  'laundry',
]);

/**
 * Narrow the RPC's raw text to a variant this build knows, or fall back.
 *
 * `get_my_rooms_variant()` returns plain `text`, and this used to cast it
 * straight into the union. That is fine until a variant is added: the database
 * is migrated ahead of the app stores, so an older bundle reads a value it has
 * never heard of, and the screen that looks it up in a `Record<RoomsVariant, …>`
 * gets `undefined` and crashes on first property access. Falling back to the
 * flat list degrades instead.
 */
function asRoomsVariant(value: unknown): RoomsVariant {
  if (typeof value === 'string' && ROOMS_VARIANTS.has(value)) {
    return value as RoomsVariant;
  }
  if (value != null) {
    console.warn(`[PermissionProvider] unknown rooms variant "${String(value)}"; using default.`);
  }
  return 'default';
}

/*
 * Must list every member of `HomeVariant`.
 *
 * A union type has no runtime form, so this cannot be derived from it, and a
 * missing member is not a type error — `Set<HomeVariant>` only rejects values
 * that are *not* variants, never notices one left out. Anything missing here is
 * silently downgraded to `default` with a console warning, which is what
 * happened when `dining` was added.
 */
const HOME_VARIANTS: ReadonlySet<string> = new Set<HomeVariant>([
  'default',
  'engineering',
  'dining',
  'hsk_portier',
]);

/**
 * The same narrowing for `get_my_home_variant()`.
 *
 * This was a bare cast for as long as `HomeScreen` only compared the value with
 * `===`, where an unknown string harmlessly falls through to the default
 * branch. `HOME_CHROME` is a `Record<HomeVariant, …>`, so an unknown value now
 * yields `undefined` and crashes on first property access — exactly the case
 * `asRoomsVariant` above exists for.
 */
function asHomeVariant(value: unknown): HomeVariant {
  if (typeof value === 'string' && HOME_VARIANTS.has(value)) {
    return value as HomeVariant;
  }
  if (value != null) {
    console.warn(`[PermissionProvider] unknown home variant "${String(value)}"; using default.`);
  }
  return 'default';
}

/**
 * An attendant title that cannot change a room's status reads every room,
 * view only (`laundry`), not the assigned-only list.
 *
 * Rooms are only ever assigned to Room Attendants (`fetchRoomAttendants`), and
 * they are the attendants who hold `rooms.status.update`. Any other attendant
 * title on the `attendant` layout would open an empty list, which is what the
 * Laundry Attendant got until 20261030090000_rooms_variant_laundry.sql — and
 * still gets on a database that has not run it.
 */
function readOnlyAttendant(variant: RoomsVariant, keys: readonly string[]): RoomsVariant {
  return variant === 'attendant' && !keys.includes('rooms.status.update') ? 'laundry' : variant;
}

const NO_DEPARTMENT = { id: null, name: null } as const;

/**
 * Who works from tickets rather than rooms (client, 2026-11-09): porters
 * (`hsk_portier`) and the Laundry department. By department, not by the
 * `laundry` Rooms layout — Public Area attendants get that layout too
 * (`readOnlyAttendant`) and they work from rooms.
 */
export function worksFromTicketsFor(homeVariant: HomeVariant, departmentName: string | null): boolean {
  return homeVariant === 'hsk_portier' || isLaundryDepartment(departmentName);
}

function isLaundryDepartment(departmentName: string | null): boolean {
  return (departmentName ?? '').trim().toLowerCase() === 'laundry';
}

const PermissionContext = createContext<PermissionContextValue>({
  permissions: EMPTY,
  homeVariant: 'default',
  roomsVariant: 'default',
  departmentId: null,
  worksFromTickets: false,
  inLaundry: false,
  isLoading: true,
  error: null,
  refresh: async () => {},
});

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [permissions, setPermissions] = useState<ReadonlySet<Permission>>(EMPTY);
  const [homeVariant, setHomeVariant] = useState<HomeVariant>('default');
  const [roomsVariant, setRoomsVariant] = useState<RoomsVariant>('default');
  const [department, setDepartment] = useState<{ id: string | null; name: string | null }>(NO_DEPARTMENT);
  const [error, setError] = useState<string | null>(null);

  /**
   * Which user the state above describes. Loading is derived from this rather
   * than held separately, so the permissions of a previous user are never
   * reported as belonging to the current one — the same class of bug as the
   * stale cached hotel id. It also keeps the mount effect free of a synchronous
   * setState.
   */
  const [resolvedFor, setResolvedFor] = useState<string | null | undefined>(undefined);
  /**
   * Consecutive failed loads for one user; each schedules the next retry.
   * Tagged with the user so a sign-in after someone else's failures starts
   * from zero instead of retrying at once.
   */
  const [failState, setFailState] = useState<{ user: string | null; n: number }>({ user: null, n: 0 });
  const failures = failState.user === userId ? failState.n : 0;

  // Signed out, or Supabase unconfigured: nothing to resolve, so there is
  // nothing to wait for either. Deriving this instead of setting it in an effect
  // keeps the effect body free of synchronous state updates.
  const canResolve = !!userId && isSupabaseConfigured;
  // Still loading while a failed load is being retried: an empty permission
  // set then reads as "no access", which is not what is going on.
  const isLoading = canResolve && (resolvedFor !== userId || failures > 0);

  // Guards against a slow response for a previous user landing last.
  const requestFor = useRef<string | null>(null);

  const resolve = useCallback(async () => {
    const forUser = userId;
    requestFor.current = forUser;

    if (!forUser || !isSupabaseConfigured) return;

    try {
      // Cast: these RPCs land in 20260902000000_rbac_schema.sql. Drop the cast
      // once the migration is applied and `npm run db:types` has regenerated
      // src/types/supabase.ts. Same workaround as src/lib/tenant.ts.
      const rpc = supabase.rpc.bind(supabase) as (
        fn: string
      ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

      const [permissionsResult, variantResult, roomsVariantResult, accessResult] = await Promise.all([
        rpc('get_my_permissions'),
        rpc('get_my_home_variant'),
        rpc('get_my_rooms_variant'),
        // The user's department (job title first), for where the app opens.
        // Not fatal: without it a laundry attendant just opens on Rooms.
        rpc('ticket_access_for_me'),
      ]);

      if (requestFor.current !== forUser) return; // superseded

      if (permissionsResult.error) throw permissionsResult.error;
      // A failed variant lookup is a failed load too. Read as "default" it
      // gave the user the wrong Home and Rooms layout until they signed in
      // again; thrown, the back-off below retries it.
      if (variantResult.error) throw variantResult.error;
      if (roomsVariantResult.error) throw roomsVariantResult.error;

      const keys = (permissionsResult.data ?? []) as Permission[];
      setPermissions(new Set(keys));
      setHomeVariant(asHomeVariant(variantResult.data));
      setRoomsVariant(readOnlyAttendant(asRoomsVariant(roomsVariantResult.data), keys));
      const access = (accessResult.error ? null : accessResult.data) as
        | { department_id?: string | null; department_name?: string | null }
        | null;
      setDepartment({ id: access?.department_id ?? null, name: access?.department_name ?? null });
      setFailState({ user: forUser, n: 0 });
      setError(
        keys.length === 0
          ? 'This account has no job title assigned, so it has no access yet.'
          : null
      );
    } catch (err) {
      if (requestFor.current !== forUser) return;
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[PermissionProvider] failed to resolve permissions:', message);
      setPermissions(EMPTY); // fail closed
      setHomeVariant('default');
      setRoomsVariant('default');
      setDepartment(NO_DEPARTMENT);
      setError(LOAD_FAILED);
      setFailState((prev) => ({ user: forUser, n: prev.user === forUser ? prev.n + 1 : 1 }));
    } finally {
      if (requestFor.current === forUser) setResolvedFor(forUser);
    }
  }, [userId]);

  useEffect(() => {
    // resolve() is async: every setState in it runs after `await`, which the
    // rule cannot see through the useCallback. Fetch-on-mount is the intended
    // use of an effect here — we subscribe to server state keyed on the session.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void resolve();
  }, [resolve]);

  /*
   * A failed load is retried, not left standing. Failing closed is right for
   * the moment it happens, but a launch on a flaky connection ("The request
   * timed out") used to leave the user with an empty app until they restarted
   * it. Back off 2s, 5s, 15s, then every 30s while it keeps failing, and try
   * again at once when the app comes back to the foreground.
   */
  const loadFailed = canResolve && failures > 0;
  useEffect(() => {
    if (!loadFailed) return;
    const delay = RETRY_DELAYS_MS[Math.min(failures - 1, RETRY_DELAYS_MS.length - 1)];
    const timer = setTimeout(() => void resolve(), delay);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void resolve();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [loadFailed, failures, resolve]);

  const mine = canResolve && resolvedFor === userId;
  const value = useMemo<PermissionContextValue>(
    () => ({
      // Only report permissions that belong to the user asking for them.
      permissions: canResolve && resolvedFor === userId ? permissions : EMPTY,
      homeVariant: canResolve && resolvedFor === userId ? homeVariant : 'default',
      roomsVariant: canResolve && resolvedFor === userId ? roomsVariant : 'default',
      departmentId: mine ? department.id : null,
      worksFromTickets: mine ? worksFromTicketsFor(homeVariant, department.name) : false,
      inLaundry: mine ? isLaundryDepartment(department.name) : false,
      isLoading,
      error: canResolve && resolvedFor === userId ? error : null,
      refresh: resolve,
    }),
    [canResolve, resolvedFor, userId, mine, permissions, homeVariant, roomsVariant, department, isLoading, error, resolve]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissionContext() {
  return useContext(PermissionContext);
}
