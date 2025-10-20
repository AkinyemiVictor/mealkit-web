import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseRouteClient } from "@/lib/supabase/route-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabaseRouteClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const quantityNum = Number(body?.quantity);
  if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
    return NextResponse.json({ error: "Quantity must be a number > 0" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("cart_items")
    .update({ quantity: quantityNum })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!data || data.length === 0) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json({ message: "Quantity updated" }, { status: 200 });
}

export async function DELETE(req, { params }) {
  const { id } = params || {};
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = getSupabaseRouteClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!data || data.length === 0) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json({ message: "Item removed" }, { status: 200 });
}
