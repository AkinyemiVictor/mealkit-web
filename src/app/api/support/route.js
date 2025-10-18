import { NextResponse } from "next/server";

import { listSupportMessages, submitSupportMessage } from "@/app/api/_lib/mock-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedMethodsHeader = { Allow: "GET, POST" };

const methodNotAllowed = () =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: allowedMethodsHeader });

export function GET(request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const emailFilter = searchParams.get("email")?.toLowerCase();
  const statusFilter = searchParams.get("status");
  const orderIdFilter = searchParams.get("orderId");

  const messages = listSupportMessages().filter((ticket) => {
    if (emailFilter && ticket.email.toLowerCase() !== emailFilter) {
      return false;
    }
    if (statusFilter && ticket.status !== statusFilter) {
      return false;
    }
    if (orderIdFilter && ticket.orderId !== orderIdFilter) {
      return false;
    }
    return true;
  });

  return NextResponse.json({
    count: messages.length,
    messages,
  });
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const message = payload?.message?.toString().trim();
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  const supportRecord = submitSupportMessage({
    name: payload?.name?.toString().trim() || "",
    email: payload?.email?.toString().trim() || "",
    subject: payload?.subject?.toString().trim() || "Support request",
    message,
    orderId: payload?.orderId?.toString() || null,
  });

  return NextResponse.json(
    {
      ticket: supportRecord,
      message: "Support request received",
    },
    { status: 201 }
  );
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
  return NextResponse.json({}, { status: 200, headers: allowedMethodsHeader });
}
