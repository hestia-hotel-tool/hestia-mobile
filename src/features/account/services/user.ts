/**
 * User service (Supabase)
 * Profile, avatar, and user list. All user data from Supabase.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { base64ToArrayBuffer } from '@/utils/encoding';
import type { UserProfile } from '@features/home/types/home.types';
import type { User } from '@/types';
import { getMyHotelId } from '@/lib/tenant';

export type UserProfileRow = {
  full_name?: string;
  avatar_url?: string;
  job_titles?: { name: string } | null;
  roles?: { name: string } | null;
  departments?: { name: string } | null;
};

/**
 * Build UserProfile from session metadata (no Supabase call)
 */
export function userProfileFromSession(metadata: Record<string, unknown> | undefined, email: string | undefined, hasFlag = false): UserProfile {
  const name = (metadata?.full_name as string) || (metadata?.name as string) || email?.split('@')[0] || 'User';
  const role = (metadata?.role_name as string) || (metadata?.role as string) || 'Staff';
  const department = metadata?.department as string | undefined;
  const avatar = (metadata?.avatar_url as string) || undefined;
  return { name, role, department, avatar, hasFlag };
}

/**
 * Fetch full user profile from Supabase (users + roles/departments).
 * Falls back to session metadata when Supabase is not configured or query fails.
 */
export async function getProfile(userId: string, sessionFallback: UserProfile): Promise<UserProfile> {
  if (!isSupabaseConfigured) return sessionFallback;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('full_name, avatar_url, job_titles(name), roles(name), departments(name)')
      .eq('id', userId)
      .single();

    if (error || !data) return sessionFallback;
    // `as unknown` because the generated schema in src/types/supabase.ts predates
    // users.job_title_id, so it types the job_titles embed as a SelectQueryError.
    // The relation exists and the query returns the name at runtime; regenerating
    // the types is tracked separately (it currently breaks typecheck elsewhere).
    const row = data as unknown as UserProfileRow;
    return {
      name: row.full_name || sessionFallback.name,
      // The job title is the person's displayed identity — Figma 2702:3231 shows
      // "Executive Housekeeper", not the department. `users.role_id` is
      // deprecated and no longer written (see AGENT.md and scripts/seedUsers.js),
      // so `roles(name)` is always null now and this used to fall through to
      // `departments(name)`, rendering every housekeeper as plain "Housekeeping".
      role:
        row.job_titles?.name ||
        row.roles?.name ||
        row.departments?.name ||
        sessionFallback.role,
      department: row.departments?.name || sessionFallback.department,
      avatar: row.avatar_url ?? sessionFallback.avatar,
      hasFlag: sessionFallback.hasFlag,
    };
  } catch {
    return sessionFallback;
  }
}

export interface UpdateAvatarResult {
  avatarUrl: string;
}

/**
 * Upload avatar image and update user record and auth metadata.
 * @param userId - Supabase auth user id
 * @param imageBase64 - Base64-encoded image string
 * @param fileExtension - e.g. 'jpg', 'png'
 * @returns new public avatar URL
 */
export async function updateAvatar(
  userId: string,
  imageBase64: string,
  fileExtension: string
): Promise<UpdateAvatarResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Profile update requires Supabase to be configured.');
  }
  const normalizedExt = fileExtension.toLowerCase() === 'jpg' ? 'jpeg' : fileExtension.toLowerCase();
  const contentType = normalizedExt === 'png' ? 'image/png' : 'image/jpeg';
  // Use unique file names to avoid stale CDN/image cache showing old avatar.
  const hotelId = await getMyHotelId();
  if (!hotelId) {
    throw new Error('No hotel assigned to this user.');
  }
  // Folder convention: {hotelId}/{entityId}/... so every upload is scoped to
  // its hotel and owner (matches guest/chat/ticket uploads).
  const fileName = `${hotelId}/${userId}/avatar-${Date.now()}.${normalizedExt}`;
  const arrayBuffer = base64ToArrayBuffer(imageBase64);

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, arrayBuffer, { contentType, upsert: true });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
  const avatarUrl = urlData.publicUrl;

  const { error: updateError } = await supabase
    .from('users')
    .update({ avatar_url: avatarUrl })
    .eq('id', userId);

  if (updateError) throw updateError;

  await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });

  return { avatarUrl };
}

