/**
 * The staff roster of the default hotel (hotels.is_default), each on a shift,
 * as the client asked for it per department (2026-10-19):
 *
 *   Housekeeping  Executive Housekeeper ×3, Supervisor ×1, Room Attendant ×4,
 *                 Porter / Houseman ×2, Laundry Attendant ×2,
 *                 Public Area Attendant ×2
 *   Engineering   Director of Engineering ×1, Shift Engineer ×4
 *   IT            Director Of Information Technology ×1
 *   Executive     Hotel Manager ×1
 *   In Room Dining  Manager ×1, Supervisor ×1, Waiter/Waitress ×1
 *
 * Every group of two or more is split across AM and PM so both shifts are covered.
 *
 * Only creates; never touches an existing account (unlike re-running
 * seedUsers.js, which rewrites every seeded user's profile). Re-running skips
 * anyone already registered. People removed from the roster are not deleted
 * here — do that from the back office (Staff → Disable) or by hand.
 *
 * Requires: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * Run:      node scripts/seedStaffRoster.js
 */

const { createClient } = require('@supabase/supabase-js');
// Default DB is development; `APP_ENV=production` to target production.
const { appEnv } = require('./loadEnv');
console.log(`[seedStaffRoster] target environment: ${appEnv}`);

const PASSWORD = 'Hestia2025!';

// `job` matches job_titles.key.
const STAFF = [
  // Housekeeping
  { full_name: 'Stella Kitou', email: 'stella@hestia.ch', job: 'executive_housekeeper', shift: 'AM' },
  { full_name: 'Henry Tankeu', email: 'henry@hestia.ch', job: 'executive_housekeeper', shift: 'AM' },
  { full_name: 'Spyros Louziotis', email: 'spyroslouziotis@hotmail.com', job: 'executive_housekeeper', shift: 'AM' },

  { full_name: 'Alex Morin', email: 'alex@hestia.ch', job: 'supervisor', shift: 'AM' },

  { full_name: 'Luca Bianchi', email: 'luca@hestia.ch', job: 'housekeeping_room_attendant', shift: 'AM' },
  { full_name: 'Zoe Cakeri', email: 'zoe@hestia.ch', job: 'housekeeping_room_attendant', shift: 'AM' },
  { full_name: 'Mei Lin', email: 'mei@hestia.ch', job: 'housekeeping_room_attendant', shift: 'PM' },
  { full_name: 'Fatima Benali', email: 'fatima@hestia.ch', job: 'housekeeping_room_attendant', shift: 'PM' },

  { full_name: 'Jordan Lee', email: 'jordan@hestia.ch', job: 'housekeeping_porter_houseman', shift: 'AM' },
  { full_name: 'Omar Saleh', email: 'omar@hestia.ch', job: 'housekeeping_porter_houseman', shift: 'PM' },

  { full_name: 'Samantha Nguyen', email: 'sam@hestia.ch', job: 'housekeeping_laundry_attendant', shift: 'AM' },
  { full_name: 'Lina Moreau', email: 'lina@hestia.ch', job: 'housekeeping_laundry_attendant', shift: 'PM' },

  { full_name: 'Ken Ito', email: 'ken@hestia.ch', job: 'housekeeping_public_area_attendant', shift: 'AM' },
  { full_name: 'Taylor Robinson', email: 'taylor@hestia.ch', job: 'housekeeping_public_area_attendant', shift: 'PM' },

  // Engineering
  { full_name: 'Felix Fuhrken', email: 'felix@hestia.ch', job: 'director_of_engineering', shift: 'AM' },
  { full_name: 'Ivan Petrov', email: 'ivan@hestia.ch', job: 'shift_engineer', shift: 'AM' },
  { full_name: 'Nico Berger', email: 'nico@hestia.ch', job: 'shift_engineer', shift: 'AM' },
  { full_name: 'Sara Lindqvist', email: 'sara@hestia.ch', job: 'shift_engineer', shift: 'PM' },
  { full_name: 'Tom Achieng', email: 'tom@hestia.ch', job: 'shift_engineer', shift: 'PM' },

  // IT
  { full_name: 'Brian Osei', email: 'brian@hestia.ch', job: 'director_of_information_technology', shift: 'AM' },

  // Executive and Administration
  { full_name: 'Elena Hofmann', email: 'elena@hestia.ch', job: 'hotel_manager', shift: 'AM' },

  // In Room Dining
  { full_name: 'Marta Silva', email: 'marta@hestia.ch', job: 'in_room_dining_manager', shift: 'AM' },
  { full_name: 'Diego Ramos', email: 'diego@hestia.ch', job: 'in_room_dining_supervisor', shift: 'PM' },
  { full_name: 'Ana Costa', email: 'ana@hestia.ch', job: 'in_room_dining_waiter_waitress', shift: 'AM' },
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
    .eq('is_default', true)
    .single();
  if (hotelErr || !hotel) throw new Error(`Default hotel (hotels.is_default) not found: ${hotelErr?.message}`);

  const { data: jobTitles, error: jtErr } = await supabase
    .from('job_titles')
    .select('id, key, name, department_id')
    .in('key', [...new Set(STAFF.map((s) => s.job))]);
  if (jtErr) throw jtErr;
  const jobTitle = Object.fromEntries(jobTitles.map((t) => [t.key, t]));
  const unknown = STAFF.filter((s) => !jobTitle[s.job]);
  if (unknown.length) throw new Error(`Unknown job titles: ${unknown.map((s) => s.job).join(', ')}`);

  // `shifts` is hotel-scoped: point each person at this hotel's own AM / PM row.
  const { data: shifts, error: shiftErr } = await supabase
    .from('shifts')
    .select('id, name')
    .eq('hotel_id', hotel.id);
  if (shiftErr) throw shiftErr;
  const shiftId = (label) => shifts.find((s) => s.name.trim().toUpperCase().includes(label))?.id ?? null;

  let created = 0;
  for (const s of STAFF) {
    const title = jobTitle[s.job];
    const metadata = { full_name: s.full_name, role_name: title.name, hotel_id: hotel.id };
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: s.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (authErr && authErr.message?.includes('already been registered')) {
      console.log(`Skip (exists): ${s.email}`);
      continue;
    }
    if (!authUser?.user?.id) {
      console.error(`Failed ${s.email}:`, authErr?.message);
      continue;
    }

    const { error: profileErr } = await supabase.from('users').upsert(
      {
        id: authUser.user.id,
        full_name: s.full_name,
        hotel_id: hotel.id,
        job_title_id: title.id,
        department_id: title.department_id,
        shift_id: shiftId(s.shift),
      },
      { onConflict: 'id' }
    );
    if (profileErr) {
      console.error(`Profile failed ${s.email}:`, profileErr.message);
      continue;
    }
    created += 1;
    console.log(`Created: ${s.email} (${title.name}, ${s.shift})`);
  }

  console.log(`\nDone: ${created} created. Password for all: ${PASSWORD}`);
}

main().catch((err) => {
  console.error('[seedStaffRoster] Failed:', err?.message || err);
  process.exit(1);
});
