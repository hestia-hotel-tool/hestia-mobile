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
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@features/auth';
import type { Permission } from '@/domain/rbac/permissions';
import type { HomeVariant, RoomsVariant } from '@/domain/rbac/matrix';

interface PermissionContextValue {
  permissions: ReadonlySet<Permission>;
  /** Which HomeScreen layout this user sees. */
  homeVariant: HomeVariant;
  /** Which Rooms list layout this user sees. */
  roomsVariant: RoomsVariant;
  /** True until the first resolution completes. Gate on this, don't render an empty app. */
  isLoading: boolean;
  /** Set when resolution failed; the permission set is empty in that case. */
  error: string | null;
  /** Re-resolve, e.g. after an admin changes someone's job title. */
  refresh: () => Promise<void>;
}

const EMPTY: ReadonlySet<Permission> = new Set<Permission>();

const PermissionContext = createContext<PermissionContextValue>({
  permissions: EMPTY,
  homeVariant: 'default',
  roomsVariant: 'default',
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
  const [error, setError] = useState<string | null>(null);

  /**
   * Which user the state above describes. Loading is derived from this rather
   * than held separately, so the permissions of a previous user are never
   * reported as belonging to the current one — the same class of bug as the
   * stale cached hotel id. It also keeps the mount effect free of a synchronous
   * setState.
   */
  const [resolvedFor, setResolvedFor] = useState<string | null | undefined>(undefined);

  // Signed out, or Supabase unconfigured: nothing to resolve, so there is
  // nothing to wait for either. Deriving this instead of setting it in an effect
  // keeps the effect body free of synchronous state updates.
  const canResolve = !!userId && isSupabaseConfigured;
  const isLoading = canResolve && resolvedFor !== userId;

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

      const [permissionsResult, variantResult, roomsVariantResult] = await Promise.all([
        rpc('get_my_permissions'),
        rpc('get_my_home_variant'),
        rpc('get_my_rooms_variant'),
      ]);

      if (requestFor.current !== forUser) return; // superseded

      if (permissionsResult.error) throw permissionsResult.error;

      const keys = (permissionsResult.data ?? []) as Permission[];
      setPermissions(new Set(keys));
      setHomeVariant((variantResult.data as HomeVariant | null) ?? 'default');
      setRoomsVariant((roomsVariantResult.data as RoomsVariant | null) ?? 'default');
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
      setError('Could not load your permissions.');
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

  const value = useMemo<PermissionContextValue>(
    () => ({
      // Only report permissions that belong to the user asking for them.
      permissions: canResolve && resolvedFor === userId ? permissions : EMPTY,
      homeVariant: canResolve && resolvedFor === userId ? homeVariant : 'default',
      roomsVariant: canResolve && resolvedFor === userId ? roomsVariant : 'default',
      isLoading,
      error: canResolve ? error : null,
      refresh: resolve,
    }),
    [canResolve, resolvedFor, userId, permissions, homeVariant, roomsVariant, isLoading, error, resolve]
  );

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissionContext() {
  return useContext(PermissionContext);
}
