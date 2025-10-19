import { NextResponse } from "next/server";
import { renderReceiptHtml } from "@/lib/email-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FROM_EMAIL = process.env.RECEIPT_FROM_EMAIL || "no-reply@mealkit.local";
const FROM_NAME = process.env.RECEIPT_FROM_NAME || "MealKit";
const RESEND_API_KEY = process.env.RESEND_API_KEY || process.env.RESEND_API_TOKEN;

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const order = payload?.order || payload;
  const to = payload?.to || order?.email || order?.user?.email;
  if (!to) {
    return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
  }

  const subject = `Your MealKit receipt • ${order?.orderId ?? "Order"}`;
  const origin = new URL(request.url).origin;
  const html = renderReceiptHtml(order, { baseUrl: origin });

  // If no API key, accept the request but don't attempt network send
  if (!RESEND_API_KEY) {
    console.log("[receipt] No RESEND_API_KEY set. Rendering preview only.");
    return NextResponse.json({ status: "queued-local", to, subject }, { status: 202 });
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!resp.ok) {
      const errText = await safeText(resp);
      console.warn("[receipt] Resend API error:", resp.status, errText);
      return NextResponse.json({ status: "failed", code: resp.status }, { status: 502 });
    }

    const data = await resp.json().catch(() => ({}));
    return NextResponse.json({ status: "queued", id: data?.id ?? null }, { status: 202 });
  } catch (error) {
    console.warn("[receipt] Send error", error);
    return NextResponse.json({ status: "failed" }, { status: 502 });
  }
}

async function safeText(r) {
  try {
    return await r.text();
  } catch {
    return "";
  }
}

export function GET() {
  return NextResponse.json({ ok: true }, { status: 200, headers: { Allow: "POST" } });
}
