/**
 * Give every guest without a `primary_email` a made-up one built from their name,
 * e.g. "Zoe Tsakeri" -> zoe.tsakeri42@example.com.
 *
 * Only fills blanks — an existing address is never overwritten. Uses the
 * reserved example.com domain so a stray send can never reach a real inbox.
 *
 * Requires: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * Run:      node scripts/seedGuestEmails.js [--dry-run]
 */

const { createClient } = require('@supabase/supabase-js');
// Default DB is development; use `APP_ENV=production` to target production.
const { appEnv } = require('./loadEnv');
console.log(`[seedGuestEmails] target environment: ${appEnv}`);

const DRY_RUN = process.argv.includes('--dry-run');

/** "Zoé O'Neil-Smith" -> ["zoe", "oneilsmith"] */
function nameParts(fullName) {
  return String(fullName ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/\s+/)
    .map((p) => p.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);
}

function makeEmail(fullName) {
  const parts = nameParts(fullName);
  const first = parts[0] ?? 'guest';
  const last = parts.length > 1 ? parts[parts.length - 1] : '';
  const n = Math.floor(Math.random() * 900) + 100;
  const patterns = last
    ? [`${first}.${last}${n}`, `${first}${last}${n}`, `${first[0]}${last}${n}`, `${first}_${n}`, `${last}.${first}${n}`]
    : [`${first}${n}`];
  const local = patterns[Math.floor(Math.random() * patterns.length)];
  return `${local}@example.com`;
}

async function main() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data, error } = await supabase.from('guests').select('id, full_name, primary_email');
  if (error) {
    console.error('Failed to read guests:', error.message);
    process.exit(1);
  }

  const missing = (data ?? []).filter((g) => !String(g.primary_email ?? '').trim());
  console.log(`${data.length} guests, ${missing.length} without an email.`);
  if (DRY_RUN || missing.length === 0) return;

  let updated = 0;
  for (const guest of missing) {
    const { error: updateError } = await supabase
      .from('guests')
      .update({ primary_email: makeEmail(guest.full_name) })
      .eq('id', guest.id);
    if (updateError) console.error(`Failed for ${guest.id}:`, updateError.message);
    else updated += 1;
  }
  console.log(`Done: ${updated} guests given an email.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
