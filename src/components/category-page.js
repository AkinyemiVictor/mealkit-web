"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import categories, { getCategoryHref } from "@/data/categories";
import CategoryCarouselSkeleton from "@/components/category-carousel-skeleton";
import { formatProductPrice, resolveStockClass } from "@/lib/catalogue";
import { buildCategoryProducts, findCategoryBySlug } from "@/lib/category-products";
import { getProductHref } from "@/lib/products";

const CategoryCarousel = dynamic(() => import("@/components/category-carousel"), {
  loading: () => <CategoryCarouselSkeleton />,
});

const DEFAULT_PAGE_SIZE = 20;

const CATEGORY_CARDS = categories.map((entry) => ({
  slug: entry.slug,
  label: entry.label,
  icon: entry.icon,
  href: getCategoryHref(entry),
}));
const getCategory = (slug) => findCategoryBySlug(slug) || undefined;

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

      <CategoryCarousel
        cards={CATEGORY_CARDS}
        heading="Explore more categories"
        eyebrow="Shop by aisle"
        activeSlug={category.slug}
      />
    </main>
  );
}












