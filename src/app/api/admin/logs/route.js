import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Redis } from "@upstash/redis";
import { getSupabaseRouteClient } from "@/lib/supabase/route-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isAdminEmail = (email) => {
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return false;
  return typeof email === "string" && list.includes(email.toLowerCase());
};

const getRedis = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
};

function safeParse(line) {
  try { return JSON.parse(line); } catch { return { raw: line }; }
}

export async function GET(request) {
  const auth = getSupabaseRouteClient(cookies());
  const { data: { user } } = await auth.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const qp = Object.fromEntries(url.searchParams.entries());
  const schema = z.object({
    type: z.enum(["errors", "events"]).optional().default("errors"),
    limit: z.coerce.number().int().min(1).max(500).optional().default(50),
    offset: z.coerce.number().int().min(0).optional().default(0),
  });
  const parsed = schema.safeParse(qp);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query", issues: parsed.error.issues }, { status: 400 });
  }
  const { type, limit, offset } = parsed.data;

  const listKey = type === "events" ? "logs:admin-events" : "logs:admin-errors";

  const r = getRedis();
  if (!r) {
    return NextResponse.json({
      error: "Logging backend not configured",
      hint: "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN",
    }, { status: 501 });
  }

  const start = offset;
  const end = offset + limit - 1;
  let items = await r.lrange(listKey, start, end);
  items = Array.isArray(items) ? items.map(safeParse) : [];

  return NextResponse.json({
    type,
    offset,
    limit,
    items,
    nextOffset: offset + items.length,
  }, { status: 200 });
}
