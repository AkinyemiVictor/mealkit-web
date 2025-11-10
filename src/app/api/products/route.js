

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseRouteClient } from "@/lib/supabase/route-client";
import { getSupabaseAdminClient } from "@/lib/supabase/server-client";
import { products as localProducts } from "@/data/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const toSlug = (value) => {
  // Insert separators for camelCase/PascalCase before lowercasing
  const withSeparators = String(value || "").replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  const lowered = withSeparators.toLowerCase();
  const connectors = lowered.replace(/\band\b/g, "-n-").replace(/&/g, "-n-");
  return connectors
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

const mapRowToProduct = (row) => {
  if (!row || typeof row !== "object") return null;
  const price = Number(row.price) || 0;
  const oldPrice = Number(row.oldPrice ?? row.old_price ?? price) || price;
  const discount = oldPrice > price ? Math.round(((oldPrice - price) / (oldPrice || 1)) * 100) : 0;
  const stockCount = row.stock_count != null ? Number(row.stock_count) : null;

  return {
    id: String(row.id ?? ""),
    name: row.name || "Fresh produce",
    image: row.image || row.image_url || row.imageUrl || "",
    price,
    oldPrice,
    unit: row.unit || "",
    stock: stockCount != null && Number.isFinite(stockCount) ? stockCount : row.stock || "",
    inSeason: typeof row.inSeason === "boolean" ? row.inSeason : Boolean(row.in_season ?? row.inseason ?? true),
    discount,
    category: row.category || "",
    categorySlug: toSlug(row.category || "uncategorised") || "uncategorised",
  };
};

export async function GET() {
  try {
    const supabase = getSupabaseRouteClient(cookies());
    let { data, error } = await supabase.from("products").select("*", { head: false });
    if (error) {
      // In production, do not fall back to admin. Surface the error to ensure RLS is configured correctly.
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
      }
      // In non-production only, allow a temporary admin fallback for local/dev environments.
      try {
        const admin = getSupabaseAdminClient();
        const res = await admin.from("products").select("*", { head: false });
        data = res.data;
        error = res.error;
      } catch (e) {
        error = e;
      }
      if (error) {
        // As a last resort (typically for local dev before DB is seeded),
        // fall back to the static product data to keep the app usable.
        try {
          const fallback = Object.values(localProducts || {}).flat();
          const mappedFallback = fallback.map(mapRowToProduct).filter(Boolean);
          const groupedFallback = mappedFallback.reduce((acc, p) => {
            const key = p.categorySlug || "uncategorised";
            if (!acc[key]) acc[key] = [];
            acc[key].push(p);
            return acc;
          }, {});
          return NextResponse.json(
            { grouped: groupedFallback, flat: mappedFallback },
            {
              status: 200,
              headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                "Pragma": "no-cache",
                "Expires": "0",
                "Surrogate-Control": "no-store",
                "Vercel-CDN-Cache-Control": "no-store",
                "X-Source": "local",
              },
            }
          );
        } catch {}
        return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
      }
    }

    const rows = Array.isArray(data) ? data : [];
    const mapped = rows.map(mapRowToProduct).filter(Boolean);

    const grouped = mapped.reduce((acc, p) => {
      const key = p.categorySlug || "uncategorised";
      if (!acc[key]) acc[key] = [];
      acc[key].push(p);
      return acc;
    }, {});

    return NextResponse.json(
      { grouped, flat: mapped },
      {
        status: 200,
        headers: {
          // Prevent CDN and browser caching to ensure live stock
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          "Surrogate-Control": "no-store",
          // Vercel-specific override (harmless elsewhere)
          "Vercel-CDN-Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    return NextResponse.json({ error: err?.message || "Failed to fetch products" }, { status: 500 });
  }
}
