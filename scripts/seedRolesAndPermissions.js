/**
 * Seed permissions, roles, and role_permissions into Supabase
 * Requires: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * Run: node scripts/seedRolesAndPermissions.js
 *
 * When querying a role with permissions:
 *   .from('roles').select('*, permissions(name, description)').eq('name', 'Hotel Manager').single()
 */

const { createClient } = require('@supabase/supabase-js');
// Loads .env.<APP_ENV> then .env (see scripts/loadEnv.js). Default DB is
// development; use `APP_ENV=production npm run seed:roles`.
const { appEnv } = require('./loadEnv');
console.log(`[seedRolesAndPermissions] target environment: ${appEnv}`);

const ROLES_AND_PERMISSIONS = {
  permissions: [
    { key: "view_dashboard", description: "View system dashboard" },
    { key: "view_rooms", description: "View room details" },
    { key: "assign_rooms", description: "Assign rooms to staff" },
    { key: "update_room_status", description: "Update room work status" },
    { key: "view_reservations", description: "View reservations" },
    { key: "create_ticket", description: "Create tickets" },
    { key: "update_ticket", description: "Update ticket status or details" },
    { key: "close_ticket", description: "Close tickets" },
    { key: "record_consumption", description: "Record guest consumptions" },
    { key: "bill_consumption", description: "Bill guest consumptions" },
    { key: "report_lost_found", description: "Report lost and found items" },
    { key: "update_lost_found", description: "Update lost and found status" },
    { key: "view_room_history", description: "View room activity history" },
    { key: "send_message", description: "Send chat messages" },
    { key: "view_chats", description: "View chats" },
    { key: "manage_users", description: "Manage system users" },
    { key: "manage_roles", description: "Manage roles and permissions" },
    { key: "system_settings", description: "Manage system settings" },
  ],
  roles: [
    { key: "executive_housekeeper", name: "Executive Housekeeper", permissions: ["view_dashboard", "view_rooms", "assign_rooms", "update_room_status", "create_ticket", "close_ticket", "bill_consumption", "update_lost_found", "view_room_history", "send_message", "view_chats"] },
    { key: "housekeeping_manager", name: "Housekeeping Manager", permissions: ["view_rooms", "assign_rooms", "update_room_status", "create_ticket", "update_ticket", "bill_consumption", "update_lost_found", "view_room_history", "send_message", "view_chats"] },
    { key: "assistant_housekeeping_manager", name: "Assistant Housekeeping Manager", permissions: ["view_rooms", "assign_rooms", "update_room_status", "create_ticket", "update_ticket", "update_lost_found", "view_room_history", "send_message", "view_chats"] },
    { key: "housekeeping_senior_supervisor", name: "Senior Supervisor", permissions: ["view_rooms", "assign_rooms", "update_room_status", "create_ticket", "update_ticket", "view_room_history", "send_message", "view_chats"] },
    { key: "housekeeping_supervisor", name: "Supervisor", permissions: ["view_rooms", "assign_rooms", "update_room_status", "create_ticket", "update_ticket", "send_message", "view_chats"] },
    { key: "housekeeping_coordinator", name: "Coordinator", permissions: ["view_rooms", "assign_rooms", "send_message", "view_chats"] },
    { key: "room_attendant", name: "Housekeeping Room Attendant", permissions: ["view_rooms", "update_room_status", "record_consumption", "report_lost_found", "send_message", "view_chats"] },
    { key: "houseman", name: "Housekeeping Portier / Houseman", permissions: ["view_rooms", "update_room_status", "send_message", "view_chats"] },
    { key: "laundry_attendant", name: "Housekeeping Laundry Attendant", permissions: ["view_rooms", "record_consumption", "send_message", "view_chats"] },
    { key: "public_area_attendant", name: "Housekeeping Public Area Attendant", permissions: ["view_rooms", "update_room_status", "send_message", "view_chats"] },
    { key: "director_of_rooms", name: "Director of Rooms", permissions: ["view_dashboard", "view_rooms", "assign_rooms", "view_reservations", "close_ticket", "bill_consumption", "view_room_history", "send_message", "view_chats"] },
    { key: "assistant_director_of_rooms", name: "Assistant Director of Rooms", permissions: ["view_rooms", "assign_rooms", "view_reservations", "update_ticket", "view_room_history", "send_message", "view_chats"] },
    { key: "front_office_director", name: "Director of Front Office", permissions: ["view_dashboard", "view_rooms", "view_reservations", "create_ticket", "close_ticket", "bill_consumption", "view_room_history", "send_message", "view_chats"] },
    { key: "front_office_manager", name: "Front Office Manager", permissions: ["view_rooms", "view_reservations", "create_ticket", "update_ticket", "bill_consumption", "send_message", "view_chats"] },
    { key: "front_office_supervisor", name: "Front Office Supervisor", permissions: ["view_rooms", "view_reservations", "create_ticket", "update_ticket", "send_message", "view_chats"] },
    { key: "front_office_agent", name: "Front Office Agent", permissions: ["view_rooms", "view_reservations", "create_ticket", "record_consumption", "send_message", "view_chats"] },
    { key: "front_office_trainee", name: "Front Office Trainee", permissions: ["view_rooms", "view_reservations", "send_message", "view_chats"] },
    { key: "night_manager", name: "Night Manager", permissions: ["view_dashboard", "view_rooms", "view_reservations", "close_ticket", "bill_consumption", "view_room_history", "send_message", "view_chats"] },
    { key: "night_auditor", name: "Night Auditor", permissions: ["view_rooms", "view_reservations", "bill_consumption", "send_message", "view_chats"] },
    { key: "night_agent", name: "Night Agent", permissions: ["view_rooms", "create_ticket", "send_message", "view_chats"] },
    { key: "engineering_director", name: "Director of Engineering", permissions: ["view_dashboard", "view_rooms", "update_ticket", "close_ticket", "view_room_history", "send_message", "view_chats"] },
    { key: "engineering_supervisor", name: "Engineering Supervisor", permissions: ["view_rooms", "update_ticket", "close_ticket", "send_message", "view_chats"] },
    { key: "shift_engineer", name: "Shift Engineer", permissions: ["view_rooms", "update_ticket", "send_message", "view_chats"] },
    { key: "it_admin", name: "IT Manager", permissions: ["view_dashboard", "manage_users", "manage_roles", "system_settings", "send_message", "view_chats"] },
    { key: "general_manager", name: "General Manager", permissions: ["view_dashboard", "manage_users", "manage_roles", "view_rooms", "view_reservations", "close_ticket", "bill_consumption", "system_settings", "view_room_history", "send_message", "view_chats"] },
    { key: "hotel_manager", name: "Hotel Manager", permissions: ["view_dashboard", "view_rooms", "view_reservations", "close_ticket", "bill_consumption", "view_room_history", "send_message", "view_chats"] },
  ],
};

