import { NextResponse } from "next/server";

import {
  getCartForUser,
  replaceCartForUser,
  getProductById,
} from "@/app/api/_lib/mock-database";
import { computeCartSummary } from "@/lib/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const methodNotAllowed = (allow = "GET, POST") =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: allow } });

const normaliseUserId = (value) => {
  if (!value) return "guest";
  return String(value).trim() || "guest";
};

const normaliseQuantity = (value, fallback = 1) => {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.round(n);
};

function buildItemRecord(input) {
  // Accept either a full item or minimal { productId, quantity }
  const productId = input?.productId ?? input?.product_id ?? input?.id;
  const product = productId != null ? getProductById(String(productId)) : null;
  const quantity = normaliseQuantity(input?.quantity ?? input?.orderCount ?? input?.orderSize ?? 1, 1);

  if (!product && (!input?.name || !input?.price)) {
    return null;
  }

  const id = product ? product.id : input.id;
  const unit = product ? product.unit : input.unit;
  const name = product ? product.name : input.name;
  const price = Number(product ? product.price : input.price) || 0;

  return { id, name, unit, price, quantity };
}

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

export async function GET(request) {
  const url = new URL(request.url);
  const userId = normaliseUserId(url.searchParams.get("user_id"));
  const cart = getCartForUser(userId);
  return NextResponse.json({ cart, items: cart.items || [] }, { status: 200 });
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const userId = normaliseUserId(payload?.user_id);
  const item = buildItemRecord(payload?.item || payload);
  if (!item) {
    return NextResponse.json({ error: "Missing item or product reference" }, { status: 400 });
  }

  const current = getCartForUser(userId);
  const items = Array.isArray(current.items) ? [...current.items] : [];
  const index = items.findIndex((it) => String(it.id) === String(item.id));
  if (index >= 0) {
    const merged = { ...items[index] };
    merged.quantity = normaliseQuantity((merged.quantity || 0) + (item.quantity || 1), 1);
    merged.price = Number(merged.price || item.price || 0);
    merged.name = merged.name || item.name;
    merged.unit = merged.unit || item.unit;
    items[index] = merged;
  } else {
    items.push(item);
  }

  const { cart, summary } = computeAndPersist(userId, items, current);
  return NextResponse.json({ cart, items: cart.items || [], summary }, { status: 201 });
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
  return NextResponse.json({}, { status: 200, headers: { Allow: "GET, POST" } });
}
