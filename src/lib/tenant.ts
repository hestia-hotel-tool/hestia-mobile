import { supabase, isSupabaseConfigured } from './supabase';

let cachedHotelId: string | null = null;
let inflight: Promise<string | null> | null = null;

export async function getMyHotelId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  if (cachedHotelId) return cachedHotelId;
  if (inflight) return inflight;

  inflight = (async () => {
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) return null;

    // Tenant-scoped RLS depends on public.users existing; older environments can have auth users
    // without a corresponding public.users row. In that case, bootstrap it via RPC first.
    let row: any = null;
    let error: any = null;

    ({ data: row, error } = await supabase.from('users').select('hotel_id').eq('id', userId).maybeSingle());

    if (error || !row?.hotel_id) {
      try {
        await (supabase as any).rpc('ensure_current_user_profile');
      } catch {
        // ignore and fall through
      }
      ({ data: row, error } = await supabase.from('users').select('hotel_id').eq('id', userId).maybeSingle());
    }

    if (error || !row) return null;
    if (await isDisabled(userId)) {
      // Disabled from the back office: drop this device's push tokens and sign out.
      await supabase.from('user_push_tokens').delete().eq('user_id', userId).then(() => {}, () => {});
      await supabase.auth.signOut().catch(() => {});
      throw new AccountDisabledError();
    }
    const hid = (row as { hotel_id?: string | null }).hotel_id ?? null;
    cachedHotelId = hid;
    return hid;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/** A manager disabled this account (users.active = false, back office Step 2.1). */
export class AccountDisabledError extends Error {
  constructor() {
    super('This account has been disabled. Ask your manager.');
    this.name = 'AccountDisabledError';
  }
}

/**
 * users.active, read on its own so a database without the column (older
 * environments) still signs in: any error reads as "not disabled".
 */
async function isDisabled(userId: string): Promise<boolean> {
  const { data, error } = await (supabase as any).from('users').select('active').eq('id', userId).maybeSingle();
  return !error && data?.active === false;
}

export function clearCachedHotelId() {
  cachedHotelId = null;
  inflight = null;
}

