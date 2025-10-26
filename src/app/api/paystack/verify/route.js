import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server-client";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const { reference, orderId } = await req.json();
    if (!reference || !orderId) {
      return NextResponse.json({ error: "Missing reference or orderId" }, { status: 400 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "PAYSTACK_SECRET_KEY is not set" }, { status: 500 });
    }

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    const ok = data?.status && data?.data?.status === "success";
    if (!ok) {
      return NextResponse.json({ verified: false, error: data?.message || "Verification failed" }, { status: 400 });
    }

    // Mark order as paid
    const admin = getSupabaseAdminClient();
    await admin.from("orders").update({ payment_status: "paid" }).eq("id", orderId);

    return NextResponse.json({ verified: true, data: data.data });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

