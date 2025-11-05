import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const methodNotAllowed = () =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });

export async function GET(_request, { params }) {
  const id = params?.id;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("products").select("*", { head: false }).eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  // Try to include variants if table exists
  let variations = [];
  try {
    const { data: variants, error: vError } = await admin
      .from("product_variants")
      .select("*", { head: false })
      .eq("product_id", id)
      .order("id", { ascending: true });
    if (!vError && Array.isArray(variants)) {
      variations = variants.map((row) => ({
        variationId: row.id,
        name: row.name || row.ripeness || row.label || "Option",
        ripeness: row.ripeness || undefined,
        size: row.size || undefined,
        packaging: row.packaging || undefined,
        price: row.price ?? undefined,
        oldPrice: row.old_price ?? undefined,
        unit: row.unit || data.unit || undefined,
        stock: typeof row.in_stock === "boolean" ? (row.in_stock ? "In stock" : "Out of stock") : row.stock || "",
        inSeason: row.in_season ?? undefined,
        image: row.image_url || row.image || "",
        category: row.category || undefined,
      }));
    }
  } catch (_) {}

  return NextResponse.json({ product: data, variations });
}

export function POST() {
  return methodNotAllowed();
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
  return NextResponse.json({}, { status: 200, headers: { Allow: "GET" } });
}
