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

// Support GET redirect-based verification: /api/paystack/verify?reference=...&orderId=...
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const reference = url.searchParams.get("reference");
    const orderIdParam = url.searchParams.get("orderId");

    if (!reference) {
      return NextResponse.redirect(new URL("/checkout/failure?reason=Missing+reference", url.origin));
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.redirect(new URL("/checkout/failure?reason=Missing+server+key", url.origin));
    }

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    const ok = data?.status && data?.data?.status === "success";

    // Try to update order if we have an id (from query or metadata)
    const metaOrderId = String(data?.data?.metadata?.orderId || orderIdParam || "").trim();
    if (ok && metaOrderId) {
      try {
        const admin = getSupabaseAdminClient();
        await admin.from("orders").update({ payment_status: "paid" }).eq("id", metaOrderId);
      } catch {}
    }

    const dest = ok
      ? "/checkout/success"
      : `/checkout/failure?reason=${encodeURIComponent(data?.message || "Verification+failed")}`;
    return NextResponse.redirect(new URL(dest, url.origin));
  } catch (e) {
    const url = new URL(req.url);
    return NextResponse.redirect(new URL(`/checkout/failure?reason=${encodeURIComponent(e?.message || "Server+error")}`, url.origin));
  }
}
