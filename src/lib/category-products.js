import categories from "@/data/categories";
import productsData, { products as rawProducts } from "@/data/products";
import { normaliseProductCatalogue } from "@/lib/catalogue";

const aliasMap = new Map([
  ["snackes-pasteries", "snacks-n-pastries"],
  ["fish-sea-food", "fish-n-seafood"],
  ["ocooked-food", "cooked-food"],
]);

const toSlug = (value) => {
  if (value == null) return "";
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

export const mapCategorySlug = (value) => aliasMap.get(toSlug(value)) || toSlug(value);

const catalogueLookup = normaliseProductCatalogue(productsData || rawProducts);
const catalogueIndex = catalogueLookup.index;
const catalogueOrdered = catalogueLookup.ordered;

const getCollectionByKey = (key) => {
  if (!key) return [];
  const base = (productsData && productsData[key]) || (rawProducts && rawProducts[key]);
  return Array.isArray(base) ? base : [];
};

const normaliseFallback = (collection) => normaliseProductCatalogue({ fallback: collection }).ordered;

const uniqueProductsFromCollection = (collection) => {
  const unique = new Map();
  collection.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const id = item.id != null ? String(item.id) : "";
    if (!id) return;
    if (catalogueIndex.has(id)) {
      unique.set(id, catalogueIndex.get(id));
    } else {
      const [normalised] = normaliseFallback([item]);
      if (normalised && normalised.id) {
        unique.set(normalised.id, normalised);
      }
    }
  });
  return Array.from(unique.values());
};

export const buildCategoryProducts = (category) => {
  if (!category) return [];
  const { productKey, slug } = category;

  const primaryCollection = uniqueProductsFromCollection(getCollectionByKey(productKey));
  if (primaryCollection.length) {
    return primaryCollection.sort((a, b) => a.name.localeCompare(b.name));
  }

  const fallbackMatches = catalogueOrdered.filter((product) => mapCategorySlug(product.category) === slug);
  return fallbackMatches.sort((a, b) => a.name.localeCompare(b.name));
};

export const findCategoryBySlug = (slug) => categories.find((entry) => entry.slug === slug) || null;

export default {
  mapCategorySlug,
  buildCategoryProducts,
  findCategoryBySlug,
};
