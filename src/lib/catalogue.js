﻿export const formatProductPrice = (value, unit) => {
  const formattedPrice = `₦${Number(value || 0).toLocaleString()}`;
  const normalisedUnit = typeof unit === "string" ? unit.trim() : "";
  return normalisedUnit ? `${formattedPrice}/${normalisedUnit}` : formattedPrice;
};
export const resolveStockClass = (stockText, { lowThreshold = 5 } = {}) => {
  if (stockText == null) return "";
  if (typeof stockText === "number") {
    if (stockText <= 0) return "is-unavailable";
    if (stockText <= lowThreshold) return "is-limited";
    return "is-available";
  }
  const lowered = String(stockText).toLowerCase();
  if (lowered.includes("out")) return "is-unavailable";
  if (lowered.includes("almost") || lowered.includes("low") || lowered.includes("limited")) {
    return "is-limited";
  }
  return "is-available";
};

export const getStockLabel = (stock, { lowThreshold = 5 } = {}) => {
  if (stock == null || stock === "") return "";
  if (typeof stock === "number") {
    if (stock <= 0) return "Out of stock";
    if (stock <= lowThreshold) return `${stock} unit${stock === 1 ? "" : "s"} left`;
    return "In stock";
  }
  return String(stock);
};

export const normaliseProductCatalogue = (catalogue) => {
  const index = new Map();
  const ordered = [];

  if (!catalogue || typeof catalogue !== "object") {
    return { index, ordered };
  }

  Object.values(catalogue).forEach((collection) => {
    if (!Array.isArray(collection)) return;

    collection.forEach((item) => {
      if (!item || typeof item !== "object") return;

      const variant =
        Array.isArray(item.variations) && item.variations.length
          ?
              item.variations.find((entry) => {
                if (!entry || typeof entry !== "object") return false;
                const stockText = entry.stock;
                return !stockText || !String(stockText).toLowerCase().includes("out of stock");
              }) || item.variations[0]
          : item;

      const price = variant.price ?? item.price ?? 0;
      const oldPrice = variant.oldPrice ?? item.oldPrice ?? price;
      const discount = oldPrice > price ? Math.round(((oldPrice - price) / (oldPrice || 1)) * 100) : 0;

      const normalised = {
        id: item.id != null ? String(item.id) : "",
        name: item.name || "Fresh produce",
        image: variant.image || item.image || "",
        price,
        oldPrice,
        unit: variant.unit || item.unit || "",
        stock: variant.stock || item.stock || "",
        inSeason:
          typeof item.inSeason === "boolean"
            ? item.inSeason
            : variant.inSeason ?? true,
        discount,
        category: item.category || variant.category || "",
      };

      if (!normalised.id || index.has(normalised.id)) return;

      index.set(normalised.id, normalised);
      ordered.push(normalised);
    });
  });

  return { index, ordered };
};

const parseProductId = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const pickMostPopularProducts = (list, excludeIds = new Set(), limit = 6) =>
  list
    .filter((product) => !excludeIds.has(product.id))
    .map((product) => {
      const discountScore = Number(product.discount) || 0;
      const seasonScore = product.inSeason ? 5 : 0;
      const stockText = product?.stock;
      const availabilityScore = String(stockText || "").toLowerCase().includes("stock") || Number(stockText) > 0 ? 3 : 0;

      return {
        product,
        score: discountScore * 2 + seasonScore + availabilityScore,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.product.name.localeCompare(b.product.name);
    })
    .slice(0, limit)
    .map((entry) => entry.product);

export const pickNewestProducts = (list, excludeIds = new Set(), limit = 6) =>
  list
    .filter((product) => !excludeIds.has(product.id))
    .slice()
    .sort((a, b) => parseProductId(b.id) - parseProductId(a.id))
    .slice(0, limit);

export const pickInSeasonProducts = (list, excludeIds = new Set(), limit = 6) =>
  list.filter((product) => product.inSeason && !excludeIds.has(product.id)).slice(0, limit);

export default {
  formatProductPrice,
  resolveStockClass,
  getStockLabel,
  normaliseProductCatalogue,
  pickMostPopularProducts,
  pickNewestProducts,
  pickInSeasonProducts,
};



