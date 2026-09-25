/**
 * Add Housekeeping Room Attendants to the Default Hotel, each on a shift.
 *
 * Rooms are assigned to room attendants only, and the development database
 * had just one — so the Assign sheet listed a single person and the AM tab
 * was empty. This adds five, split across AM and PM.
 *
 * Only creates; never touches an existing account (unlike re-running
 * seedUsers.js, which rewrites every seeded user's profile). Re-running skips
 * anyone already registered.
 *
 * Requires: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * Run:      node scripts/seedRoomAttendants.js
 */

const { createClient } = require('@supabase/supabase-js');
// Default DB is development; `APP_ENV=production` to target production.
const { appEnv } = require('./loadEnv');
console.log(`[seedRoomAttendants] target environment: ${appEnv}`);

const PASSWORD = 'Hestia2025!';
const HOTEL_NAME = 'Default Hotel';
const JOB_TITLE_KEY = 'housekeeping_room_attendant';

const ATTENDANTS = [
  { full_name: 'Amara Okafor', email: 'amara@hestia.ch', shift: 'AM' },
  { full_name: 'Luca Bianchi', email: 'luca@hestia.ch', shift: 'AM' },
  { full_name: 'Mei Lin', email: 'mei@hestia.ch', shift: 'AM' },
  { full_name: 'Sebastian Kraus', email: 'sebastian@hestia.ch', shift: 'PM' },
  { full_name: 'Fatima Benali', email: 'fatima@hestia.ch', shift: 'PM' },
];

async function main() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: hotel, error: hotelErr } = await supabase
    .from('hotels')
    .select('id')
    .eq('name', HOTEL_NAME)
    .single();
  if (hotelErr || !hotel) throw new Error(`Hotel "${HOTEL_NAME}" not found: ${hotelErr?.message}`);

  const { data: jobTitle, error: jtErr } = await supabase
    .from('job_titles')
    .select('id, name, department_id')
    .eq('key', JOB_TITLE_KEY)
    .single();
  if (jtErr || !jobTitle) throw new Error(`Job title ${JOB_TITLE_KEY} not found: ${jtErr?.message}`);

  // `shifts` is hotel-scoped: point each attendant at this hotel's own AM / PM row.
  const { data: shifts, error: shiftErr } = await supabase
    .from('shifts')
    .select('id, name')
    .eq('hotel_id', hotel.id);
  if (shiftErr) throw shiftErr;
  const shiftId = (label) => shifts.find((s) => s.name.trim().toUpperCase().includes(label))?.id ?? null;

  let created = 0;
  for (const a of ATTENDANTS) {
    const metadata = { full_name: a.full_name, role_name: jobTitle.name, hotel_id: hotel.id };
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: a.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (authErr && authErr.message?.includes('already been registered')) {
      console.log(`Skip (exists): ${a.email}`);
      continue;
    }
    if (!authUser?.user?.id) {
      console.error(`Failed ${a.email}:`, authErr?.message);
      continue;
    }

    const { error: profileErr } = await supabase.from('users').upsert(
      {
        id: authUser.user.id,
        full_name: a.full_name,
        hotel_id: hotel.id,
        job_title_id: jobTitle.id,
        department_id: jobTitle.department_id,
        shift_id: shiftId(a.shift),
      },
      { onConflict: 'id' }
    );
    if (profileErr) {
      console.error(`Profile failed ${a.email}:`, profileErr.message);
      continue;
    }
    created += 1;
    console.log(`Created: ${a.email} (${jobTitle.name}, ${a.shift})`);
  }

  console.log(`\nDone: ${created} created. Password for all: ${PASSWORD}`);
}

main().catch((err) => {
  console.error('[seedRoomAttendants] Failed:', err?.message || err);
  process.exit(1);
});
