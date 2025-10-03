import productsData, { products as rawProducts } from "@/data/products";
import { normaliseProductCatalogue } from "@/lib/catalogue";

const catalogueSource = productsData || rawProducts;

const { index: productIndex, ordered: orderedProducts } = normaliseProductCatalogue(catalogueSource);

const rawProductIndex = new Map();

if (catalogueSource && typeof catalogueSource === "object") {
  Object.values(catalogueSource).forEach((collection) => {
    if (!Array.isArray(collection)) return;
    collection.forEach((item) => {
      if (!item || typeof item !== "object") return;
      const id = item.id != null ? String(item.id) : "";
      if (!id || rawProductIndex.has(id)) return;
      rawProductIndex.set(id, item);
    });
  });
}

const slugify = (value) => {
  if (!value) return "";
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_/]+/g, "-")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]+/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
};

export const buildProductSlug = (product) => {
  if (!product) return "";
  const id = product.id != null ? String(product.id) : "";
  const base = slugify(product.name) || "product";
  return id ? `${base}-${id}` : base;
};

const productSlugIndex = new Map();

orderedProducts.forEach((product) => {
  if (!product) return;
  const slug = buildProductSlug(product);
  if (!slug) return;
  productSlugIndex.set(slug, product.id);
});

export const getAllProducts = () => orderedProducts;

export const getProductById = (id) => {
  if (id == null) return null;
  const key = String(id);
  return productIndex.get(key) || null;
};

export const getRawProductById = (id) => {
  if (id == null) return null;
  const key = String(id);
  return rawProductIndex.get(key) || null;
};

const extractIdFromSlug = (slug) => {
  if (!slug) return "";
  if (productSlugIndex.has(slug)) {
    return productSlugIndex.get(slug) || "";
  }
  const match = slug.match(/-(\d+)$/);
  return match ? match[1] : "";
};

export const getProductBySlug = (slug) => {
  const id = extractIdFromSlug(slug);
  if (!id) return null;
  return getProductById(id);
};

export const getRawProductBySlug = (slug) => {
  const id = extractIdFromSlug(slug);
  if (!id) return null;
  return getRawProductById(id);
};

export const getProductHref = (product) => {
  const slug = buildProductSlug(product);
  return slug ? `/products/${slug}` : "#";
};
