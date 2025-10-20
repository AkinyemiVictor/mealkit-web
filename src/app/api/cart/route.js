import { cookies } from "next/headers";
import { getSupabaseRouteClient } from "@/lib/supabase/route-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getSupabaseRouteClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Not logged in" }), { status: 401 });

  const { data, error } = await supabase
    .from("cart_items")
    .select("id, quantity, products(name, price, image_url)")
    .eq("user_id", user.id);

  if (error) return new Response(JSON.stringify({ error }), { status: 400 });
  return new Response(JSON.stringify(data || []), { status: 200 });
}

export async function POST(req) {
  const supabase = getSupabaseRouteClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response(JSON.stringify({ error: "Not logged in" }), { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), { status: 400 });
  }
  const { product_id, quantity = 1 } = body || {};

  const { error } = await supabase.from("cart_items").insert({
    user_id: user.id,
    product_id,
    quantity,
  });

  if (error) return new Response(JSON.stringify({ error }), { status: 400 });
  return new Response(JSON.stringify({ message: "Item added to cart" }), { status: 201 });
}
