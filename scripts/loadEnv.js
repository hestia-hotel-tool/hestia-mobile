/**
 * Shared env loader for Node scripts (seed/admin tools).
 *
 * Mirrors Expo's dotenv precedence so a script talks to the SAME database the
 * app would for a given APP_ENV. Switch DB with the env var:
 *
 *     npm run seed:users                       -> development (default)
 *     APP_ENV=production npm run seed:users    -> production
 *
 * SUPABASE_SERVICE_ROLE_KEY is a SECRET — it lives only in the gitignored
 * .env.<env> files, has NO `EXPO_PUBLIC_` prefix, and is therefore never
 * inlined into the client app bundle. Never add the EXPO_PUBLIC_ prefix to it.
 *
 * Precedence (first definition of a key wins), highest first:
 *   .env.<APP_ENV>.local, .env.local, .env.<APP_ENV>, .env
 * Real process.env (shell) always wins over file values.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
// Default to development so an accidental run never writes to production.
const appEnv = process.env.APP_ENV || 'development';

const FILES = [
  `.env.${appEnv}.local`,
  '.env.local',
  `.env.${appEnv}`,
  '.env',
];

const fromFiles = {};
for (const file of FILES) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) continue;
  for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue; // skips blanks and `#` comments
    const key = m[1];
    if (key in fromFiles) continue; // earlier (higher-priority) file wins
    fromFiles[key] = m[2].replace(/^["']|["']$/g, '');
  }
}

for (const [key, value] of Object.entries(fromFiles)) {
  if (!(key in process.env)) process.env[key] = value; // shell wins
}

module.exports = { appEnv };
