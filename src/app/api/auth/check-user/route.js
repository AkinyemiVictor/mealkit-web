import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/server-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email() });

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const parsed = schema.safeParse(body || {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  const { email } = parsed.data;
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.getUserByEmail(email);
    if (error) {
      const msg = String(error.message || "").toLowerCase();
      if (msg.includes("not found")) {
        return NextResponse.json({ exists: false }, { status: 200 });
      }
      return NextResponse.json({ error: error.message || "Failed to check user" }, { status: 400 });
    }
    return NextResponse.json({ exists: Boolean(data?.user) }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

