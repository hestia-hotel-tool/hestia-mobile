import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
        await supabase.rpc('ensure_current_user_profile');
      } catch {
        // ignore and fall through
      }
      ({ data: row, error } = await supabase.from('users').select('hotel_id').eq('id', userId).maybeSingle());
    }

    if (error || !row) return null;
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

export function clearCachedHotelId() {
  cachedHotelId = null;
  inflight = null;
}

