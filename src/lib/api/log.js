import { Redis } from "@upstash/redis";

let redis = null;
const getRedis = () => {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;
    if (redis) return redis;
    redis = new Redis({ url, token });
    return redis;
  } catch {
    return null;
  }
};

const safeStringify = (value) => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export async function logAdminEvent(event) {
  const entry = {
    type: "admin:event",
    ts: Date.now(),
    ...event,
  };
  const r = getRedis();
  if (!r) {
    // Fallback to console when Redis is not configured
    console.info("[admin:event]", entry);
    return;
  }
  try {
    await r.lpush("logs:admin-events", safeStringify(entry));
    await r.ltrim("logs:admin-events", 0, 999); // keep last 1000
  } catch (err) {
    console.warn("Unable to log admin event to Redis", err);
    console.info("[admin:event]", entry);
  }
}

export async function logAdminError(error, context = {}) {
  const entry = {
    type: "admin:error",
    ts: Date.now(),
    error: typeof error === "string" ? error : (error?.message || String(error)),
    stack: error?.stack || undefined,
    ...context,
  };
  const r = getRedis();
  if (!r) {
    console.error("[admin:error]", entry);
    return;
  }
  try {
    await r.lpush("logs:admin-errors", safeStringify(entry));
    await r.ltrim("logs:admin-errors", 0, 1999); // keep last 2000
  } catch (err) {
    console.error("Unable to log admin error to Redis", err);
    console.error("[admin:error]", entry);
  }
}

export default { logAdminEvent, logAdminError };