/** Supabase users row shape (public.users – email lives in auth.users) */
type UserRow = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  roles?: { name: string } | null;
  departments?: { name: string } | null;
  job_titles?: { name: string } | null;
};

let didAttemptBootstrapProfile = false;
async function ensureCurrentUserProfileOnce(): Promise<void> {
  if (!isSupabaseConfigured) return;
  if (didAttemptBootstrapProfile) return;
  didAttemptBootstrapProfile = true;
  try {
    // Creates/repairs public.users row for auth.uid() (migration: 20260415110000...)
    await (supabase as any).rpc('ensure_current_user_profile');
  } catch {
    // ignore: older DBs may not have the function yet
  }
}

function mapUserRowToUser(row: UserRow, email = ''): User {
  return {
    id: row.id,
    name: row.full_name ?? 'User',
    email,
    /*
     * The person's job, e.g. "Room Attendant" — `users.job_title_id`.
     *
     * This used to read `roles?.name ?? departments?.name`, and `role_id` is
     * null on every seeded user, so it always landed on the **department**:
     * every name in a staff picker was captioned "Housekeeping" or
     * "Engineering", which is the one thing the reader already knows (they
     * picked the department) and tells them nothing about who to choose.
     * `job_titles` was never selected at all.
     *
     * The department fallback is gone deliberately. `roles` stays as a second
     * choice because it is a real, if coarser, description of the person.
     */
    jobTitle: row.job_titles?.name ?? undefined,
    role: row.job_titles?.name ?? row.roles?.name ?? 'Staff',
    department: row.departments?.name ?? undefined,
    avatar: row.avatar_url ?? undefined,
  };
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Filter users by department (UUID from departments.id). */
  departmentId?: string;
}

export interface GetUsersResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * The signed-in user's id, or `null`.
 *
 * `getSession()` rather than `getUser()`: the session is already in local
 * storage, so this costs nothing, where `getUser()` revalidates against the
 * auth server. Callers here only need the id to compare against a list.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * List users by department id (UUID).
 * Preferred for app flows that need stable IDs (e.g. ticket tagging).
 *
 * `excludeSelf` drops the signed-in user from the result, and is **off by
 * default**. A picker wants it: these lists exist to choose somebody else, so
 * your own name is noise in every one of them. A directory does not — the Staff
 * screen lists who actually belongs to a department, and hiding the reader from
 * their own team would misstate it. The two callers genuinely differ, which is
 * why this is a parameter rather than a default either way.
 */
export async function getUsersByDepartmentId(
  departmentId: string,
  params?: Omit<GetUsersParams, 'departmentId'> & { excludeSelf?: boolean }
): Promise<GetUsersResponse> {
  if (!departmentId) return { data: [], total: 0, page: 1, limit: 0, totalPages: 0 };
  const pageSize = Math.min(params?.limit ?? 100, 100);
  const res = await getUsers({ ...params, departmentId, page: 1, limit: pageSize });

  let data = res.data;
  let total = res.total;

  if (params?.excludeSelf) {
    const myId = await getCurrentUserId();
    if (myId && data.some((u) => u.id === myId)) {
      data = data.filter((u) => u.id !== myId);
      total = Math.max(0, total - 1);
    }
  }

  return { data, total, page: 1, limit: data.length, totalPages: 1 };
}

/**
 * List users from Supabase (users table + roles/departments).
 */
