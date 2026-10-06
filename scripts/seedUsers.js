/**
 * Seed users into Supabase Auth + public.users
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * Run: node scripts/seedUsers.js
 *
 * Creates auth users and links them to a job title in public.users.
 * Default password: "Hestia2025!" (change in production)
 *
 * Permissions come from the job title, not from this file:
 *   users.job_title_id -> job_titles.role_id -> role_permissions
 * so a user's access is whatever the signed-off matrix says for that title.
 * `users.role_id` is deprecated and no longer written. Department is derived
 * from the job title so the two can never disagree.
 *
 * Seed both hotels to exercise tenant isolation, and at least one user per
 * permission profile so every row of the matrix is testable.
 */

const { createClient } = require('@supabase/supabase-js');
// Loads .env.<APP_ENV> then .env (see scripts/loadEnv.js). Default DB is
// development; use `APP_ENV=production npm run seed:users` to target production.
const { appEnv } = require('./loadEnv');
console.log(`[seedUsers] target environment: ${appEnv}`);

const DEFAULT_PASSWORD = 'Hestia2025!';

const DEFAULT_HOTEL_NAME = 'Default Hotel';
const NEW_HOTEL_NAME = 'Palm Haven Hotel';

// `job_title_key` matches job_titles.key, seeded from src/domain/rbac/matrix.json.
// The trailing comment is the permission profile that title resolves to.
const users = [
  { full_name: 'Wallace Mua', email: 'wallace@hestia.ch', job_title_key: 'general_manager', hotel_name: DEFAULT_HOTEL_NAME },                       // full_access
  { full_name: 'Stella Kitou', email: 'stella@hestia.ch', job_title_key: 'hotel_manager', hotel_name: DEFAULT_HOTEL_NAME },                         // full_access

  { full_name: 'Henry Tankeu', email: 'henry@hestia.ch', job_title_key: 'executive_housekeeper', hotel_name: DEFAULT_HOTEL_NAME },                  // full_access
  { full_name: 'Giovanna Rossi', email: 'gio@hestia.ch', job_title_key: 'housekeeping_manager', hotel_name: DEFAULT_HOTEL_NAME },                   // full_access
  { full_name: 'Leon Meyer', email: 'leon@hestia.ch', job_title_key: 'assistant_housekeeping_manager', hotel_name: DEFAULT_HOTEL_NAME },            // full_access
  { full_name: 'Etleva Kola', email: 'etleva@hestia.ch', job_title_key: 'senior_supervisor', hotel_name: DEFAULT_HOTEL_NAME },                      // full_access
  { full_name: 'Alex Morin', email: 'alex@hestia.ch', job_title_key: 'supervisor', hotel_name: DEFAULT_HOTEL_NAME },                                // full_access
  { full_name: 'Maria Lopez', email: 'maria@hestia.ch', job_title_key: 'coordinator', hotel_name: DEFAULT_HOTEL_NAME },                             // full_access
  { full_name: 'Zoe Cakeri', email: 'zoe@hestia.ch', job_title_key: 'housekeeping_room_attendant', hotel_name: DEFAULT_HOTEL_NAME },                // hk_room_attendant
  { full_name: 'Jordan Lee', email: 'jordan@hestia.ch', job_title_key: 'housekeeping_porter_houseman', hotel_name: DEFAULT_HOTEL_NAME },            // hk_houseman
  { full_name: 'Samantha Nguyen', email: 'sam@hestia.ch', job_title_key: 'housekeeping_laundry_attendant', hotel_name: DEFAULT_HOTEL_NAME },        // hk_laundry
  { full_name: 'Taylor Robinson', email: 'taylor@hestia.ch', job_title_key: 'housekeeping_public_area_attendant', hotel_name: DEFAULT_HOTEL_NAME }, // hk_public_area

  { full_name: 'Chris Johnson', email: 'chris@hestia.ch', job_title_key: 'director_of_rooms', hotel_name: DEFAULT_HOTEL_NAME },                     // ops_senior
  { full_name: 'Morgan Patel', email: 'morgan@hestia.ch', job_title_key: 'assistant_director_of_rooms', hotel_name: DEFAULT_HOTEL_NAME },           // ops_senior

  { full_name: 'Chi Henry', email: 'chi@hestia.ch', job_title_key: 'director_of_front_office', hotel_name: DEFAULT_HOTEL_NAME },                    // ops_senior
  { full_name: 'Alex Martinez', email: 'alexm@hestia.ch', job_title_key: 'front_office_manager', hotel_name: DEFAULT_HOTEL_NAME },                  // ops_senior
  { full_name: 'Sofia Blanc', email: 'sofia@hestia.ch', job_title_key: 'front_office_supervisor', hotel_name: DEFAULT_HOTEL_NAME },                 // ops_senior
  { full_name: 'Noah Weber', email: 'noah@hestia.ch', job_title_key: 'front_office_agent', hotel_name: DEFAULT_HOTEL_NAME },                        // fo_agent
  { full_name: 'Emma Dubois', email: 'emma@hestia.ch', job_title_key: 'front_office_trainee', hotel_name: DEFAULT_HOTEL_NAME },                     // fo_agent

  { full_name: 'Lucas Braun', email: 'lucas@hestia.ch', job_title_key: 'night_manager', hotel_name: DEFAULT_HOTEL_NAME },                           // ops_senior
  { full_name: 'Nina Keller', email: 'nina@hestia.ch', job_title_key: 'night_auditor', hotel_name: DEFAULT_HOTEL_NAME },                            // ops_senior
  { full_name: 'Paul Steiner', email: 'paul@hestia.ch', job_title_key: 'night_agent', hotel_name: DEFAULT_HOTEL_NAME },                             // fo_agent

  { full_name: 'Felix Fuhrken', email: 'felix@hestia.ch', job_title_key: 'director_of_engineering', hotel_name: DEFAULT_HOTEL_NAME },               // technical
  { full_name: 'Marco Rossi', email: 'marco@hestia.ch', job_title_key: 'engineering_supervisor', hotel_name: DEFAULT_HOTEL_NAME },                  // technical
  { full_name: 'Ivan Petrov', email: 'ivan@hestia.ch', job_title_key: 'shift_engineer', hotel_name: DEFAULT_HOTEL_NAME },                           // technical

  { full_name: 'Brian Osei', email: 'brian@hestia.ch', job_title_key: 'it_manager', hotel_name: DEFAULT_HOTEL_NAME },                               // technical

  // Added so every one of the 11 permission profiles has a test account.
  { full_name: 'Yara Haddad', email: 'yara@hestia.ch', job_title_key: 'concierge_agent', hotel_name: DEFAULT_HOTEL_NAME },                          // concierge_agent
  { full_name: 'Tomas Novak', email: 'tomas@hestia.ch', job_title_key: 'in_room_dining_order_taker', hotel_name: DEFAULT_HOTEL_NAME },              // ird_service
  { full_name: 'Rui Almeida', email: 'rui@hestia.ch', job_title_key: 'fandb_kitchen_staff', hotel_name: DEFAULT_HOTEL_NAME },                       // fnb_kitchen
];

