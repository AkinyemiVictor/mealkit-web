import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/lib/supabase/server-client";
import { checkRateLimit, applyRateLimitHeaders } from "@/lib/api/rate-limit";
import { logAdminError, logAdminEvent } from "@/lib/api/log";
import { sendOrderReceiptEmail } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedMethodsHeader = { Allow: "GET, POST" };

export async function POST(request) {
  const rl = await checkRateLimit({ request, id: "orders:create", limit: 30, windowMs: 60_000 });
  const auth = getSupabaseRouteClient(cookies());
  const { data: { user }, error: authErr } = await auth.auth.getUser();
  if (authErr) return applyRateLimitHeaders(NextResponse.json({ error: authErr.message }, { status: 401 }), rl);
  if (!user) return applyRateLimitHeaders(NextResponse.json({ error: "Not authenticated" }, { status: 401 }), rl);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return applyRateLimitHeaders(NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 }), rl);
  }

  const schema = z.object({
    deliveryAddress: z.string().max(500).optional().default(""),
    note: z.string().max(500).optional(),
  });
  const parsed = schema.safeParse(payload || {});
  if (!parsed.success) {
    return applyRateLimitHeaders(NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 }), rl);
  }

  const admin = getSupabaseAdminClient();

  // 1) Fetch cart items with product snapshot
  const { data: items, error: cartErr } = await admin
    .from("cart_items")
    .select("id, product_id, quantity, products:products(id, name, unit, price)")
    .eq("user_id", user.id);
  if (cartErr) return applyRateLimitHeaders(NextResponse.json({ error: cartErr.message }, { status: 400 }), rl);
  const cart = Array.isArray(items) ? items : [];
  if (cart.length === 0) {
    return applyRateLimitHeaders(NextResponse.json({ error: "Cart is empty" }, { status: 400 }), rl);
  }

  const orderTotal = cart.reduce((sum, row) => sum + Number(row?.products?.price || 0) * Number(row?.quantity || 0), 0);

  // 2) Create order row
  const orderRow = {
    user_id: user.id,
    total: orderTotal,
    status: "processing",
    payment_status: "pending",
    delivery_address: parsed.data.deliveryAddress || "",
    note: parsed.data.note || null,
  };
  const { data: orderIns, error: orderErr } = await admin
    .from("orders")
    .insert(orderRow)
    .select("id, total, status, payment_status, delivery_address, created_at")
    .single();
  if (orderErr) return applyRateLimitHeaders(NextResponse.json({ error: orderErr.message }, { status: 400 }), rl);

  // 3) Insert order_items
  const orderId = orderIns.id;
  const orderItems = cart.map((c) => ({
    order_id: orderId,
    product_id: c.product_id,
    quantity: c.quantity,
    unit_price: Number(c?.products?.price || 0),
  }));
  const { error: oiErr } = await admin.from("order_items").insert(orderItems);
  if (oiErr) {
    await logAdminError(oiErr, { route: "/api/orders", stage: "insert:order_items", order_id: orderId, user_id: user.id });
    return applyRateLimitHeaders(NextResponse.json({ error: oiErr.message }, { status: 400 }), rl);
  }

  // 4) Clear cart
  const { error: clearErr } = await admin.from("cart_items").delete().eq("user_id", user.id);
  if (clearErr) {
    await logAdminError(clearErr, { route: "/api/orders", stage: "clear:cart", order_id: orderId, user_id: user.id });
    // Not fatal: return success but inform caller
  }

  await logAdminEvent({ route: "/api/orders", stage: "created", order_id: orderId, user_id: user.id, total: orderTotal });

  // Fire-and-forget email receipt (if configured)
  try {
    const email = user?.email || null;
    if (email) {
      const normalized = {
        orderId: String(orderIns.id),
        createdAt: orderIns.created_at,
        summary: { total: Math.round(orderIns.total), subtotal: Math.round(orderIns.total), deliveryFee: 0 },
        items: cart.map((c) => ({
          name: c?.products?.name || `Product ${c.product_id}`,
          unit: c?.products?.unit || "",
          quantity: Number(c?.quantity) || 0,
          price: Math.round(Number(c?.products?.price) || 0),
        })),
        user: { email, address: orderRow.delivery_address || "" },
      };
      // Do not await to keep latency low
      sendOrderReceiptEmail({ to: email, order: normalized }).catch(() => {});
    }
  } catch {}

  return applyRateLimitHeaders(NextResponse.json({ order: orderIns, items: orderItems }, { status: 201 }), rl);
}

export async function GET(request) {
  const rl = await checkRateLimit({ request, id: "orders:list", limit: 60, windowMs: 60_000 });
  const auth = getSupabaseRouteClient(cookies());
  const { data: { user }, error: authErr } = await auth.auth.getUser();
  if (authErr) return applyRateLimitHeaders(NextResponse.json({ error: authErr.message }, { status: 401 }), rl);
  if (!user) return applyRateLimitHeaders(NextResponse.json({ error: "Not authenticated" }, { status: 401 }), rl);

  const routeClient = getSupabaseRouteClient(cookies());
  const { data, error } = await routeClient
    .from("orders")
    .select(
      "id, total, status, payment_status, delivery_address, created_at, order_items:order_items(order_id, product_id, quantity, unit_price, products(name, unit, image_url))"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return applyRateLimitHeaders(NextResponse.json({ error: error.message }, { status: 400 }), rl);

  const rows = Array.isArray(data) ? data : [];
  const normalize = (row) => {
    const items = Array.isArray(row?.order_items) ? row.order_items : [];
    return {
      id: row.id,
      total: Number(row.total) || 0,
      status: row.status || "processing",
      paymentStatus: row.payment_status || "pending",
      deliveryAddress: row.delivery_address || "",
      createdAt: row.created_at,
      items: items.map((it) => {
        const unit = Number(it?.unit_price) || 0;
        const qty = Number(it?.quantity) || 0;
        const prod = it?.products || {};
        return {
          orderId: it.order_id,
          productId: it.product_id,
          quantity: qty,
          unitPrice: unit,
          lineTotal: unit * qty,
          product: {
            name: prod?.name || "",
            title: prod?.name || "",
            unit: prod?.unit || "",
            image: prod?.image_url || prod?.image || "",
          },
        };
      }),
    };
  };
  const orders = rows.map(normalize);
  return applyRateLimitHeaders(NextResponse.json({ orders }, { status: 200 }), rl);
}

export function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: allowedMethodsHeader });
}
