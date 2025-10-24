import { cookies } from "next/headers";
import { z } from "zod";
import { NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/lib/supabase/server-client";
import { checkRateLimit, applyRateLimitHeaders } from "@/lib/api/rate-limit";
import { logAdminEvent, logAdminError } from "@/lib/api/log";
import { respondZodError } from "@/lib/api/validate";

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

export async function POST(req) {
  const rl = await checkRateLimit({ request: req, id: "admin:deactivate-user", limit: 30, windowMs: 60_000 });
  const auth = getSupabaseRouteClient(cookies());
  const { data: { user }, error: authErr } = await auth.auth.getUser();
  if (authErr) {
    await logAdminError(authErr, { route: "/api/admin/deactivate-user", stage: "auth" });
    return applyRateLimitHeaders(NextResponse.json({ error: authErr.message }, { status: 401 }), rl);
  }
  if (!user) {
    await logAdminError("Not authenticated", { route: "/api/admin/deactivate-user", stage: "auth" });
    return applyRateLimitHeaders(NextResponse.json({ error: "Not authenticated" }, { status: 401 }), rl);
  }
  if (!isAdminEmail(user.email)) {
    await logAdminError("Forbidden admin attempt", { route: "/api/admin/deactivate-user", actor: user.email });
    return applyRateLimitHeaders(NextResponse.json({ error: "Forbidden" }, { status: 403 }), rl);
  }

  let body;
  try { body = await req.json(); } catch { return applyRateLimitHeaders(NextResponse.json({ error: "Invalid JSON" }, { status: 400 }), rl); }

  const schema = z.object({
    user_id: z.string().min(1, "user_id required"),
  });
  const parsed = schema.safeParse(body || {});
  if (!parsed.success) {
    await logAdminError("Validation failed", { route: "/api/admin/deactivate-user", issues: parsed.error.issues });
    return applyRateLimitHeaders(respondZodError(parsed.error), rl);
  }

  const { user_id } = parsed.data;
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.rpc("deactivate_user", { user_id });
  if (error) {
    await logAdminError(error, { route: "/api/admin/deactivate-user", actor: user.email, user_id });
    return applyRateLimitHeaders(NextResponse.json({ error: error.message }, { status: 400 }), rl);
  }
  await logAdminEvent({ route: "/api/admin/deactivate-user", actor: user.email, user_id, ok: true });
  return applyRateLimitHeaders(NextResponse.json({ ok: true, data }), rl);
}
