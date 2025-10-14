"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { readCartItems, writeCartItems } from "@/lib/cart-storage";
const RECENTLY_VIEWED_STORAGE_KEY = "mealkit_recently_viewed";
const MIN_QUANTITY = 0.01;

const roundTo = (value, precision = 2) => {
  if (!Number.isFinite(value)) return 0;
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
};

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

const normaliseOrderSize = (value) => {
  const size = clampQuantity(value);
  return Number.isFinite(size) ? size : MIN_QUANTITY;
};

const normaliseOrderCount = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 1;
  }
  return Math.max(1, Math.round(numeric));
};

const normaliseStoredItem = (item) => {
  if (!item || typeof item !== "object") return null;
  const orderSize = normaliseOrderSize(item.orderSize ?? item.quantity);
  const orderCount = normaliseOrderCount(
    item.orderCount ?? Math.round((clampQuantity(item.quantity) || orderSize) / orderSize)
  );
  return {
    ...item,
    orderSize,
    orderCount,
    quantity: roundTo(orderSize * orderCount),
  };
};

const formatQuantityLabel = (value) => {
  const numeric = clampQuantity(value);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const readCartFromStorage = () =>
  readCartItems().map(normaliseStoredItem).filter(Boolean);

const persistCartToStorage = (items) => {
  try {
    const normalised = Array.isArray(items) ? items.map(normaliseStoredItem).filter(Boolean) : [];
    writeCartItems(normalised, undefined, { source: "add-to-cart" });
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

const buildCartItem = (product, orderSize, orderCount, fallbackImage) => {
  const size = normaliseOrderSize(orderSize);
  const count = normaliseOrderCount(orderCount);
  return {
    id: product.id,
    name: product.name,
    unit: product.unit || "Per pack",
    price: product.price,
    orderSize: size,
    orderCount: count,
    quantity: roundTo(size * count),
    stock: product.stock || "In Stock",
    note: product.note || "Added from product page",
    image: product.image || fallbackImage,
  };
};

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
      const existingSize = normaliseOrderSize(existing.orderSize ?? existing.quantity);
      const existingCount = normaliseOrderCount(
        existing.orderCount ?? Math.round((clampQuantity(existing.quantity) || existingSize) / existingSize)
      );
      const addedOrders = Math.max(1, Math.round(parsedQuantity / existingSize));
      const nextCount = existingCount + addedOrders;
      const updatedItem = buildCartItem(product, existingSize, nextCount, fallbackImage);
      items[index] = {
        ...existing,
        ...updatedItem,
        note: existing.note ?? updatedItem.note,
      };
    } else {
      items.push(buildCartItem(product, parsedQuantity, 1, fallbackImage));
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








