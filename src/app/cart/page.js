"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import styles from "./cart.module.css";

import CategoryCarouselSkeleton from "@/components/category-carousel-skeleton";
import copy from "@/data/copy";
import products from "@/data/products";
import categories, { getCategoryHref } from "@/data/categories";
import {
  formatProductPrice,
  normaliseProductCatalogue,
  pickMostPopularProducts,
  resolveStockClass,
} from "@/lib/catalogue";

import { readCartItems, writeCartItems, clearCartItems } from "@/lib/cart-storage";
import { readStoredUser } from "@/lib/auth";
import { readStoredUser, AUTH_EVENT } from "@/lib/auth";
import { getProductHref } from "@/lib/products";

const CategoryCarousel = dynamic(() => import("@/components/category-carousel"), {
  loading: () => <CategoryCarouselSkeleton />,
});

const RECENTLY_VIEWED_STORAGE_KEY = "mealkit_recently_viewed";
const DELIVERY_FEE = 1500;
const RECENTLY_VIEWED_LIMIT = 6;
const MIN_ORDER_SIZE = 0.01;
const ORDER_COUNT_STEP = 1;

const roundTo = (value, precision = 2) => {
  if (!Number.isFinite(value)) return 0;
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
};

const normaliseOrderSize = (value, fallback = MIN_ORDER_SIZE) => {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return roundTo(numeric);
};

const normaliseOrderCount = (value, fallback = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.max(1, Math.round(numeric));
};

const computeQuantity = (orderSize, orderCount) => roundTo(orderSize * orderCount);

