/**
 * Departments service (Supabase)
 * Fetches departments for Create Ticket and Staff screens.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { Tables } from '../types/supabase';

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

/** Map DB department name to local icon and whether to skip red tint (HSK Portier, In Room Dining). */
export const DEPARTMENT_NAME_TO_ICON: Record<string, { icon: any; noTint?: boolean }> = {
  Engineering: { icon: require('../../assets/icons/engineering.png'), noTint: false },
  'HSK Portier': { icon: require('../../assets/icons/hsk-portier.png'), noTint: true },
  'In Room Dining': { icon: require('../../assets/icons/in-room-dining-icon.png'), noTint: true },
  Laundry: { icon: require('../../assets/icons/laundry-icon.png'), noTint: false },
  Concierge: { icon: require('../../assets/icons/concierge.png'), noTint: false },
  Reception: { icon: require('../../assets/icons/reception.png'), noTint: false },
  IT: { icon: require('../../assets/icons/it.png'), noTint: false },
  'Front Office': { icon: require('../../assets/icons/reception.png'), noTint: false },
  'Food and Beverage': { icon: require('../../assets/icons/in-room-dining-icon.png'), noTint: true },
  'Executive Administration': { icon: require('../../assets/icons/reception.png'), noTint: false },
};

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
