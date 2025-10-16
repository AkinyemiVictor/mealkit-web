import { NextResponse } from "next/server";

import { clearCartForUser, getCartForUser, replaceCartForUser } from "@/app/api/_lib/mock-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedMethodsHeader = { Allow: "GET, POST, DELETE" };

const extractUserId = (request) => {
  const searchParams = new URL(request.url).searchParams;
  return (
    searchParams.get("userId") ||
    request.headers.get("x-user-id") ||
    request.headers.get("X-User-Id") ||
    "guest"
  );
};

const methodNotAllowed = () =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: allowedMethodsHeader });

export function GET(request) {
  const userId = extractUserId(request);
  const cart = getCartForUser(userId);
  return NextResponse.json({ cart });
}

export async function POST(request) {
  const userId = extractUserId(request);

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const cart = replaceCartForUser(payload?.userId || userId, payload);
  return NextResponse.json({ cart, message: "Cart updated" });
}

export function DELETE(request) {
  const userId = extractUserId(request);
  clearCartForUser(userId);
  return NextResponse.json({ success: true, message: "Cart cleared" });
}

export function PUT() {
  return methodNotAllowed();
}

export function PATCH() {
  return methodNotAllowed();
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: allowedMethodsHeader });
}
