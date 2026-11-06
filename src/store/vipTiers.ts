import { useEffect, useSyncExternalStore } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEFAULT_VIP_TIERS, type VipTier, type VipTierLevel } from '@/domain/vip';

/**
 * The hotel's VIP tiers (`vip_tiers`, migration 20261106120000), shared by
 * every room card, filter and list that shows a VIP code.
 *
 * Starts as `DEFAULT_VIP_TIERS` — what the migration seeds — so a card is
 * right before the fetch lands, and stays right if the migration has not run
 * yet. Every card subscribes (`useVipTiers`), so a hotel's own tiers repaint
 * memoised rows too once they arrive.
 *
 * Plain module state, like `bottomTabBadgeCounts`: a leaf module, so
 * `resetTenantScopedStores` can clear it without an import cycle.
 */

let tiers: readonly VipTier[] = DEFAULT_VIP_TIERS;
let loading: Promise<void> | null = null;
let loaded = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

type Row = { tier: number; name: string; color: string; min_code: number; max_code: number; active: boolean };

// Cast: the table postdates the generated types.
const db = () => supabase as unknown as { from: (t: string) => any };

/** Load the hotel's tiers once per sign-in. Safe to call often. */
export function ensureVipTiers(): Promise<void> {
  if (loaded || !isSupabaseConfigured) return Promise.resolve();
  if (loading) return loading;
  loading = (async () => {
    try {
      const { data, error } = await db()
        .from('vip_tiers')
        .select('tier, name, color, min_code, max_code, active')
        .order('tier', { ascending: true });
      const rows = ((error ? [] : data) ?? []) as Row[];
      const own = rows
        .filter((r) => r.active && r.tier >= 1 && r.tier <= 5)
        .map<VipTier>((r) => ({
          tier: r.tier as VipTierLevel,
          name: r.name,
          color: r.color,
          minCode: r.min_code,
          maxCode: r.max_code,
        }));
      // No rows (table missing, or not seeded): keep the defaults.
      if (own.length > 0) {
        tiers = own;
        emit();
      }
      loaded = !error;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** Synchronous read, for pure code paths (filters, counts). */
export function getVipTiers(): readonly VipTier[] {
  return tiers;
}

/** Back to the defaults — sign-out or hotel switch. */
export function clearVipTiers(): void {
  tiers = DEFAULT_VIP_TIERS;
  loaded = false;
  loading = null;
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The hotel's tiers; loads them on first use. */
export function useVipTiers(): readonly VipTier[] {
  useEffect(() => {
    void ensureVipTiers();
  }, []);
  return useSyncExternalStore(subscribe, getVipTiers, getVipTiers);
}
