"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "./cart.module.css";

import products from "@/data/products";
import categories, { getCategoryHref } from "@/data/categories";
import {
  formatProductPrice,
  normaliseProductCatalogue,
  pickMostPopularProducts,
  resolveStockClass,
} from "@/lib/catalogue";

const CART_STORAGE_KEY = "mealkit_cart";
const RECENTLY_VIEWED_STORAGE_KEY = "mealkit_recently_viewed";
const DELIVERY_FEE = 1500;
const RECENTLY_VIEWED_LIMIT = 6;
const MIN_CART_QUANTITY = 0.01;
const CART_QUANTITY_STEP = 0.25;

const normaliseCartQuantity = (value, fallback = MIN_CART_QUANTITY) => {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.round(numeric * 100) / 100;
};

const formatCartQuantity = (value) => {
  const numeric = normaliseCartQuantity(value, 0);
  if (!numeric) return "0";
  const isWhole = Math.abs(Math.round(numeric) - numeric) < 0.005;
  return numeric.toLocaleString(undefined, { minimumFractionDigits: isWhole ? 0 : 2, maximumFractionDigits: 2 });
};

const hydrateCartItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      ...item,
      quantity: normaliseCartQuantity(item.quantity, MIN_CART_QUANTITY),
    }));
};

const readCartFromStorage = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return hydrateCartItems(parsed);
  } catch (error) {
    console.warn("Unable to read stored cart", error);
    return [];
  }
};

const PROMO_CODES = {
  FRESHSAVE: {
    type: "percent",
    value: 0.1,
    description: "10% off everything",
  },
  MEALKIT20: {
    type: "percent",
    value: 0.2,
    minSubtotal: 25000,
    description: "20% off orders above NGN 25,000",
  },
  SHIPFREE: {
    type: "delivery",
    description: "Free delivery on your order",
  },
};

const CATEGORY_CARDS = categories.map((category) => ({
  slug: category.slug,
  label: category.label,
  icon: category.icon,
  href: getCategoryHref(category),
}));

