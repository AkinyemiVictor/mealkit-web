"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const CART_STORAGE_KEY = "mealkit_cart";
const RECENTLY_VIEWED_STORAGE_KEY = "mealkit_recently_viewed";
const MIN_QUANTITY = 0.01;

const formatUnitLabel = (unit) => {
  if (!unit) return "unit";
  return unit;
};

const clampQuantity = (value) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return NaN;
  }
  return Math.round(parsed * 100) / 100;
};

const formatQuantityLabel = (value) => {
  const numeric = clampQuantity(value);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const readCartFromStorage = () => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Could not read cart from storage", error);
    return [];
  }
};

const persistCartToStorage = (items) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.warn("Could not persist cart", error);
  }
};

const updateRecentlyViewed = (id) => {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const entries = Array.isArray(parsed) ? parsed : [];
    const idString = String(id);
    const next = [idString, ...entries.filter((entry) => String(entry) !== idString)].slice(0, 20);
    window.localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Could not update recently viewed list", error);
  }
};

const defaultCartItem = (product, quantity, fallbackImage) => ({
  id: product.id,
  name: product.name,
  unit: product.unit || "Per pack",
  price: product.price,
  quantity,
  stock: product.stock || "In Stock",
  note: product.note || "Added from product page",
  image: product.image || fallbackImage,
});

export default function AddToCartForm({ product, fallbackImage }) {
  const [quantityInput, setQuantityInput] = useState("1");
  const [feedback, setFeedback] = useState({ tone: "idle", message: "" });
  const unitLabel = useMemo(() => formatUnitLabel(product.unit), [product.unit]);

  useEffect(() => {
    updateRecentlyViewed(product.id);
  }, [product.id]);

  const resetFeedback = () => setFeedback({ tone: "idle", message: "" });

  const handleChange = (event) => {
    setQuantityInput(event.target.value);
    resetFeedback();
  };

  const handleAddToCart = useCallback(() => {
    const parsedQuantity = clampQuantity(quantityInput);

    if (!Number.isFinite(parsedQuantity) || parsedQuantity < MIN_QUANTITY) {
      setFeedback({ tone: "error", message: "Enter a valid quantity greater than zero." });
      return;
    }

    const items = readCartFromStorage();
    const productId = String(product.id);
    const index = items.findIndex((item) => String(item.id) === productId);

    if (index >= 0) {
      const existing = items[index];
      const currentQuantity = clampQuantity(existing.quantity) || 0;
      const nextQuantity = Math.round((currentQuantity + parsedQuantity) * 100) / 100;
      items[index] = {
        ...existing,
        ...defaultCartItem(product, nextQuantity, fallbackImage),
        quantity: nextQuantity,
      };
    } else {
      items.push(defaultCartItem(product, parsedQuantity, fallbackImage));
    }

    persistCartToStorage(items);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cart-updated"));
    }

    setFeedback({
      tone: "success",
      message: `${product.name} (${formatQuantityLabel(parsedQuantity)} ${unitLabel}) added to cart.`,
    });
  }, [quantityInput, product, unitLabel, fallbackImage]);

  const handleBlur = () => {
    const parsed = clampQuantity(quantityInput);
    if (!Number.isFinite(parsed)) return;
    setQuantityInput(formatQuantityLabel(parsed));
  };

  return (
    <div className="product-detail-actions">
      <label htmlFor="product-quantity" className="product-detail-actions__label">
        Quantity ({unitLabel})
      </label>
      <div className="product-detail-actions__controls">
        <input
          id="product-quantity"
          type="number"
          min={MIN_QUANTITY}
          step="0.01"
          inputMode="decimal"
          value={quantityInput}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-describedby="product-quantity-helper"
        />
        <button type="button" onClick={handleAddToCart} className="product-detail-actions__submit">
          Add to cart
        </button>
      </div>
      <p id="product-quantity-helper" className="product-detail-actions__helper">
        Enter decimals like 2.45 for partial {unitLabel.toLowerCase()} orders.
      </p>
      {feedback.message ? (
        <p
          className={`product-detail-actions__feedback product-detail-actions__feedback--${feedback.tone}`.trim()}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
