import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import fs from 'node:fs';

const envLocalPath = path.resolve('.env.local');
if (fs.existsSync(envLocalPath)) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: envLocalPath });
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Missing Supabase envs');
  process.exit(1);
}

const client = createClient(url, key, { auth: { persistSession: false } });
try {
  const { data, error } = await client.from('products').select('*').limit(3);
  if (error) throw error;
  console.log('Fetched products:', Array.isArray(data) ? data.length : 0);
  if (Array.isArray(data)) console.log(data);
} catch (e) {
  console.error('Query failed:', e.message);
  process.exit(2);
}
