import { cookies } from "next/headers";
import { z } from "zod";
import { getSupabaseRouteClient } from "@/lib/supabase/route-client";
import { checkRateLimit, applyRateLimitHeaders } from "@/lib/api/rate-limit";
import { respondZodError } from "@/lib/api/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const authClient = getSupabaseRouteClient(cookies());
  const rl = await checkRateLimit({ request: req, id: "cart:list", limit: 120, windowMs: 60_000 });
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Not logged in" }), { status: 401 });

  const { data, error } = await authClient
    .from("cart_items")
    .select("id, quantity, products(name, price, image_url)")
    .eq("user_id", user.id);

  if (error) return new Response(JSON.stringify({ error }), { status: 400 });
  return applyRateLimitHeaders(new Response(JSON.stringify(data || []), { status: 200 }), rl);
}

export async function POST(req) {
  const authClient = getSupabaseRouteClient(cookies());
  const rl = await checkRateLimit({ request: req, id: "cart:add", limit: 60, windowMs: 60_000 });
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Not logged in" }), { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { status: 400 });
  }
  const schema = z.object({
    product_id: z.union([z.string(), z.number()]),
    quantity: z.number().int().positive().max(999).optional().default(1),
  });
  const parsed = schema.safeParse(body || {});
  if (!parsed.success) {
    return respondZodError(parsed.error);
  }
  const { product_id, quantity } = parsed.data;

  const { error } = await authClient.from("cart_items").insert({
    user_id: user.id,
    product_id,
    quantity,
  });

  if (error) return new Response(JSON.stringify({ error }), { status: 400 });
  return applyRateLimitHeaders(new Response(JSON.stringify({ message: "Item added to cart" }), { status: 201 }), rl);
}
