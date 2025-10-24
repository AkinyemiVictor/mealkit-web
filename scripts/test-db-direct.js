// Test connectivity to Supabase Postgres using Direct URL
import 'dotenv/config';
import { Client } from 'pg';
import path from 'node:path';
import fs from 'node:fs';

// Ensure we load .env.local if present
const envLocalPath = path.resolve('.env.local');
if (fs.existsSync(envLocalPath)) {
  const dotenv = await import('dotenv');
  dotenv.config({ path: envLocalPath });
}

const test = async (label, url) => {
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const res = await client.query('select current_user, current_database(), now() as now');
    const row = res.rows[0];
    console.log(`[${label}] OK`, { current_user: row.current_user, current_database: row.current_database, now: row.now });
  } catch (err) {
    console.error(`[${label}] FAILED`, err.message);
    throw err;
  } finally {
    try { await client.end(); } catch {}
  }
};

const direct = process.env.SUPABASE_DB_DIRECT_URL;
const pooler = process.env.SUPABASE_DB_POOLER_URL;

if (!direct) {
  console.error('SUPABASE_DB_DIRECT_URL is not set.');
}

let hadError = false;
if (direct) {
  try { await test('direct', direct); } catch { hadError = true; }
}

if (pooler) {
  try { await test('pooler', pooler); } catch { hadError = true; }
}

process.exit(hadError ? 2 : 0);
