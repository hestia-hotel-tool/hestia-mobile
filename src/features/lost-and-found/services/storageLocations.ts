import { supabase } from '@/lib/supabase';
import { setStorageLocationLabels } from '../utils/storedLocations';

/**
 * The hotel's Lost & Found storage locations (migration 20261026300000) —
 * the Stored Location dropdown, editable by managers (lost_and_found.manage)
 * under Account → Lost & Found storage. Items store `key`; people read
 * `label`. A retired location (`active: false`) leaves the dropdown but keeps
 * naming the items stored there.
 */
export type StorageLocation = { id: string; key: string; label: string; active: boolean; sortOrder: number };

// Cast: the table and functions postdate the generated types.
const db = () => supabase as unknown as { from: (t: string) => any; rpc: (f: string, a: Record<string, unknown>) => any };

let cache: Promise<StorageLocation[]> | null = null;

/** Forget the cached list (sign-out, hotel switch, or after an edit). */
export function clearStorageLocationsCache(): void {
  cache = null;
}

export function fetchStorageLocations(opts?: { force?: boolean }): Promise<StorageLocation[]> {
  if (cache && !opts?.force) return cache;
  cache = (async () => {
    const { data, error } = await db()
      .from('lost_and_found_storage_locations')
      .select('id, key, label, active, sort_order')
      .order('sort_order', { ascending: true });
    if (error) {
      cache = null;
      throw new Error(error.message || 'Could not load the storage locations.');
    }
    const rows = ((data ?? []) as { id: string; key: string; label: string; active: boolean; sort_order: number }[]).map(
      (r) => ({ id: r.id, key: r.key, label: r.label, active: r.active, sortOrder: r.sort_order })
    );
    setStorageLocationLabels(Object.fromEntries(rows.map((r) => [r.key, r.label])));
    return rows;
  })();
  return cache;
}

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw new Error(error.message || 'That did not work. Please try again.');
  clearStorageLocationsCache();
  return data as T;
}

/** Add a location (no id) or rename one. */
export const saveStorageLocation = (id: string | null, label: string) =>
  call<string>('lf_storage_location_save', { p_id: id, p_label: label });

/** The dropdown's order, first to last. */
export const reorderStorageLocations = (ids: string[]) => call<void>('lf_storage_location_reorder', { p_ids: ids });

/** Retired if items are stored there, deleted if not. */
export const removeStorageLocation = (id: string) =>
  call<'retired' | 'deleted'>('lf_storage_location_remove', { p_id: id });
