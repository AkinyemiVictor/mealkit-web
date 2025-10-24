import { getSupabaseAdminClient } from "@/lib/supabase/server-client";

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
  const discount = Number(
    row.discount ?? (oldPrice > price ? Math.round(((oldPrice - price) / (oldPrice || 1)) * 100) : 0)
  ) || 0;
  return {
    id: String(row.id ?? ""),
    name: row.name || "Fresh produce",
    image: row.image || row.image_url || "",
    price,
    oldPrice,
    unit: row.unit || "",
    stock: row.stock ?? "",
    inSeason: typeof row.inSeason === "boolean" ? row.inSeason : Boolean(row.in_season ?? true),
    discount,
    category: row.category || "",
  };
};

export const fetchAllProducts = async () => {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("products").select("*");
  if (error) throw error;
  return (data || []).map(mapRow);
};

export const fetchProductById = async (id) => {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.from("products").select("*").eq("id", id).limit(1).maybeSingle();
  if (error) throw error;
  return data ? { product: mapRow(data), raw: data } : { product: null, raw: null };
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