export async function getUsers(params?: GetUsersParams): Promise<GetUsersResponse> {
  const page = params?.page ?? 1;
  const limit = Math.min(params?.limit ?? 20, 100);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Tenant-scoped RLS depends on public.users existing for auth.uid().
  // If an environment has auth users created before the sync trigger, staff lists will be empty.
  await ensureCurrentUserProfileOnce();

  let query = supabase
    .from('users')
    .select('id, full_name, avatar_url, roles(name), departments(name), job_titles(name)', {
      count: 'exact',
    })
    .range(from, to)
    .order('full_name', { ascending: true });

  if (params?.search?.trim()) {
    query = query.ilike('full_name', `%${params.search.trim()}%`);
  }

  if (params?.departmentId) {
    query = query.eq('department_id', params.departmentId);
  }

  let { data, error, count } = await query;
  if (error) throw error;

  // If RLS hid everything due to missing profile, retry once after bootstrap.
  if ((data == null || (Array.isArray(data) && data.length === 0)) && !didAttemptBootstrapProfile) {
    await ensureCurrentUserProfileOnce();
    ({ data, error, count } = await query);
    if (error) throw error;
  }

  /*
   * Through `unknown`: the generated schema in `src/types/supabase.ts` predates
   * `users.job_title_id`, so its inferred type for the `job_titles(name)` embed
   * is `SelectQueryError<"could not find the relation...">`. The FK and the
   * embed are both real — verified against the REST API, which returns
   * `job_titles: { name: "Executive Housekeeper" }`. Regenerating the types is
   * a separate job (it currently breaks the build elsewhere).
   */
  const rows = (data ?? []) as unknown as UserRow[];
  const total = count ?? 0;
  return {
    data: rows.map((row) => mapUserRowToUser(row)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Get department UUID by name (for filtering users by department).
 */
export async function getDepartmentIdByName(departmentName: string): Promise<string | null> {
  if (!isSupabaseConfigured || !departmentName?.trim()) return null;
  const raw = departmentName.trim();
  const normalized = raw.replace(/\s+/g, ' ');

  await ensureCurrentUserProfileOnce();

  // Try exact match first (fast path), then case-insensitive exact match (more forgiving).
  let data: any = null;
  let error: any = null;

  ({ data, error } = await supabase
    .from('departments')
    .select('id')
    .eq('name', normalized)
    .limit(1)
    .maybeSingle());

  if (!error && data?.id) return (data as { id: string }).id;

  ({ data, error } = await supabase
    .from('departments')
    .select('id')
    .ilike('name', normalized) // case-insensitive exact match (no wildcards)
    .limit(1)
    .maybeSingle());

  if (!error && data?.id) return (data as { id: string }).id;

  // Final attempt: allow minor naming differences by collapsing punctuation to spaces.
  const relaxed = normalized.replace(/[^\w]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (relaxed && relaxed !== normalized) {
    ({ data, error } = await supabase
      .from('departments')
      .select('id')
      .ilike('name', relaxed)
      .limit(1)
      .maybeSingle());
    if (!error && data?.id) return (data as { id: string }).id;
  }

  return null;
}

/**
 * List users in a given department (by department name).
 * Used when tagging staff on a ticket for that department.
 *
 * Fetches **all pages** — `getUsers` is paginated (max 100 per page), so we loop until every
 * staff member in that department is loaded.
 */
export async function getUsersByDepartment(departmentName: string, params?: Omit<GetUsersParams, 'departmentId'>): Promise<GetUsersResponse> {
  await ensureCurrentUserProfileOnce();
  const departmentId = await getDepartmentIdByName(departmentName);
  // If the department name doesn't exist in DB (common in dev DBs), fall back to "all users"
  // so the Tag Staff picker isn't empty.
  if (!departmentId) {
    const pageSize = Math.min(params?.limit ?? 100, 100);
    const res = await getUsers({ ...params, page: 1, limit: pageSize });
    return {
      data: res.data,
      total: res.total,
      page: 1,
      limit: res.data.length,
      totalPages: 1,
    };
  }

  const { page: _ignoredPage, ...rest } = params ?? {};
  const pageSize = Math.min(rest.limit ?? 100, 100);
  const allUsers: User[] = [];
  let total = 0;
  let page = 1;
  let totalPages = 1;

  do {
    const res = await getUsers({
      ...rest,
      departmentId,
      page,
      limit: pageSize,
    });
    total = res.total;
    totalPages = res.totalPages;
    allUsers.push(...res.data);
    if (res.data.length === 0 || page >= totalPages) break;
    page += 1;
  } while (page <= totalPages);

  return {
    data: allUsers,
    total,
    page: 1,
    limit: allUsers.length,
    totalPages: 1,
  };
}

/**
 * Get one user by id from Supabase.
 */
export async function getUserById(id: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, avatar_url, roles(name), departments(name), job_titles(name)')
    .eq('id', id)
    .single();

  if (error || !data) throw error ?? new Error('User not found');
  return mapUserRowToUser(data as unknown as UserRow);
}
