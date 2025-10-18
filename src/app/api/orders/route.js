import { NextResponse } from "next/server";

import { createOrder } from "@/app/api/_lib/mock-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedMethodsHeader = { Allow: "POST" };

const extractUserId = (request) => {
  const searchParams = new URL(request.url).searchParams;
  return (
    searchParams.get("userId") ||
    request.headers.get("x-user-id") ||
    request.headers.get("X-User-Id") ||
    null
  );
};

const methodNotAllowed = () =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: allowedMethodsHeader });

export async function POST(request) {
  const userIdFromContext = extractUserId(request);

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const userId = payload?.userId || userIdFromContext || "guest";
  const items = Array.isArray(payload?.items) ? payload.items : [];

  if (!items.length) {
    return NextResponse.json({ error: "Order items are required" }, { status: 400 });
  }

  const total = Number.parseFloat(payload?.total) || 0;
  const status = payload?.status?.toString() || "processing";
  const paymentStatus = payload?.paymentStatus?.toString() || "pending";
  const deliveryAddress = payload?.deliveryAddress?.toString() || "";

  const order = createOrder({ userId, items, total, status, paymentStatus, deliveryAddress });

  return NextResponse.json(
    {
      order,
      message: "Order created",
    },
    { status: 201 }
  );
}

export function DELETE() {
  return methodNotAllowed();
}

export function PUT() {
  return methodNotAllowed();
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: allowedMethodsHeader });
}