const formatOrderSize = (value) => {
  const size = normaliseOrderSize(value, 0);
  if (!size) return "0";
  const hasFraction = Math.abs(Math.round(size) - size) > 0.005;
  return size.toLocaleString(undefined, {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

const formatOrderCount = (value) => {
  const count = normaliseOrderCount(value, 0);
  return count.toLocaleString();
};

const hydrateCartItem = (item) => {
  if (!item || typeof item !== "object") return null;
  const draft = { ...item };
  const orderSize = normaliseOrderSize(draft.orderSize ?? draft.quantity ?? MIN_ORDER_SIZE, MIN_ORDER_SIZE);
  const storedCount = normaliseOrderCount(draft.orderCount ?? 0, 1);
  const derivedCount = normaliseOrderCount(
    storedCount > 0
      ? storedCount
      : orderSize > 0
        ? Math.round((Number.parseFloat(draft.quantity) || orderSize) / orderSize)
        : 1,
    1
  );
  const quantity = computeQuantity(orderSize, derivedCount);

  return {
    ...draft,
    orderSize,
    orderCount: derivedCount,
    quantity,
  };
};

const hydrateCartItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map(hydrateCartItem).filter(Boolean);
};

const readCartFromStorage = () => hydrateCartItems(readCartItems());

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

function CartProductSection({ title, eyebrow, ctaLabel = "See all", headingId, variant = "emphasis", children }) {
  const sectionClasses = ["home-section"];
  if (variant && variant !== "plain") {
    sectionClasses.push(`home-section--${variant}`);
  }

  const viewportRef = useRef(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const evalScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const { scrollLeft, clientWidth, scrollWidth } = el;
    const threshold = 8;
    setCanScrollPrev(scrollLeft > threshold);
    setCanScrollNext(scrollLeft + clientWidth < scrollWidth - threshold);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onScroll = () => window.requestAnimationFrame(evalScroll);
    evalScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [evalScroll]);

  const scrollByAmount = useCallback((direction) => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const card = viewport.querySelector(".product-card, .product-highlight-card");
    let trackSize = 260; // fallback
    let gap = 24;
    if (card) {
      const rect = card.getBoundingClientRect();
      trackSize = rect.width || trackSize;
    }
    const grid = viewport.querySelector(".product-card-grid");
    if (grid) {
      const styles = window.getComputedStyle(grid);
      const gapValue = styles.columnGap || styles.gap || styles.rowGap || "0";
      const parsed = parseFloat(gapValue);
      if (!Number.isNaN(parsed)) gap = parsed;
    }

    const step = trackSize + gap;
    const visible = viewport.clientWidth;
    const cardsPerView = Math.max(1, Math.round(visible / step));
    const delta = cardsPerView * step * direction;
    const maxScroll = Math.max(0, viewport.scrollWidth - visible);
    let target = viewport.scrollLeft + delta;
    target = Math.max(0, Math.min(target, maxScroll));
    const snapped = Math.round(target / step) * step;
    viewport.scrollTo({ left: snapped, behavior: "smooth" });
  }, []);

  const handlePrev = useCallback(() => scrollByAmount(-1), [scrollByAmount]);
  const handleNext = useCallback(() => scrollByAmount(1), [scrollByAmount]);

  return (
    <section className={sectionClasses.join(" ")} aria-labelledby={headingId}>
      <div className="home-section__inner">
        <header className="home-section__header">
          <div className="home-section__titles">
            {eyebrow ? <span className="home-section__eyebrow">{eyebrow}</span> : null}
            <h2 className="home-section__title" id={headingId}>
              {title}
            </h2>
          </div>
          <button type="button" className="home-section__cta">
            {ctaLabel}
          </button>
        </header>

        <div className="home-section__rail">
          <button
            type="button"
            className="home-section__nav home-section__nav--prev"
            onClick={handlePrev}
            disabled={!canScrollPrev}
            aria-label={`Scroll ${title} backwards`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M15 19l-7-7 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="home-section__viewport" ref={viewportRef}>
            {children}
          </div>

          <button
            type="button"
            className="home-section__nav home-section__nav--next"
            onClick={handleNext}
            disabled={!canScrollNext}
            aria-label={`Scroll ${title} forwards`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

export default function CartPage() {
  const router = useRouter();
  const catalogueLookup = useMemo(() => normaliseProductCatalogue(products), []);
  const catalogueList = catalogueLookup.ordered ?? [];
  const productIndex = catalogueLookup.index ?? new Map();

  const [cartItems, setCartItems] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
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
    try {
      const normalised = hydrateCartItems(items);
      writeCartItems(normalised, undefined, { source: cartEventSourceRef.current });
    } catch (error) {
      console.warn("Unable to persist cart", error);
    }
  }, []);

  // Try to hydrate cart from backend for logged-in users
  useEffect(() => {
    if (typeof window === "undefined") return;
    const user = readStoredUser();
    if (!user?.email) return;
    const controller = new AbortController();
    fetch(`/api/cart?user_id=${encodeURIComponent(user.email)}`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        const items = data?.items || data?.cart?.items;
        if (Array.isArray(items) && items.length) {
          setCartItems(hydrateCartItems(items));
          setHydrated(true);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Track auth state so we can gate checkout when not signed in
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Initial read
    setCurrentUser(readStoredUser());

    const onAuthChanged = (evt) => {
      try {
        const user = evt?.detail?.user ?? readStoredUser();
        setCurrentUser(user || null);
      } catch (_) {
        setCurrentUser(readStoredUser());
      }
    };
    window.addEventListener(AUTH_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_EVENT, onAuthChanged);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistCart(cartItems);
  }, [cartItems, hydrated, persistCart]);

  const cartIdSet = useMemo(() => new Set(cartItems.map((item) => String(item.id))), [cartItems]);

  const crossSellProducts = useMemo(
    () => pickMostPopularProducts(catalogueList, cartIdSet, 6),
    [catalogueList, cartIdSet]
  );

  const stockStatus = useMemo(() => {
    const statuses = cartItems.map((item) => {
      const product = productIndex.get(String(item.id));
      const stockLabel = product?.stock || item.stock || "";
      const normalised = stockLabel.toLowerCase();
      let level = "ok";
      let message = "";

      if (!product) {
        level = "error";
        message = copy.cart.unavailableMessage;
      } else if (normalised.includes("out") || normalised.includes("sold")) {
        level = "error";
        message = copy.cart.unavailableMessage;
      } else if (normalised.includes("limited") || normalised.includes("low")) {
        level = "warning";
        message = copy.cart.limitedMessage;
      }

      return {
        id: item.id,
        stockLabel: stockLabel || "In stock",
        level,
        message,
      };
    });

    return {
      map: new Map(statuses.map((status) => [status.id, status])),
      hasError: statuses.some((status) => status.level === "error"),
      hasWarning: statuses.some((status) => status.level === "warning"),
    };
  }, [cartItems, productIndex]);

  const hasCheckoutBlocker = stockStatus.hasError;

  const summary = useMemo(() => {
    const aggregates = cartItems.reduce(
      (acc, item) => {
        const orderSize = normaliseOrderSize(item.orderSize, MIN_ORDER_SIZE);
        const orderCount = normaliseOrderCount(item.orderCount, 0);
        const price = Number(item.price) || 0;
        const quantity = computeQuantity(orderSize, orderCount);

        return {
          itemsCount: acc.itemsCount + orderCount,
          subtotal: acc.subtotal + price * quantity,
        };
      },
      { itemsCount: 0, subtotal: 0 }
    );

    let delivery = aggregates.itemsCount > 0 ? DELIVERY_FEE : 0;
    let discount = 0;

    if (activePromo) {
      if (activePromo.type === "percent") {
        if (!activePromo.minSubtotal || aggregates.subtotal >= activePromo.minSubtotal) {
          discount = aggregates.subtotal * activePromo.value;
        }
      }

      if (activePromo.type === "delivery" && aggregates.itemsCount > 0) {
        delivery = 0;
      }
    }

    discount = Math.min(discount, aggregates.subtotal);
    const total =
      aggregates.itemsCount > 0 ? Math.max(aggregates.subtotal - discount, 0) + delivery : 0;

    return {
      itemsCount: aggregates.itemsCount,
      subtotal: aggregates.subtotal,
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
      const orderSize = normaliseOrderSize(item.orderSize, MIN_ORDER_SIZE);
      const currentCount = normaliseOrderCount(item.orderCount, 1);
      const nextCount = Math.max(currentCount + delta, 1);
      return {
        ...item,
        orderSize,
        orderCount: nextCount,
        quantity: computeQuantity(orderSize, nextCount),
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
    clearCartItems(undefined, { source: cartEventSourceRef.current });
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
    if (!cartItems.length || hasCheckoutBlocker) {
      return;
    }

    const user = readStoredUser();
    if (!user) {
      // No prompt — go straight to sign-in
      persistCart(cartItems);
      router.push("/sign-in?tab=login");
      return;
    }

    persistCart(cartItems);
    router.push("/checkout");
  }, [cartItems, hasCheckoutBlocker, persistCart, router]);

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

  const totalOrderCount = normaliseOrderCount(summary.itemsCount, 0);
  const formattedItemsCount = formatOrderCount(totalOrderCount);
  const itemLabel = totalOrderCount === 1 ? "item" : "items";
  const cartIsEmpty = cartItems.length === 0;

  return (
    <>
    <div className={styles.page}>

      <div className={styles.pageInner}>
        {/* Benefits section moved to top of page */}
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

        {/* Breadcrumbs directly above the cart section */}
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
                  {copy.cart.sectionTitle}
                </h1>
                <p className={styles.cartSubtitle}>{copy.cart.subtitle}</p>
              </div>
              <span className={styles.cartTag}>
                <i className="fa-solid fa-basket-shopping" aria-hidden="true"></i>
                {copy.cart.tagLabel(formattedItemsCount, itemLabel)}
              </span>
            </header>

            <div className={styles.cartMain}>
              {cartIsEmpty ? (
                <div className={styles.placeholderCard}>
                  {copy.cart.emptyMessage}
                </div>
              ) : (
                cartItems.map((item) => {
                  const status = stockStatus.map.get(item.id);
                  const orderSize = normaliseOrderSize(item.orderSize, MIN_ORDER_SIZE);
                  const orderCount = normaliseOrderCount(item.orderCount, 1);
                  const quantity = computeQuantity(orderSize, orderCount);
                  const price = Number(item.price) || 0;
                  const lineTotal = price * quantity;
                  const perOrderLabel = item.unit
                    ? `${formatOrderSize(orderSize)} ${item.unit}`
                    : formatOrderSize(orderSize);
                  const orderLabel = orderCount === 1 ? "order" : "orders";
                  const lineClassNames = [styles.cartLine];
                  if (status?.level === "error") {
                    lineClassNames.push(styles.cartLineUnavailable);
                  } else if (status?.level === "warning") {
                    lineClassNames.push(styles.cartLineWarning);
                  }

                  return (
                    <article key={item.id} className={lineClassNames.join(" ")}>
                      <div className={styles.cartThumbnail}>
                        <img src={item.image} alt={item.name} />
                      </div>
                      <div className={styles.cartInfo}>
                        <h3>{item.name}</h3>
                        <div className={styles.cartMeta}>
                          <span>{perOrderLabel} per order</span>
                          <span>{status?.stockLabel || item.stock}</span>
                          <span className={styles.cartPrice}>{formatCurrency(price)}</span>
                        </div>
                        {status?.message ? (
                          <p
                            className={`${styles.cartWarning} ${status.level === "error" ? styles.cartWarningAlert : ""}`.trim()}
                            role={status.level === "error" ? "alert" : "status"}
                          >
                            {status.message}
                          </p>
                        ) : null}
                        {item.note ? <small>{item.note}</small> : null}
                      </div>
                      <div className={styles.cartControls}>
                        <div className={styles.qtyControl}>
                          <button
                            type="button"
                            className={styles.qtyButton}
                            onClick={() => handleQtyChange(item.id, -ORDER_COUNT_STEP)}
                            aria-label={`Decrease order count for ${item.name}`}
                          >
                            -
                          </button>
                          <span className={styles.qtyValue}>
                            <span className={styles.qtyNumber}>{formatOrderCount(orderCount)}</span>
                            <span className={styles.qtyUnit}>{orderLabel}</span>
                          </span>
                          <button
                            type="button"
                            className={styles.qtyButton}
                            onClick={() => handleQtyChange(item.id, ORDER_COUNT_STEP)}
                            aria-label={`Increase order count for ${item.name}`}
                          >
                            +
                          </button>
                        </div>
                        <div className={styles.cartLineSummary}>
                          <span className={styles.cartLineQuantity}>
                            {formatOrderSize(quantity)}{item.unit ? ` ${item.unit}` : ""}
                          </span>
                          <span className={styles.cartLineTotal}>{formatCurrency(lineTotal)}</span>
                        </div>
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
                {copy.general.continueShopping}
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
                <span>Items</span>
                <span>{formattedItemsCount} {itemLabel}</span>
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

            {stockStatus.hasError ? (
              <p className={`${styles.summaryAlert} ${styles.summaryAlertError}`.trim()} role="alert">
                {copy.cart.removeUnavailableMessage}
              </p>
            ) : null}
            {!stockStatus.hasError && stockStatus.hasWarning ? (
              <p className={styles.summaryAlert} role="status">
                {copy.cart.limitedNotice}
              </p>
            ) : null}

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

            <button
              type="button"
              className={styles.checkoutButton}
              onClick={handleCheckout}
              disabled={cartIsEmpty || hasCheckoutBlocker}
            >
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

      <CartProductSection title={copy.cart.recentlyViewedTitle} eyebrow={copy.cart.recentlyViewedEyebrow} headingId="recently-heading">
        {recentlyViewed.length ? (
          <div className="product-card-grid" id="cartRecentlyViewedGrid">
            {recentlyViewed.map((product) => (
              <ProductHighlightCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className={styles.cardGridPlaceholder} role="presentation">
            <div className={styles.placeholderCard}>
              {copy.cart.recentlyViewedFallback}
            </div>
          </div>
        )}
      </CartProductSection>

      {crossSellProducts.length ? (
        <CartProductSection title={copy.cart.crossSellTitle} eyebrow={copy.cart.crossSellEyebrow} headingId="crossSell-heading">
          <div className="product-card-grid" id="cartCrossSellGrid">
            {crossSellProducts.map((product) => (
              <ProductHighlightCard key={product.id} product={product} />
            ))}
          </div>
        </CartProductSection>
      ) : null}

      {/* Benefits section moved to top; block removed from here */}

      {/* Category aisle just above the Download App section */}
      <CategoryCarousel
        cards={CATEGORY_CARDS}
        heading="Browse categories"
        eyebrow="Shop by aisle"
        className={styles.categorySection}
      />
    </div>

    {/* Full-bleed Download App section (outside the page container to avoid side/bottom gutters) */}
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
  </>
  );
}



