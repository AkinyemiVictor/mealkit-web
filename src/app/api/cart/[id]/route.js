import { NextResponse } from "next/server";

import { getCartForUser, replaceCartForUser } from "@/app/api/_lib/mock-database";
import { computeCartSummary } from "@/lib/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const methodNotAllowed = (allow = "PATCH, DELETE") =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: allow } });

const normaliseUserId = (value) => (value ? String(value).trim() : "guest");
const normaliseQuantity = (value) => {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n));
};

function computeAndPersist(userId, items, base = {}) {
  const summary = computeCartSummary(items, { deliveryFee: base.deliveryFee ?? 0 });
  const nextCart = replaceCartForUser(userId, {
    items,
    subtotal: summary.subtotal,
    deliveryFee: summary.deliveryFee,
    currency: base.currency || "NGN",
    notes: base.notes || "",
  });
  return { cart: nextCart, summary };
}

export async function PATCH(request, { params }) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Cart item id is required" }, { status: 400 });

  const userId = normaliseUserId(payload?.user_id);
  const nextQty = normaliseQuantity(payload?.quantity ?? payload?.orderCount ?? payload?.orderSize);
  if (nextQty == null) return NextResponse.json({ error: "Quantity must be a number" }, { status: 400 });

  const current = getCartForUser(userId);
  const items = Array.isArray(current.items) ? [...current.items] : [];
  const index = items.findIndex((it) => String(it.id) === String(id));
  if (index === -1) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (nextQty === 0) {
    items.splice(index, 1);
  } else {
    items[index] = { ...items[index], quantity: nextQty };
  }

  const { cart, summary } = computeAndPersist(userId, items, current);
  return NextResponse.json({ cart, items: cart.items || [], summary }, { status: 200 });
}

export async function DELETE(request, { params }) {
  const url = new URL(request.url);
  const userId = normaliseUserId(url.searchParams.get("user_id"));
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Cart item id is required" }, { status: 400 });

  const current = getCartForUser(userId);
  const items = Array.isArray(current.items) ? current.items.filter((it) => String(it.id) !== String(id)) : [];
  const { cart, summary } = computeAndPersist(userId, items, current);
  return NextResponse.json({ cart, items: cart.items || [], summary }, { status: 200 });
}

export function GET() {
  return methodNotAllowed();
}

export function POST() {
  return methodNotAllowed();
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: { Allow: "PATCH, DELETE" } });
}