async function main() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    console.error('Add to .env: SUPABASE_SERVICE_ROLE_KEY=... (from Dashboard → Settings → API)');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  // 1. Seed permissions - name from JSON key, description as description
  console.log('Seeding permissions...');
  const permRows = ROLES_AND_PERMISSIONS.permissions.map(p => ({
    name: p.key,
    description: p.description,
  }));
  const { error: permErr } = await supabase.from('permissions').upsert(permRows, { onConflict: 'name' });
  if (permErr) {
    console.error('  Failed permissions:', permErr.message);
    process.exit(1);
  }
  console.log(`  Done: ${permRows.length} permissions`);

  // 2. Seed roles - name and description
  console.log('Seeding roles...');
  const roleRows = ROLES_AND_PERMISSIONS.roles.map(r => ({
    name: r.name,
    description: r.name,
  }));
  const { error: roleErr } = await supabase.from('roles').upsert(roleRows, { onConflict: 'name' });
  if (roleErr) {
    console.error('  Failed roles:', roleErr.message);
    process.exit(1);
  }
  console.log(`  Done: ${roleRows.length} roles`);

  // 3. Fetch role and permission IDs by name
  const { data: roles } = await supabase.from('roles').select('id, name');
  const { data: perms } = await supabase.from('permissions').select('id, name');
  const roleIdByName = Object.fromEntries((roles || []).map(r => [r.name, r.id]));
  const permIdByName = Object.fromEntries((perms || []).map(p => [p.name, p.id]));

  // 4. Seed role_permissions (associate permissions to roles)
  console.log('Seeding role_permissions...');
  const rpRows = [];
  for (const r of ROLES_AND_PERMISSIONS.roles) {
    const roleId = roleIdByName[r.name];
    if (!roleId) {
      console.warn(`  Role not found: ${r.name}`);
      continue;
    }
    for (const permName of r.permissions) {
      const permId = permIdByName[permName];
      if (!permId) {
        console.warn(`  Permission not found: ${permName} (for role ${r.name})`);
        continue;
      }
      rpRows.push({ role_id: roleId, permission_id: permId });
    }
  }
  const { error: rpErr } = await supabase.from('role_permissions').upsert(rpRows, {
    onConflict: 'role_id,permission_id',
  });
  if (rpErr) {
    console.error('  Failed role_permissions:', rpErr.message);
    process.exit(1);
  }
  console.log(`  Done: ${rpRows.length} role-permission associations`);

  console.log('\nDone. Query role with permissions: .from("roles").select("*, permissions(name, description)").eq("name", "Hotel Manager").single()');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
