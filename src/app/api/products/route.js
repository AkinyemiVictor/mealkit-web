import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/lib/supabase/server-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mapRowToProduct = (row) => {
  if (!row || typeof row !== "object") return null;
  const price = Number(row.price) || 0;
  const oldPrice = Number(row.oldPrice ?? row.old_price ?? price) || price;
  const discount = oldPrice > price ? Math.round(((oldPrice - price) / (oldPrice || 1)) * 100) : 0;

  return {
    id: String(row.id ?? ""),
    name: row.name || "Fresh produce",
    image: row.image || row.image_url || row.imageUrl || "",
    price,
    oldPrice,
    unit: row.unit || "",
    stock: row.stock || "",
    inSeason: typeof row.inSeason === "boolean" ? row.inSeason : Boolean(row.in_season ?? row.inseason ?? true),
    discount,
    category: row.category || "uncategorised",
  };
};

export async function GET() {
  try {
    const supabase = getSupabaseRouteClient(cookies());
    let { data, error } = await supabase.from("products").select("*");
    if (error) {
      // In production, do not fall back to admin. Surface the error to ensure RLS is configured correctly.
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
      }
      // In non-production only, allow a temporary admin fallback for local/dev environments.
      try {
        const admin = getSupabaseAdminClient();
        const res = await admin.from("products").select("*");
        data = res.data;
        error = res.error;
      } catch (e) {
        error = e;
      }
      if (error) {
        return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
      }
    }

    const rows = Array.isArray(data) ? data : [];
    const mapped = rows.map(mapRowToProduct).filter(Boolean);

    const grouped = mapped.reduce((acc, p) => {
      const key = p.category || "uncategorised";
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {});

    return NextResponse.json(grouped, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Failed to fetch products" }, { status: 500 });
  }
}
