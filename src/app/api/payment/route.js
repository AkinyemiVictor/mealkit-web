import { NextResponse } from "next/server";

import { createPaymentIntent } from "@/app/api/_lib/mock-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const methodNotAllowed = () =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });

const normaliseProvider = (provider) => {
  const value = provider?.toString().toLowerCase();
  if (value === "flutterwave" || value === "wave" || value === "flw") return "flutterwave";
  return "paystack";
};

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const amount = Number.parseFloat(payload?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  }

  const currency = payload?.currency?.toString().toUpperCase() || "NGN";
  const provider = normaliseProvider(payload?.provider);
  const email = payload?.email?.toString().trim();

  const metadata = {
    orderId: payload?.orderId ?? null,
    callbackUrl: payload?.callbackUrl ?? null,
    ...((payload?.metadata && typeof payload.metadata === "object" && !Array.isArray(payload.metadata)) ? payload.metadata : {}),
  };

  const payment = createPaymentIntent({ amount, currency, provider, email, metadata });

  return NextResponse.json(
    {
      payment,
      message: `Payment initialised with ${provider}`,
    },
    { status: 201 }
  );
}

export function GET() {
  return methodNotAllowed();
}

export function PUT() {
  return methodNotAllowed();
}

export function PATCH() {
  return methodNotAllowed();
}

export function DELETE() {
  return methodNotAllowed();
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: { Allow: "POST" } });
}
