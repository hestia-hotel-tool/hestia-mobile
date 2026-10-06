/**
 * Departments service (Supabase)
 * Fetches departments for Create Ticket and Staff screens.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { Tables } from '../types/supabase';
import type { IconName } from '@/components/Icon';

export type DepartmentRow = Tables<'departments'>;

/**
 * Shared department display config — single source of truth for both the
 * Tickets and Staff features. The `departments` DB table is authoritative for
 * which departments exist; these maps only supply presentation (icon) and the
 * legacy slug→name mapping.
 */

/** Map frontend department slug to DB department name (for API and staff filtering). */
export const DEPARTMENT_SLUG_TO_DB_NAME: Record<string, string> = {
  engineering: 'Engineering',
  hskPortier: 'HSK Portier',
  inRoomDining: 'In Room Dining',
  laundry: 'Laundry',
  concierge: 'Concierge',
  reception: 'Reception',
  it: 'IT',
};

/**
 * Map DB department name to its registry glyph.
 *
 * **Keyed on the names the `departments` table actually holds.** The previous
 * map was keyed on the seven labels in Figma 589-514, which is a *design* list,
 * not the data: `Housekeeping`, `Food & Beverage / Kitchen` and `Executive and
 * Administration` matched no key and fell through to the Engineering wrench, so
 * the department strip drew three identical wrenches. Conversely `HSK Portier`,
 * `Laundry` and `Reception` are Figma labels that match no row in the table.
 *
 * Keep this keyed on the live names. Verified against the table on 2026-09-18:
 * Concierge, Engineering, Executive and Administration, Food & Beverage /
 * Kitchen, Front Office, Housekeeping, In Room Dining, IT.
 *
 * The glyphs themselves are the Figma vectors, path-for-path — `dept-*` in
 * `assets/icons/departments/`. Two departments share a glyph with a designed
 * sibling because the design has fewer marks than the table has rows; that is a
 * mapping on meaning, not a missing export.
 *
 * **Every value here is a mark that exists in the design.** A department with
 * no designed glyph is absent from this map and renders without one — see
 * `departmentIconName`.
 */
export const DEPARTMENT_NAME_TO_ICON: Record<string, IconName> = {
  Concierge: 'dept-concierge',
  Engineering: 'dept-engineering',
  Housekeeping: 'dept-housekeeping',
  'In Room Dining': 'dept-in-room-dining',
  IT: 'dept-it',
  /** Front Office is the desk the "Receptionist" mark was drawn for. */
  'Front Office': 'dept-reception',
  /** Kitchen shares the cocktail-and-bottle mark with In Room Dining. */
  'Food & Beverage / Kitchen': 'dept-in-room-dining',
  // `Executive and Administration` is deliberately absent: 589-514 draws no
  // mark for it. It renders as a bare disc rather than borrowing someone
  // else's glyph — see the note on the return type below.
};

/**
 * Glyph for a department, or `null` when the design has no mark for it.
 *
 * Null rather than a fallback glyph, on purpose. A wrong-but-plausible icon
 * reads as fact, and that is exactly how the three-wrench bug survived review:
 * every unmapped department silently claimed to be maintenance. An empty disc
 * is visibly incomplete, which is the truth, and it cannot be mistaken for a
 * designed decision.
 */
export function departmentIconName(name: string | null | undefined): IconName | null {
  return DEPARTMENT_NAME_TO_ICON[String(name ?? '').trim()] ?? null;
}

/** Chip colours for the department strip (Figma 589-514, node 2589:3291). */
export const DEPARTMENT_CHIP = {
  disc: { selected: '#f92424', unselected: '#ffebeb' },
  glyph: { selected: '#ffffff', unselected: '#fb9292' },
} as const;

/**
 * Rendered glyph height inside the 55.482 chip disc, in Figma px.
 *
 * These are each glyph's own viewBox height, which is not a coincidence: all
 * seven were exported at chip scale, so the viewBox *is* the size the mark
 * occupies in the disc. (IT was composed from five sub-layers and lands in the
 * same space — its 22.842 icon frame reconstructs 23.211 x 20.763 exactly.)
 *
 * They differ a lot on purpose — the hanger is 23 tall where the receptionist
 * is 37 — so a single shared size would flatten the design. `<Icon size>` sets
 * height and derives width from the aspect, which is why only height is listed.
 *
 * `dept-laundry` is listed but unmapped: 589-514 designs a Laundry chip, the
 * table has no Laundry row. The mark is real, so it stays ready.
 */
export const DEPARTMENT_GLYPH_HEIGHT: Partial<Record<IconName, number>> = {
  'dept-concierge': 32.6637,
  'dept-engineering': 31.07,
  'dept-housekeeping': 28.2138,
  'dept-in-room-dining': 35.1804,
  'dept-it': 20.7627,
  'dept-laundry': 23.0844,
  'dept-reception': 36.8699,
};

/** Glyph height for a department chip, in Figma px. */
export function departmentGlyphHeight(iconName: IconName): number {
  return DEPARTMENT_GLYPH_HEIGHT[iconName] ?? 28;
}

/**
 * Preferred display order for department lists (Staff chips, Tickets picker):
 * Housekeeping first, then Engineering, then Front Office, then everything else
 * alphabetically. Matched by keyword so it works whether the DB names it
 * "Housekeeping" or "HSK Portier".
 */
function departmentRank(name: string): number {
  const n = name.trim().toLowerCase();
  if (n.includes('housekeeping') || n.includes('hsk')) return 0;
  if (n.includes('engineering')) return 1;
  if (n.includes('front office')) return 2;
  return Number.MAX_SAFE_INTEGER;
}

export function sortDepartmentsByDisplayOrder<T extends { name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ra = departmentRank(a.name);
    const rb = departmentRank(b.name);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}

export interface GetDepartmentsResponse {
  data: DepartmentRow[];
  error: Error | null;
}

/**
 * Fetch all departments from Supabase, ordered by name.
 */
export async function getDepartments(): Promise<GetDepartmentsResponse> {
  if (!isSupabaseConfigured) {
    return { data: [], error: new Error('Supabase not configured') };
  }
  const { data, error } = await supabase
    .from('departments')
    .select('id, name, description, created_at, updated_at')
    .order('name', { ascending: true });

  if (error) return { data: [], error };
  return { data: (data ?? []) as DepartmentRow[], error: null };
}

/**
 * Fetch a single department by id (for form screen when only UUID is known).
 */
export async function getDepartmentById(id: string): Promise<DepartmentRow | null> {
  if (!isSupabaseConfigured || !id) return null;
  const { data, error } = await supabase
    .from('departments')
    .select('id, name, description, created_at, updated_at')
    .eq('id', id)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as DepartmentRow;
}