function generateTenantUsers(hotelName) {
  const domain = 'palmhavenhotel.com';
  const templates = [
    { full_name: 'Amina Diallo', job_title_key: 'hotel_manager' },
    { full_name: 'Jonas Fischer', job_title_key: 'front_office_manager' },
    { full_name: 'Sofia Mendes', job_title_key: 'executive_housekeeper' },
    { full_name: 'Daniel Kim', job_title_key: 'engineering_supervisor' },
    { full_name: 'Priya Shah', job_title_key: 'night_auditor' },
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
  // Some deployments don't have the tenant schema (no hotels table / schema cache not updated).
  // In that case, return null and proceed without hotel_id.
  const { data: existing, error: selectErr } = await supabase
    .from('hotels')
    .select('id, name')
    .eq('name', hotelName)
    .limit(1)
    .maybeSingle();

  if (selectErr) {
    const msg = selectErr.message || '';
    if (selectErr.code === 'PGRST205' || /schema cache|Could not find the table/i.test(msg)) {
      console.warn(`[seedUsers] hotels table not available; skipping hotel seeding (${hotelName}).`);
      return null;
    }
    throw selectErr;
  }
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

  // Validate the provided key looks like a service_role JWT (helps avoid "not_admin" confusion).
  function decodeJwtPayload(jwt) {
    try {
      const [, payload] = String(jwt).split('.');
      if (!payload) return null;
      const json = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      return JSON.parse(json);
    } catch {
      return null;
    }
  }
  const payload = decodeJwtPayload(serviceKey);
  const role = payload?.role;
  const ref = payload?.ref;
  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return String(url);
    }
  })();
  console.log(`[seedUsers] Target Supabase URL: ${host}`);
  console.log(`[seedUsers] Key role: ${role ?? 'unknown'}${ref ? ` (ref: ${ref})` : ''}`);
  if (role && role !== 'service_role') {
    console.error(
      `[seedUsers] SUPABASE_SERVICE_ROLE_KEY is not a service_role key (role=${role}).\n` +
        `Go to Supabase Dashboard → Settings → API → "service_role" key and paste it into .env as SUPABASE_SERVICE_ROLE_KEY.`
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // Ensure hotels exist (idempotent)
  const defaultHotelId = await ensureHotelId(supabase, DEFAULT_HOTEL_NAME);
  const newHotelId = await ensureHotelId(supabase, NEW_HOTEL_NAME);

  // Job titles carry both the permission profile and the department, so one
  // lookup settles everything about a user's access.
  const { data: jobTitles, error: jobTitleErr } = await supabase
    .from('job_titles')
    .select('id, key, name, department_id');

  if (jobTitleErr) {
    console.error(
      '[seedUsers] Could not read job_titles: ' + jobTitleErr.message + '\n' +
        'Apply the RBAC migrations first (`supabase db push`), which create and seed the table.'
    );
    process.exit(1);
  }
  if (!jobTitles?.length) {
    console.error('[seedUsers] job_titles is empty. Run `supabase db push` to apply the RBAC seed.');
    process.exit(1);
  }
  const jobTitleMap = Object.fromEntries(jobTitles.map((t) => [t.key, t]));
  console.log(`[seedUsers] Loaded ${jobTitles.length} job titles`);

  const tenantUsers = generateTenantUsers(NEW_HOTEL_NAME);
  const allUsers = [...users, ...tenantUsers];

  // Fail fast on a typo rather than silently seeding a user with no access.
  const unknown = allUsers.filter((u) => !jobTitleMap[u.job_title_key]);
  if (unknown.length) {
    console.error('[seedUsers] Unknown job_title_key values:');
    for (const u of unknown) console.error(`  ${u.email} -> ${u.job_title_key}`);
    process.exit(1);
  }

  for (const u of allUsers) {
    try {
      const jobTitle = jobTitleMap[u.job_title_key];
      const hotelId =
        (u.hotel_name || DEFAULT_HOTEL_NAME) === NEW_HOTEL_NAME ? newHotelId : defaultHotelId;

      // Profile fields are derived from the job title, so department and
      // permissions cannot drift apart.
      const profile = {
        full_name: u.full_name,
        job_title_id: jobTitle.id,
        department_id: jobTitle.department_id,
        ...(hotelId ? { hotel_id: hotelId } : {}),
      };

      // NOTE: hotel_id in user_metadata is what handle_new_auth_user() reads to
      // place a new user in a tenant. That path trusts a value the user can
      // write themselves — tracked as a separate security fix; kept here so
      // seeding keeps working until it is replaced by an invitation table.
      const metadata = {
        full_name: u.full_name,
        role_name: jobTitle.name, // display only; permissions come from the DB
        ...(hotelId ? { hotel_id: hotelId } : {}),
      };

      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: metadata,
      });

      if (authErr) {
        if (authErr.message?.includes('already been registered')) {
          console.log(`Skip (exists): ${u.email}`);
          const { data: existing } = await supabase.auth.admin.listUsers();
          const user = existing?.users?.find((x) => x.email === u.email);
          if (user) {
            const updateRes = await supabase.from('users').update(profile).eq('id', user.id);
            if (updateRes.error) throw updateRes.error;

            await supabase.auth.admin.updateUserById(user.id, { user_metadata: metadata });
            console.log(`  Updated profile for ${u.email} (${jobTitle.name})`);
          }
          continue;
        }
        // Some Supabase setups return a 500 if the auth->public.users trigger fails,
        // even though the auth user was created successfully. If we have a user id,
        // we can still proceed and upsert the public.users row ourselves.
        if (!authUser?.user?.id) throw authErr;
        console.warn(`Warning: auth user created but trigger failed for ${u.email}. Fixing profile via upsert...`);
      }

      const userId = authUser.user.id;
      const upsertRes = await supabase
        .from('users')
        .upsert({ id: userId, ...profile }, { onConflict: 'id' });
      if (upsertRes.error) throw upsertRes.error;

      await supabase.auth.admin.updateUserById(userId, { user_metadata: metadata });

      console.log(`Created: ${u.email} (${jobTitle.name})`);
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

function formatSupabaseError(err) {
  if (!err) return err;
  if (typeof err === 'string') return err;
  if (err instanceof Error) return `${err.name}: ${err.message}\n${err.stack || ''}`;
  try {
    return JSON.stringify(err, Object.getOwnPropertyNames(err), 2);
  } catch (_) {
    try {
      return String(err);
    } catch (__) {
      return '[unserializable error]';
    }
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('[seedUsers] Unhandled promise rejection:\n', formatSupabaseError(reason));
  process.exitCode = 1;
});

main().catch((err) => {
  console.error('[seedUsers] Failed:\n', formatSupabaseError(err));
  process.exit(1);
});
