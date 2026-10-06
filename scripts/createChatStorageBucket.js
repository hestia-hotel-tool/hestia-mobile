/**
 * Create the chat-attachments storage bucket in Supabase (required for chat image/file uploads).
 * Requires: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 * Run: node scripts/createChatStorageBucket.js
 *
 * After running, allow authenticated uploads in Dashboard → Storage → chat-attachments → Policies
 * (or use RLS; public read is needed if you use getPublicUrl for message display).
 */

const { createClient } = require('@supabase/supabase-js');
// Loads .env.<APP_ENV> then .env (see scripts/loadEnv.js). Default DB is
// development; use `APP_ENV=production node scripts/createChatStorageBucket.js`.
const { appEnv } = require('./loadEnv');
console.log(`[createChatStorageBucket] target environment: ${appEnv}`);

const BUCKET_NAME = 'chat-attachments';

async function main() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    console.error('Get the service role key from Supabase Dashboard → Settings → API');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);
  const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
    public: true,
  });

  if (error) {
    if (error.message && error.message.includes('already exists')) {
      console.log(`Bucket "${BUCKET_NAME}" already exists.`);
      return;
    }
    console.error('Error creating bucket:', error.message);
    process.exit(1);
  }
  console.log(`Bucket "${BUCKET_NAME}" created successfully.`);
}

main();
