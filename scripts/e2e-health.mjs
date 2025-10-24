// Simple E2E healthcheck runner
// Usage: BASE_URL=http://localhost:3000 node scripts/e2e-health.mjs

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function check(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, { cache: "no-store" }).catch((e) => ({ ok: false, status: 0, err: e }));
  if (!res || !res.ok) {
    const body = res && res.json ? await res.json().catch(() => ({})) : {};
    throw new Error(`FAIL ${path} -> status=${res?.status ?? 0} msg=${body?.error || res?.statusText || "network"}`);
  }
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

(async () => {
  try {
    const supabase = await check("/api/health/supabase");
    console.log("/api/health/supabase", supabase.status, supabase.data);
    const schema = await check("/api/health/schema");
    console.log("/api/health/schema", schema.status, schema.data?.ok);
    if (schema.data && schema.data.ok === false) {
      console.error("Schema check reported missing items.");
      process.exit(2);
    }
    console.log("Healthchecks OK");
    process.exit(0);
  } catch (e) {
    console.error(String(e?.message || e));
    process.exit(1);
  }
})();

