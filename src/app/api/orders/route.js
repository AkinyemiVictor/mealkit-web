import { NextResponse } from "next/server";

import { createOrder, listOrders, updateOrderStatus } from "@/app/api/_lib/mock-database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedMethodsHeader = { Allow: "GET, POST, PATCH" };

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

export function GET(request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const userId = extractUserId(request);
  const orderId = searchParams.get("orderId");
  const statusFilter = searchParams.get("status");

  const orders = listOrders({ userId: userId ?? undefined });

  if (orderId) {
    const order = orders.find((item) => item.orderId === orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json({ order });
  }

  const filteredOrders = statusFilter
    ? orders.filter((order) => order.status === statusFilter || order.paymentStatus === statusFilter)
    : orders;

  return NextResponse.json({
    count: filteredOrders.length,
    orders: filteredOrders,
  });
}

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

export async function PATCH(request) {
  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const url = new URL(request.url);
  const orderId = payload?.orderId || url.searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "orderId is required" }, { status: 400 });
  }

  const updated = updateOrderStatus(orderId, {
    status: payload?.status?.toString(),
    paymentStatus: payload?.paymentStatus?.toString(),
  });

  if (!updated) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    order: updated,
    message: "Order updated",
  });
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
