/**
 * Departments service (Supabase)
 * Fetches departments for Create Ticket and Staff screens.
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { Tables } from '../types/supabase';

export type DepartmentRow = Tables<'departments'>['Row'];

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
