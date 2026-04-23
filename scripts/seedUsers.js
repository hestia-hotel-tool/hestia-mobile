/**
 * Seed users into Supabase Auth + public.users
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * Run: node scripts/seedUsers.js
 *
 * Creates auth users and links them to departments/roles in public.users.
 * Default password: "Hestia2025!" (change in production)
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
// Load .env from project root (dotenv is a dependency of expo)
try {
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} catch (_) {
  // Fallback: manual load
  try {
    const fs = require('fs');
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      });
    }
  } catch (__) {}
}

const DEFAULT_PASSWORD = 'Hestia2025!';

const DEFAULT_HOTEL_NAME = 'Default Hotel';
const NEW_HOTEL_NAME = 'Palm Haven Hotel';

// Map role_key (used in users) to role name (stored in roles table)
const ROLE_KEY_TO_NAME = {
  general_manager: 'General Manager',
  hotel_manager: 'Hotel Manager',
  executive_housekeeper: 'Executive Housekeeper',
  housekeeping_manager: 'Housekeeping Manager',
  assistant_housekeeping_manager: 'Assistant Housekeeping Manager',
  housekeeping_senior_supervisor: 'Senior Supervisor',
  housekeeping_supervisor: 'Supervisor',
  housekeeping_coordinator: 'Coordinator',
  room_attendant: 'Housekeeping Room Attendant',
  houseman: 'Housekeeping Portier / Houseman',
  laundry_attendant: 'Housekeeping Laundry Attendant',
  public_area_attendant: 'Housekeeping Public Area Attendant',
  director_of_rooms: 'Director of Rooms',
  assistant_director_of_rooms: 'Assistant Director of Rooms',
  front_office_director: 'Director of Front Office',
  front_office_manager: 'Front Office Manager',
  front_office_supervisor: 'Front Office Supervisor',
  front_office_agent: 'Front Office Agent',
  front_office_trainee: 'Front Office Trainee',
  night_manager: 'Night Manager',
  night_auditor: 'Night Auditor',
  night_agent: 'Night Agent',
  engineering_director: 'Director of Engineering',
  engineering_supervisor: 'Engineering Supervisor',
  shift_engineer: 'Shift Engineer',
  it_admin: 'IT Manager',
};

const users = [
  { full_name: 'Wallace Mua', email: 'wallace@hestia.ch', role_key: 'general_manager', department_name: 'Executive Administration', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Stella Kitou', email: 'stella@hestia.ch', role_key: 'hotel_manager', department_name: 'Executive Administration', hotel_name: DEFAULT_HOTEL_NAME },

  { full_name: 'Henry Tankeu', email: 'henry@hestia.ch', role_key: 'executive_housekeeper', department_name: 'HSK Portier', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Giovanna Rossi', email: 'gio@hestia.ch', role_key: 'housekeeping_manager', department_name: 'HSK Portier', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Leon Meyer', email: 'leon@hestia.ch', role_key: 'assistant_housekeeping_manager', department_name: 'HSK Portier', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Etleva Kola', email: 'etleva@hestia.ch', role_key: 'housekeeping_senior_supervisor', department_name: 'HSK Portier', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Alex Morin', email: 'alex@hestia.ch', role_key: 'housekeeping_supervisor', department_name: 'HSK Portier', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Maria Lopez', email: 'maria@hestia.ch', role_key: 'housekeeping_coordinator', department_name: 'HSK Portier', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Zoe Cakeri', email: 'zoe@hestia.ch', role_key: 'room_attendant', department_name: 'HSK Portier', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Jordan Lee', email: 'jordan@hestia.ch', role_key: 'houseman', department_name: 'HSK Portier', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Samantha Nguyen', email: 'sam@hestia.ch', role_key: 'laundry_attendant', department_name: 'Laundry', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Taylor Robinson', email: 'taylor@hestia.ch', role_key: 'public_area_attendant', department_name: 'HSK Portier', hotel_name: DEFAULT_HOTEL_NAME },

  { full_name: 'Chris Johnson', email: 'chris@hestia.ch', role_key: 'director_of_rooms', department_name: 'Executive Administration', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Morgan Patel', email: 'morgan@hestia.ch', role_key: 'assistant_director_of_rooms', department_name: 'Executive Administration', hotel_name: DEFAULT_HOTEL_NAME },

  { full_name: 'Chi Henry', email: 'chi@hestia.ch', role_key: 'front_office_director', department_name: 'Front Office', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Alex Martinez', email: 'alexm@hestia.ch', role_key: 'front_office_manager', department_name: 'Front Office', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Sofia Blanc', email: 'sofia@hestia.ch', role_key: 'front_office_supervisor', department_name: 'Front Office', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Noah Weber', email: 'noah@hestia.ch', role_key: 'front_office_agent', department_name: 'Front Office', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Emma Dubois', email: 'emma@hestia.ch', role_key: 'front_office_trainee', department_name: 'Front Office', hotel_name: DEFAULT_HOTEL_NAME },

  { full_name: 'Lucas Braun', email: 'lucas@hestia.ch', role_key: 'night_manager', department_name: 'Reception', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Nina Keller', email: 'nina@hestia.ch', role_key: 'night_auditor', department_name: 'Reception', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Paul Steiner', email: 'paul@hestia.ch', role_key: 'night_agent', department_name: 'Reception', hotel_name: DEFAULT_HOTEL_NAME },

  { full_name: 'Felix Fuhrken', email: 'felix@hestia.ch', role_key: 'engineering_director', department_name: 'Engineering', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Marco Rossi', email: 'marco@hestia.ch', role_key: 'engineering_supervisor', department_name: 'Engineering', hotel_name: DEFAULT_HOTEL_NAME },
  { full_name: 'Ivan Petrov', email: 'ivan@hestia.ch', role_key: 'shift_engineer', department_name: 'Engineering', hotel_name: DEFAULT_HOTEL_NAME },

  { full_name: 'Brian Osei', email: 'brian@hestia.ch', role_key: 'it_admin', department_name: 'IT', hotel_name: DEFAULT_HOTEL_NAME },
];

function generateTenantUsers(hotelName) {
  const domain = 'palmhavenhotel.com';
  const templates = [
    { full_name: 'Amina Diallo', role_key: 'hotel_manager', department_name: 'Executive Administration' },
    { full_name: 'Jonas Fischer', role_key: 'front_office_manager', department_name: 'Front Office' },
    { full_name: 'Sofia Mendes', role_key: 'executive_housekeeper', department_name: 'HSK Portier' },
    { full_name: 'Daniel Kim', role_key: 'engineering_supervisor', department_name: 'Engineering' },
    { full_name: 'Priya Shah', role_key: 'night_auditor', department_name: 'Reception' },
  ];

  return templates.map((t) => {
    const firstName = (t.full_name || 'user').trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');
    const local = firstName || 'user';
    return {
      ...t,
      hotel_name: hotelName,
      email: `${local}@${domain}`,
    };
  });
}

async function ensureHotelId(supabase, hotelName) {
  const { data: existing, error: selectErr } = await supabase
    .from('hotels')
    .select('id, name')
    .eq('name', hotelName)
    .limit(1)
    .maybeSingle();

  if (selectErr) throw selectErr;
  if (existing?.id) return existing.id;

  const { data: inserted, error: insertErr } = await supabase
    .from('hotels')
    .insert({ name: hotelName })
    .select('id')
    .single();

  if (insertErr) throw insertErr;
  return inserted.id;
}

async function main() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    console.error('Add to .env: SUPABASE_SERVICE_ROLE_KEY=... (from Dashboard → Settings → API)');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // Ensure hotels exist (idempotent)
  const defaultHotelId = await ensureHotelId(supabase, DEFAULT_HOTEL_NAME);
  const newHotelId = await ensureHotelId(supabase, NEW_HOTEL_NAME);

  // Fetch department and role ids by name
  const { data: departments } = await supabase.from('departments').select('id, name');
  const { data: roles } = await supabase.from('roles').select('id, name');
  const deptMap = Object.fromEntries((departments || []).map(d => [d.name, d.id]));
  const roleMap = Object.fromEntries((roles || []).map(r => [r.name, r.id]));

  const tenantUsers = generateTenantUsers(NEW_HOTEL_NAME);
  const allUsers = [...users, ...tenantUsers];

  for (const u of allUsers) {
    try {
      const roleDisplayName = ROLE_KEY_TO_NAME[u.role_key] || u.role_key;
      const roleId = roleMap[roleDisplayName] || null;
      const hotelId =
        (u.hotel_name || DEFAULT_HOTEL_NAME) === NEW_HOTEL_NAME ? newHotelId : defaultHotelId;
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: u.full_name, role_name: roleDisplayName, hotel_id: hotelId },
      });

      if (authErr) {
        if (authErr.message?.includes('already been registered')) {
          console.log(`Skip (exists): ${u.email}`);
          // Update existing user's department/role and metadata
          const { data: existing } = await supabase.auth.admin.listUsers();
          const user = existing?.users?.find(x => x.email === u.email);
          if (user) {
            await supabase.from('users').update({
              department_id: deptMap[u.department_name] || null,
              role_id: roleId,
              full_name: u.full_name,
              hotel_id: hotelId,
            }).eq('id', user.id);
            await supabase.auth.admin.updateUserById(user.id, {
              user_metadata: { full_name: u.full_name, role_name: roleDisplayName, hotel_id: hotelId },
            });
            console.log(`  Updated profile for ${u.email}`);
          }
          continue;
        }
        // Some Supabase setups return a 500 if the auth->public.users trigger fails,
        // even though the auth user was created successfully. If we have a user id,
        // we can still proceed and upsert the public.users row ourselves.
        if (!authUser?.user?.id) throw authErr;
        console.warn(`Warning: auth user created but trigger failed for ${u.email}. Fixing profile via upsert...`);
      }

      // Ensure public.users row exists and has the right fields (idempotent)
      const userId = authUser.user.id;
      await supabase.from('users').upsert({
        id: userId,
        full_name: u.full_name,
        department_id: deptMap[u.department_name] || null,
        role_id: roleId,
        hotel_id: hotelId,
      }, { onConflict: 'id' });

      // Keep auth metadata in sync (idempotent)
      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: { full_name: u.full_name, role_name: roleDisplayName, hotel_id: hotelId },
      });

      console.log(`Created: ${u.email} (${u.role_key})`);
    } catch (err) {
      console.error(`Failed ${u.email}:`, err?.message || err);
      if (err && typeof err === 'object') {
        try {
          console.error('  Details:', JSON.stringify(err, null, 2));
        } catch (_) {}
      }
    }
  }

  console.log('\nDone. Default password for all: ' + DEFAULT_PASSWORD);
}

main();
