/**
 * The signed-in person's own account: what My Profile shows and edits.
 *
 * Staff may change their name, photo and phone number; the rest (job title,
 * department, shift, hotel) is managed for them — the database enforces it
 * (migration 20260929000000).
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type MyAccount = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  department: string | null;
  shift: { id: string; name: string; start: string | null; end: string | null } | null;
  hotelName: string | null;
  memberSince: string | null;
};

type AccountRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string | null;
  job_titles: { name: string | null } | null;
  departments: { name: string | null } | null;
  shift_id: string | null;
  shifts: { name: string | null; start_time: string | null; end_time: string | null } | null;
  hotels: { name: string | null } | null;
};

/** "14:00:00" → "14:00". */
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : null);

export async function fetchMyAccount(): Promise<MyAccount | null> {
  if (!isSupabaseConfigured) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from('users')
    .select(
      'id, full_name, phone, avatar_url, created_at, shift_id, job_titles(name), departments(name), shifts(name, start_time, end_time), hotels(name)'
    )
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Your profile could not be loaded.');
  // Through `unknown`: the generated types predate job_title_id / shift_id / phone.
  const row = data as unknown as AccountRow | null;

  return {
    id: user.id,
    fullName: row?.full_name || (user.user_metadata?.full_name as string | undefined) || user.email?.split('@')[0] || 'User',
    email: user.email ?? null,
    phone: row?.phone ?? null,
    avatarUrl: row?.avatar_url ?? null,
    jobTitle: row?.job_titles?.name ?? null,
    department: row?.departments?.name ?? null,
    shift: row?.shifts?.name && row.shift_id
      ? { id: row.shift_id, name: row.shifts.name, start: hhmm(row.shifts.start_time), end: hhmm(row.shifts.end_time) }
      : null,
    hotelName: row?.hotels?.name ?? null,
    memberSince: row?.created_at ?? user.created_at ?? null,
  };
}

/** A phone number as staff type it: digits, spaces, + ( ) . - — 3 to 32 characters. */
export function isValidPhone(value: string): boolean {
  const v = value.trim();
  return v.length === 0 || (v.length >= 3 && v.length <= 32 && /^\+?[0-9 ().-]+$/.test(v));
}

export type MyProfilePatch = { fullName?: string; phone?: string | null };

/** Save name and phone. The auth metadata's name follows, for the few places that read it. */
export async function updateMyProfile(patch: MyProfilePatch): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error('You must be signed in to update your profile.');

  const payload: Record<string, unknown> = {};
  if (patch.fullName !== undefined) {
    const name = patch.fullName.trim();
    if (!name) throw new Error('Your name cannot be empty.');
    payload.full_name = name;
  }
  if (patch.phone !== undefined) {
    const phone = patch.phone?.trim() || null;
    if (phone && !isValidPhone(phone)) throw new Error('Enter a valid phone number.');
    payload.phone = phone;
  }
  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase.from('users').update(payload as never).eq('id', userId);
  if (error) throw new Error(error.message || 'Your profile could not be saved.');
  if (payload.full_name) {
    await supabase.auth.updateUser({ data: { full_name: payload.full_name } }).catch(() => {});
  }
}

/** Remove the profile photo; initials show instead. */
export async function removeMyAvatar(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  if (!userId) throw new Error('You must be signed in to update your profile.');
  const { error } = await supabase.from('users').update({ avatar_url: null } as never).eq('id', userId);
  if (error) throw new Error(error.message || 'Your photo could not be removed.');
  await supabase.auth.updateUser({ data: { avatar_url: null } }).catch(() => {});
}

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Change the password: the current one is checked first (by signing in with
 * it), so a phone left unlocked cannot be used to take over the account.
 */
export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const email = sessionData?.session?.user?.email;
  if (!email) throw new Error('You must be signed in to change your password.');
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Your new password needs at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (newPassword === currentPassword) throw new Error('Choose a password different from your current one.');

  const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) throw new Error('Your current password is not correct.');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    if (/weak|pwned|leaked/i.test(error.message)) {
      throw new Error('That password is too easy to guess. Try a longer one, or add numbers and symbols.');
    }
    throw new Error(error.message || 'Your password could not be changed.');
  }
}
