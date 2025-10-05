"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import CategoryCarousel from "@/components/category-carousel";
import categories, { getCategoryHref } from "@/data/categories";
import productsData, { products as rawProducts } from "@/data/products";
import { formatProductPrice, normaliseProductCatalogue, resolveStockClass } from "@/lib/catalogue";
import { getProductHref } from "@/lib/products";

const catalogueLookup = normaliseProductCatalogue(productsData || rawProducts);
const catalogueIndex = catalogueLookup.index;
const catalogueOrdered = catalogueLookup.ordered;

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

const mapCategorySlug = (value) => aliasMap.get(toSlug(value)) || toSlug(value);

const DEFAULT_PAGE_SIZE = 20;

const CATEGORY_CARDS = categories.map((entry) => ({
  slug: entry.slug,
  label: entry.label,
  icon: entry.icon,
  href: getCategoryHref(entry),
}));
const getCategory = (slug) => categories.find((entry) => entry.slug === slug);

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

const buildCategoryProducts = (category) => {
  if (!category) return [];
  const { productKey, slug } = category;

  const primaryCollection = uniqueProductsFromCollection(getCollectionByKey(productKey));
  if (primaryCollection.length) {
    return primaryCollection.sort((a, b) => a.name.localeCompare(b.name));
  }

  const targetSlug = slug;
  const fallbackMatches = catalogueOrdered.filter((product) => {
    const productSlug = mapCategorySlug(product.category);
    return productSlug === targetSlug;
  });

  return fallbackMatches.sort((a, b) => a.name.localeCompare(b.name));
};

function CategoryProductCard({ product }) {
  const stockClass = resolveStockClass(product.stock);
  const hasOldPrice = product.oldPrice && product.oldPrice > product.price;
  const href = getProductHref(product);

  return (
    <Link href={href} className="product-card" aria-label={`View ${product.name}`} prefetch={false}>
      <span className="product-card-badges">
        {product.discount ? (
          <div className="product-card-discount">
            <p>- {product.discount}%</p>
          </div>
        ) : null}
        <div className="product-card-season">
          <p>{product.inSeason ? "In Season" : "Off Season"}</p>
        </div>
      </span>
      <div>
        <img
          src={product.image || "/assets/img/product images/tomato-fruit-isolated-transparent-background.png"}
          alt={product.name}
          className="productImg"
          loading="lazy"
        />
        <div className="product-card-details">
          <h4>{product.name}</h4>
          <span>
            <p className="price">{formatProductPrice(product.price, product.unit)}</p>
          </span>
          {hasOldPrice ? (
            <span className="old-price">{formatProductPrice(product.oldPrice, product.unit)}</span>
          ) : null}
          {product.stock ? (
            <p className={`product-stock ${stockClass}`.trim()}>{product.stock}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default function CategoryPage({ category: incomingCategory, pageSize = DEFAULT_PAGE_SIZE }) {
  const category =
    typeof incomingCategory === "string"
      ? getCategory(incomingCategory)
      : incomingCategory || null;
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = category?.itemsPerPage || pageSize || DEFAULT_PAGE_SIZE;

  const categoryProducts = useMemo(() => buildCategoryProducts(category), [category]);
  const totalPages = Math.max(1, Math.ceil(categoryProducts.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryProducts.length, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return categoryProducts.slice(start, start + itemsPerPage);
  }, [categoryProducts, currentPage, itemsPerPage]);

  const placeholderCount = Math.max(itemsPerPage - pagedProducts.length, 0);
  const placeholderSlots = useMemo(
    () => Array.from({ length: placeholderCount }, (_, index) => index),
    [placeholderCount]
  );

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
  };

  if (!category) {
    return (
      <main className="category-page">
        <div className="category-empty-state">
          <strong>Category not found.</strong>
          Please return to the home page to explore available aisles.
        </div>
      </main>
    );
  }

  const start = categoryProducts.length ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const end = Math.min(currentPage * itemsPerPage, categoryProducts.length);

  return (
    <main className="category-page" data-category-slug={category.slug}>
      <div className="category-page__header">
        <div className="category-page__title">
          <span className="categoryCard__icon" aria-hidden="true">
            <i className={`fa-solid ${category.icon}`} />
          </span>
          <div>
            <h1 className="categoryCard__label">{category.label}</h1>
            <p className="category-page__description">{category.description}</p>
          </div>
        </div>
        <div className="category-page__controls">
          <p id="result-count" aria-live="polite">
            {categoryProducts.length
              ? `Showing ${start}-${end} of ${categoryProducts.length} products`
              : "No products available right now"}
          </p>
          {totalPages > 1 ? (
            <div className="pagination-nav" role="navigation" aria-label="Pagination">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  className={page === currentPage ? "active" : undefined}
                  aria-current={page === currentPage ? "page" : undefined}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <CategoryCarousel
        cards={CATEGORY_CARDS}
        heading="Explore more categories"
        eyebrow="Shop by aisle"
        activeSlug={category.slug}
      />

      <section className="category-products" aria-live="polite">
        {categoryProducts.length ? (
          <div className="product-card-grid">
            {pagedProducts.map((product) => (
              <CategoryProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="category-empty-state">
            <strong>No products are available right now.</strong>
            Please check back soon - we are updating this aisle.
          </div>
        )}
      </section>
    </main>
  );
}










