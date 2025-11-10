import { getSupabaseAdminClient } from "@/lib/supabase/server-client";
import { getAllProducts as getStaticAllProducts, getProductById as getStaticProductById, getRawProductById as getStaticRawProductById } from "@/lib/products";

const slugify = (value) =>
  String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_/]+/g, "-")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]+/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();

export const buildProductSlug = (product) => {
  const id = product?.id != null ? String(product.id) : "";
  const base = slugify(product?.name || "product");
  return id ? `${base}-${id}` : base;
};

export const extractIdFromSlug = (slug) => {
  if (!slug) return "";
  const match = String(slug).match(/-(\d+)$/);
  return match ? match[1] : "";
};

const mapRow = (row) => {
  const price = Number(row.price) || 0;
  const oldPrice = Number(row.oldPrice ?? row.old_price ?? price) || price;
  const discount = oldPrice > price ? Math.round(((oldPrice - price) / (oldPrice || 1)) * 100) : 0;
  const stockCount = row.stock_count != null ? Number(row.stock_count) : null;
  return {
    id: String(row.id ?? ""),
    name: row.name || "Fresh produce",
    image: row.image || row.image_url || "",
    price,
    oldPrice,
    unit: row.unit || "",
    stock: stockCount != null && Number.isFinite(stockCount) ? stockCount : row.stock ?? "",
    inSeason: typeof row.inSeason === "boolean" ? row.inSeason : Boolean(row.in_season ?? true),
    discount,
    category: row.category || "",
  };
};

export const fetchAllProducts = async () => {
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin.from("products").select("*", { head: false });
    if (error) throw error;
    return (data || []).map(mapRow);
  } catch (e) {
    // Graceful fallback to bundled catalogue if DB is unavailable
    try {
      return getStaticAllProducts();
    } catch (_) {
      throw e;
    }
  }
};

export const fetchProductById = async (id) => {
  try {
    const admin = getSupabaseAdminClient();
    const { data, error } = await admin
      .from("products")
      .select("*", { head: false })
      .eq("id", id)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { product: null, raw: null };

    // Try to load structured variations from a dedicated variants table if present
    let variations = [];
    try {
      const { data: variantsData, error: variantsError } = await admin
        .from("product_variants")
        .select("*", { head: false })
        .eq("product_id", id)
        .order("id", { ascending: true });
      if (!variantsError && Array.isArray(variantsData)) {
        variations = variantsData.map((row) => ({
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
    } catch (_) {
      // Variants table may not exist yet; ignore
    }

    const raw = variations.length ? { ...data, variations } : data;
    return { product: mapRow(raw), raw };
  } catch (e) {
    // Graceful fallback to bundled catalogue if DB is unavailable
    try {
      const product = getStaticProductById(id);
      const raw = getStaticRawProductById(id);
      return { product: product || null, raw: raw || null };
    } catch (_) {
      throw e;
    }
  }
};

export const fetchProductBySlug = async (slug) => {
  const id = extractIdFromSlug(slug);
  if (!id) return { product: null, raw: null };
  return fetchProductById(id);
};

export default {
  buildProductSlug,
  extractIdFromSlug,
  fetchAllProducts,
  fetchProductById,
  fetchProductBySlug,
};
