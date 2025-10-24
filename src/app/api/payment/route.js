import { NextResponse } from "next/server";
import { z } from "zod";

import { createPaymentIntent } from "@/app/api/_lib/mock-database";
import { checkRateLimit, applyRateLimitHeaders, getClientIp } from "@/lib/api/rate-limit";
import { respondZodError } from "@/lib/api/validate";

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
  // Rate limit: 10 requests/min per IP for payment init
  const rl = await checkRateLimit({ request, id: "payment:init", limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return applyRateLimitHeaders(
      NextResponse.json({ error: "Too many requests", ip: getClientIp(request) }, { status: 429 }),
      rl
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const schema = z.object({
    amount: z.number().positive(),
    currency: z.string().min(3).max(6).optional(),
    provider: z.string().optional(),
    email: z.string().email().optional(),
    orderId: z.union([z.string(), z.number()]).optional(),
    callbackUrl: z.string().url().optional(),
    metadata: z.record(z.any()).optional(),
  });

  const parse = schema.safeParse(payload);
  if (!parse.success) {
    return respondZodError(parse.error);
  }

  const data = parse.data;
  const amount = data.amount;
  const currency = (data.currency || "NGN").toUpperCase();
  const provider = normaliseProvider(data.provider);
  const email = data.email?.trim();
  const metadata = {
    orderId: data.orderId ?? null,
    callbackUrl: data.callbackUrl ?? null,
    ...(data.metadata || {}),
  };

  const payment = createPaymentIntent({ amount, currency, provider, email, metadata });

  return applyRateLimitHeaders(
    NextResponse.json({ payment, message: `Payment initialised with ${provider}` }, { status: 201 }),
    rl
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