const BENEFITS = [
  {
    icon: "fa-truck-fast",
    title: "Same-day delivery",
    body: "Order before 2pm and receive your groceries in Lagos the very same day.",
  },
  {
    icon: "fa-seedling",
    title: "Freshly sourced",
    body: "We handpick produce directly from trusted farms every morning for peak freshness.",
  },
  {
    icon: "fa-shield-heart",
    title: "Hassle-free returns",
    body: "If anything arrives below standard we'll replace or refund it within hours.",
  },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

function ProductHighlightCard({ product }) {
  const stockClass = resolveStockClass(product.stock);
  const hasOldPrice = product.oldPrice && product.oldPrice > product.price;

  return (
    <article className="product-card">
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
        <img src={product.image} alt={product.name} className="productImg" loading="lazy" />
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
    </article>
  );
}

export default function CartPage() {
  const categoryTrackRef = useRef(null);
  const catalogueLookup = useMemo(() => normaliseProductCatalogue(products), []);
  const catalogueList = catalogueLookup.ordered ?? [];
  const productIndex = catalogueLookup.index ?? new Map();

  const [cartItems, setCartItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoMessage, setPromoMessage] = useState({ text: "", tone: "neutral" });
  const [activePromo, setActivePromo] = useState(null);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const cartEventSourceRef = useRef(Symbol("cart-page"));

  useEffect(() => {
    const updateCart = (event) => {
      if (event?.type === "cart-updated") {
        const source = event instanceof CustomEvent ? event.detail?.source : undefined;
        if (source === cartEventSourceRef.current) {
          return;
        }
      }

      setCartItems(readCartFromStorage());
      setHydrated(true);
    };

    updateCart();

    if (typeof window === "undefined") {
      return undefined;
    }

    window.addEventListener("storage", updateCart);
    window.addEventListener("cart-updated", updateCart);

    return () => {
      window.removeEventListener("storage", updateCart);
      window.removeEventListener("cart-updated", updateCart);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const history = (() => {
      try {
        const stored = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
      } catch (error) {
        console.warn("Unable to read recently viewed history", error);
        return [];
      }
    })();

    const uniqueHistory = history.filter((id, index) => history.indexOf(id) === index);
    const picked = [];

    uniqueHistory.forEach((id) => {
      if (picked.length >= RECENTLY_VIEWED_LIMIT) return;
      const product = productIndex.get(String(id));
      if (product) picked.push(product);
    });

    if (picked.length < RECENTLY_VIEWED_LIMIT) {
      const used = new Set(picked.map((item) => item.id));
      for (const product of catalogueList) {
        if (picked.length >= RECENTLY_VIEWED_LIMIT) break;
        if (used.has(product.id)) continue;
        picked.push(product);
        used.add(product.id);
      }
    }

    setRecentlyViewed(picked.slice(0, RECENTLY_VIEWED_LIMIT));
  }, [catalogueList, productIndex]);

  const persistCart = useCallback((items) => {
    if (typeof window === "undefined") return;
    try {
      const normalised = hydrateCartItems(items);
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalised));
      window.dispatchEvent(
        new CustomEvent("cart-updated", { detail: { source: cartEventSourceRef.current } })
      );
    } catch (error) {
      console.warn("Unable to persist cart", error);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistCart(cartItems);
  }, [cartItems, hydrated, persistCart]);

  const cartIdSet = useMemo(() => new Set(cartItems.map((item) => String(item.id))), [cartItems]);

  const mostPopular = useMemo(
    () => pickMostPopularProducts(catalogueList, cartIdSet, 6),
    [catalogueList, cartIdSet]
  );

  const summary = useMemo(() => {
    const unitsCount = cartItems.reduce((sum, item) => sum + normaliseCartQuantity(item.quantity, 0), 0);
    const itemsCount = Math.round(unitsCount * 100) / 100;
    const subtotal = cartItems.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const quantity = normaliseCartQuantity(item.quantity, 0);
      return sum + price * quantity;
    }, 0);

    let delivery = itemsCount ? DELIVERY_FEE : 0;
    let discount = 0;

    if (activePromo) {
      if (activePromo.type === "percent") {
        if (!activePromo.minSubtotal || subtotal >= activePromo.minSubtotal) {
          discount = subtotal * activePromo.value;
        }
      }

      if (activePromo.type === "delivery" && itemsCount) {
        delivery = 0;
      }
    }

    discount = Math.min(discount, subtotal);
    const total = itemsCount ? Math.max(subtotal - discount, 0) + delivery : 0;

    return {
      itemsCount,
      subtotal,
      discount,
      delivery,
      total,
    };
  }, [cartItems, activePromo]);

  const setPromoFeedback = useCallback((text, tone = "neutral") => {
    setPromoMessage({ text, tone });
  }, []);
  const handleQtyChange = useCallback((id, delta) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const current = normaliseCartQuantity(item.quantity, MIN_CART_QUANTITY);
        const next = Math.max(current + delta, MIN_CART_QUANTITY);
        return {
          ...item,
          quantity: normaliseCartQuantity(next, MIN_CART_QUANTITY),
        };
      })
    );
  }, []);

  const handleRemove = useCallback((id) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleClear = useCallback(() => {
    if (!cartItems.length) return;
    const confirmed = window.confirm("Remove every item from your cart?");
    if (!confirmed) return;
    setCartItems([]);
    setActivePromo(null);
    setPromoInput("");
    setPromoFeedback("Your cart is now empty.");
  }, [cartItems.length, setPromoFeedback]);

  const handleApplyPromo = useCallback(() => {
    const code = promoInput.trim().toUpperCase();

    if (!code) {
      setActivePromo(null);
      setPromoFeedback("Enter a promo code to apply a discount.");
      return;
    }

    const found = PROMO_CODES[code];
    const subtotal = summary.subtotal;

    if (!found) {
      setActivePromo(null);
      setPromoFeedback("That code is not recognised. Try FRESHSAVE or MEALKIT20.", "error");
      return;
    }

    if (found.minSubtotal && subtotal < found.minSubtotal) {
      setActivePromo(null);
      setPromoFeedback(`This code activates from ${formatCurrency(found.minSubtotal)} spend.`, "error");
      return;
    }

    setActivePromo({ ...found, code });
    setPromoFeedback(found.description || "Discount applied.", "success");
  }, [promoInput, summary.subtotal, setPromoFeedback]);

  const handleSaveCart = useCallback(() => {
    persistCart(cartItems);
    setPromoFeedback("Cart saved to this device. You can continue later.", "success");
  }, [cartItems, persistCart, setPromoFeedback]);

  const handleCheckout = useCallback(() => {
    window.alert(
      `Thanks! Your total payable is ${formatCurrency(summary.total)}. Checkout experience is coming soon.`
    );
  }, [summary.total]);

  const scrollCategories = useCallback((offset) => {
    categoryTrackRef.current?.scrollBy({ left: offset, behavior: "smooth" });
  }, []);

  const promoToneClass = useMemo(() => {
    switch (promoMessage.tone) {
      case "success":
        return styles.promoMessageSuccess;
      case "error":
        return styles.promoMessageError;
      default:
        return styles.promoMessageNeutral;
    }
  }, [promoMessage.tone]);

  const formattedItemsCount = formatCartQuantity(summary.itemsCount);
  const unitLabel = Math.abs(summary.itemsCount - 1) < 0.005 ? "unit" : "units";
  const cartIsEmpty = cartItems.length === 0;

  return (
    <div className={styles.page}>
      <section className="categoriesSec" aria-labelledby="categories-heading">
        <div id="cartTextandIcon" className="cartTextandIcon">
          <p id="categories-heading">Categories</p>
          <div id="categoryNav" className="categoryNav">
            <button
              type="button"
              className="arrow-btn left"
              onClick={() => scrollCategories(-260)}
              aria-label="Scroll categories left"
            >
              <svg viewBox="0 0 24 24" className="arrow-icon" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18l-6-6 6-6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              className="arrow-btn right"
              onClick={() => scrollCategories(260)}
              aria-label="Scroll categories right"
            >
              <svg viewBox="0 0 24 24" className="arrow-icon" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 6l6 6-6 6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <div id="categoryCont" className="categoryCont" ref={categoryTrackRef}>
          <div className="categoryTrack">
            {CATEGORY_CARDS.map((category) => (
              <Link key={category.slug} id={category.slug} className="categoryCard" href={category.href}>
                <span className="categoryCard__icon">
                  <i className={`fa-solid ${category.icon}`} aria-hidden="true"></i>
                </span>
                <span className="categoryCard__label">{category.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.pageInner}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Cart</span>
        </nav>

        <div className={styles.cartLayout}>
          <section className={styles.cartBoard} aria-labelledby="cart-title">
            <header className={styles.cartHeader}>
              <div className={styles.cartTitleGroup}>
                <h1 id="cart-title" className={styles.cartTitle}>
                  Shopping cart
                </h1>
                <p className={styles.cartSubtitle}>
                  Secure checkout. Fresh groceries guaranteed.
                </p>
              </div>
              <span className={styles.cartTag}>
                <i className="fa-solid fa-basket-shopping" aria-hidden="true"></i>
                {formattedItemsCount} {unitLabel}
              </span>
            </header>

            <div className={styles.cartMain}>
              {cartIsEmpty ? (
                <div className={styles.placeholderCard}>
                  Your cart is empty. Explore the catalogue and add something fresh.
                </div>
              ) : (
                cartItems.map((item) => {
                  const quantity = normaliseCartQuantity(item.quantity, MIN_CART_QUANTITY);
                  const price = Number(item.price) || 0;
                  const lineTotal = price * quantity;
                  return (
                    <article key={item.id} className={styles.cartLine}>
                      <div className={styles.cartThumbnail}>
                        <img src={item.image} alt={item.name} />
                      </div>
                      <div className={styles.cartInfo}>
                        <h3>{item.name}</h3>
                        <div className={styles.cartMeta}>
                          <span>{item.unit}</span>
                          <span>{item.stock}</span>
                          <span className={styles.cartPrice}>{formatCurrency(price)}</span>
                        </div>
                        {item.note ? <small>{item.note}</small> : null}
                      </div>
                      <div className={styles.cartControls}>
                        <div className={styles.qtyControl}>
                          <button
                            type="button"
                            className={styles.qtyButton}
                            onClick={() => handleQtyChange(item.id, -CART_QUANTITY_STEP)}
                            aria-label={`Decrease quantity of ${item.name}`}
                          >
                            -
                          </button>
                          <span className={styles.qtyValue}>
                            <span className={styles.qtyNumber}>{formatCartQuantity(quantity)}</span>
                            {item.unit ? <span className={styles.qtyUnit}>{item.unit}</span> : null}
                          </span>
                          <button
                            type="button"
                            className={styles.qtyButton}
                            onClick={() => handleQtyChange(item.id, CART_QUANTITY_STEP)}
                            aria-label={`Increase quantity of ${item.name}`}
                          >
                            +
                          </button>
                        </div>
                        <div>{formatCurrency(lineTotal)}</div>
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => handleRemove(item.id)}
                        >
                          <i className="fa-regular fa-circle-xmark" aria-hidden="true"></i>
                          Remove
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>

            <div className={styles.cartFooterActions}>
              <Link className={styles.cartLink} href="/">
                <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>
                Continue shopping
              </Link>
              <button
                type="button"
                className={`${styles.cartLink} ${styles.cartLinkMuted}`.trim()}
                onClick={handleSaveCart}
              >
                <i className="fa-regular fa-bookmark" aria-hidden="true"></i>
                Save cart for later
              </button>
              <button
                type="button"
                className={`${styles.cartLink} ${styles.cartLinkMuted}`.trim()}
                onClick={handleClear}
                disabled={cartIsEmpty}
              >
                <i className="fa-regular fa-trash-can" aria-hidden="true"></i>
                Remove all
              </button>
            </div>
          </section>

          <aside className={styles.summaryCard} aria-labelledby="summary-heading">
            <div className={styles.summaryHeader}>
              <h2 id="summary-heading">Order summary</h2>
            </div>
            <div className={styles.summaryRows}>
              <div className={styles.summaryRow}>
                <span>Units</span>
                <span>{formattedItemsCount}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <span>{formatCurrency(summary.subtotal)}</span>
              </div>
              {summary.discount > 0 ? (
                <div className={styles.summaryRow}>
                  <span>Promo</span>
                  <span>-{formatCurrency(summary.discount)}</span>
                </div>
              ) : null}
              <div className={styles.summaryRow}>
                <span>Delivery</span>
                <span>{formatCurrency(summary.delivery)}</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.summaryRowStrong}`.trim()}>
                <span>Total</span>
                <span>{formatCurrency(summary.total)}</span>
              </div>
            </div>

            <div className={styles.summaryBlock}>
              <label htmlFor="promo-code">Have a promo code?</label>
              <div className={styles.promoGroup}>
                <input
                  id="promo-code"
                  className={styles.promoInput}
                  value={promoInput}
                  onChange={(event) => setPromoInput(event.target.value)}
                  placeholder="Enter code e.g. FRESHSAVE"
                />
                <button type="button" className={styles.promoApply} onClick={handleApplyPromo}>
                  Apply
                </button>
              </div>
              {promoMessage.text ? (
                <p className={`${styles.promoMessage} ${promoToneClass}`.trim()} aria-live="polite">
                  {promoMessage.text}
                </p>
              ) : null}
            </div>

            <button type="button" className={styles.checkoutButton} onClick={handleCheckout} disabled={cartIsEmpty}>
              Proceed to checkout
            </button>
            <p className={styles.summaryHint}>
              <i className="fa-solid fa-lock" aria-hidden="true"></i> Secure & encrypted checkout
            </p>
            <div className={styles.summarySupport}>
              <p className={styles.summarySupportTitle}>Need help finalising your order?</p>
              <p className={styles.summarySupportContact}>
                Chat with a shopper on <a href="tel:+2349129296433">+234 91 2929 6433</a>
              </p>
            </div>
          </aside>
        </div>
      </div>

      <section className={styles.recentlySection} aria-labelledby="recently-heading">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <h2 id="recently-heading">Recently Viewed</h2>
            <button type="button" className={styles.sectionButton}>
              See all
            </button>
          </div>
          {recentlyViewed.length ? (
            <div className="product-card-grid">
              {recentlyViewed.map((product) => (
                <ProductHighlightCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className={styles.cardGridPlaceholder}>
              <div className={styles.placeholderCard}>
                Your browsing history will appear here once you view some items.
              </div>
            </div>
          )}
        </div>
      </section>

      <section className={styles.popularSection} aria-labelledby="popular-heading">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <h2 id="popular-heading">Most Popular</h2>
            <button type="button" className={styles.sectionButton}>
              See all
            </button>
          </div>
          <div className="product-card-grid">
            {mostPopular.map((product) => (
              <ProductHighlightCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className={styles.benefitsSection} aria-label="Why shop with MealKit">
        <div className={styles.benefitsGrid}>
          {BENEFITS.map((benefit) => (
            <article key={benefit.title} className={styles.benefitCard}>
              <i className={`fa-solid ${benefit.icon}`} aria-hidden="true"></i>
              <h3>{benefit.title}</h3>
              <p>{benefit.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="downloadAppSec">
        <div className="downloadAppFlex">
          <div className="downloadAppTB">
            <div className="phoneWrapper">
              <img src="/assets/img/apple.png" alt="Download on App Store" className="phone phone-apple" />
              <img src="/assets/img/android.png" alt="Download on Play Store" className="phone phone-android" />
            </div>
            <div className="appTextndButtons">
              <h2>Download App</h2>
              <p className="appPar">
                Get our mobile app to shop fresh produce, meats, grains, and pantry staples anytime. Track orders, unlock
                exclusive deals, and receive real-time updates right from your phone.
              </p>
              <div className="buttonHolder">
                <img src="/assets/img/apple store.png" alt="Download on the App Store" />
                <img src="/assets/img/play store.png" alt="Get it on Google Play" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

