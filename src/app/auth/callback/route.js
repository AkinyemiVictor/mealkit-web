import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import getSupabaseRouteClient from "@/lib/supabase/route-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const desc = url.searchParams.get("error_description");

  try {
    if (code) {
      const supabase = getSupabaseRouteClient(cookies());
      await supabase.auth.exchangeCodeForSession(code);
    }
  } catch {}

  const target = error ? "/sign-in?tab=login#loginForm" : "/auth/complete";
  const next = new URL(target, request.url);
  if (error && desc) {
    next.searchParams.set("oauth_error", desc);
  }
  return NextResponse.redirect(next);
}
