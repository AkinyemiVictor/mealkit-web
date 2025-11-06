import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, amount, reference, orderId, metadata, channels } = body || {};

    if (!email || !amount) {
      return NextResponse.json({ error: "Missing email or amount" }, { status: 400 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: "PAYSTACK_SECRET_KEY is not set" }, { status: 500 });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

    const initPayload = {
      email,
      amount: Math.max(0, Math.round(Number(amount) * 100)),
      reference: reference || undefined,
      callback_url: `${origin}/api/paystack/verify`,
      metadata: {
        orderId: orderId || undefined,
        ...(metadata && typeof metadata === "object" ? metadata : {}),
      },
    };

    if (Array.isArray(channels) && channels.length) {
      initPayload.channels = channels;
    }

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(initPayload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json({ error: data?.message || "Failed to initialize transaction" }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

