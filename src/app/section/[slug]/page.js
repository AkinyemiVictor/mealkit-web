"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";

import useProducts from "@/lib/use-products";
import {
  formatProductPrice,
  normaliseProductCatalogue,
  pickMostPopularProducts,
  pickNewestProducts,
  pickInSeasonProducts,
  resolveStockClass,
  getStockLabel,
} from "@/lib/catalogue";
import { readCartItems } from "@/lib/cart-storage";
import { getProductHref } from "@/lib/products";

const RECENTLY_VIEWED_STORAGE_KEY = "mealkit_recently_viewed";

function ProductCard({ product }) {
  const stockClass = resolveStockClass(product.stock);
  const stockLabel = getStockLabel(product.stock);
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
        <div className={`product-card-season ${product.inSeason ? 'is-in' : 'is-out'}`}>
          <p>{product.inSeason ? "In Season" : "Out of Season"}</p>
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
          {stockLabel ? (
            <p className={`product-stock ${stockClass}`.trim()}>{stockLabel}</p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export default function SectionViewPage({ params }) {
  // In client pages, params is a Promise in React 19/Next 15.
  // Unwrap it using React.use to avoid the deprecation warning.
  const { slug } = use(params);
  const { ordered: allProducts, index: productIndex } = useProducts();

  const [items, setItems] = useState([]);

  useEffect(() => {
    if (slug === "recently-viewed") {
      try {
        const raw = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
        const ids = raw ? JSON.parse(raw) : [];
        const arr = Array.isArray(ids) ? ids : [];
        const mapped = arr
          .map((id) => productIndex.get(String(id)))
          .filter(Boolean);
        setItems(mapped.length ? mapped : pickMostPopularProducts(allProducts, new Set(), 24));
      } catch {
        setItems(pickMostPopularProducts(allProducts, new Set(), 24));
      }
      return;
    }
    if (slug === "cross-sell") {
      const cartItems = readCartItems();
      const exclude = new Set((cartItems || []).map((it) => String(it.id)));
      setItems(pickMostPopularProducts(allProducts, exclude, 24));
      return;
    }
    if (slug === "popular") {
      setItems(pickMostPopularProducts(allProducts, new Set(), 48));
      return;
    }
    if (slug === "new") {
      setItems(pickNewestProducts(allProducts).slice(0, 48));
      return;
    }
    if (slug === "in-season") {
      setItems(pickInSeasonProducts(allProducts).slice(0, 48));
      return;
    }
    // Fallback: show full catalogue
    setItems(allProducts.slice(0, 48));
  }, [slug, allProducts, productIndex]);

  const title =
    slug === "recently-viewed"
      ? "Recently Viewed"
      : slug === "cross-sell"
      ? "Suggested for You"
      : slug === "popular"
      ? "Popular Combo Packs"
      : slug === "new"
      ? "Fresh In Stock"
      : slug === "in-season"
      ? "In Season"
      : "Products";

  return (
    <main className="category-page">
      <div className="category-page__header">
        <div className="category-page__title">
          <div>
            <h1 className="categoryCard__label">{title}</h1>
            <p className="category-page__description">Browse all items in this section.</p>
          </div>
        </div>
        <div className="category-page__controls">
          <Link href="/products" className="section-view-button">Back to shopping</Link>
        </div>
      </div>

      <section className="category-products" aria-live="polite">
        {items.length ? (
          <div className="product-card-grid">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <div className="category-empty-state">
            <strong>No items here yet.</strong>
          </div>
        )}
      </section>
    </main>
  );
}
