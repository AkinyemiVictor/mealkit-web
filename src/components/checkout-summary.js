"use client";

import { useEffect, useMemo, useState } from "react";

import copy from "@/data/copy";
import { formatProductPrice, normaliseProductCatalogue } from "@/lib/catalogue";
import { computeCartSummary, readStoredCart } from "@/lib/checkout";
import products from "@/data/products";

const catalogue = normaliseProductCatalogue(products);

export default function CheckoutSummary() {
  const [items, setItems] = useState(() => readStoredCart());
  const [lastCheckout, setLastCheckout] = useState(null);

  const summaryConfig = useMemo(
    () => ({
      freeDeliveryThreshold: copy.checkout.freeDeliveryThreshold,
      deliveryFee: copy.checkout.deliveryFee,
    }),
    []
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleCartUpdated = () => {
      const updated = readStoredCart();
      setItems(updated);
      if (updated.length) {
        setLastCheckout(null);
      }
    };

    const handleCheckoutCompleted = (event) => {
      const detail = event?.detail || {};
      const completedItems = Array.isArray(detail.items) ? detail.items : [];
      const summary = detail.summary ?? computeCartSummary(completedItems, summaryConfig);
      setLastCheckout({
        items: completedItems,
        summary,
      });
    };

    window.addEventListener("storage", handleCartUpdated);
    window.addEventListener("cart-updated", handleCartUpdated);
    window.addEventListener("checkout-completed", handleCheckoutCompleted);

    return () => {
      window.removeEventListener("storage", handleCartUpdated);
      window.removeEventListener("cart-updated", handleCartUpdated);
      window.removeEventListener("checkout-completed", handleCheckoutCompleted);
    };
  }, [summaryConfig]);

  const itemsToRender = useMemo(() => {
    if (lastCheckout?.items?.length) {
      return lastCheckout.items;
    }
    return items;
  }, [items, lastCheckout]);

  const summary = useMemo(() => {
    if (lastCheckout?.summary) {
      return lastCheckout.summary;
    }
    return computeCartSummary(items, summaryConfig);
  }, [items, lastCheckout, summaryConfig]);

  return (
    <aside
      className={`checkout-summary${lastCheckout ? " checkout-summary--completed" : ""}`}
      aria-labelledby="checkout-summary-heading"
    >
      <h2 id="checkout-summary-heading">{copy.checkout.summaryHeading}</h2>
      <ul className="checkout-summary__list">
        {itemsToRender.length ? (
          itemsToRender.map((item, index) => {
            const key = item?.id != null ? String(item.id) : `${item?.name ?? "item"}-${index}`;
            const product = catalogue.index?.get(String(item?.id));
            const price = Number(item?.price) || Number(product?.price) || 0;
            return (
              <li key={key}>
                <div>
                  <span className="checkout-summary__name">{item?.name ?? "Fresh produce"}</span>
                  {product?.unit ? <span className="checkout-summary__unit">{product.unit}</span> : null}
                </div>
                <span>{formatProductPrice(price, product?.unit)}</span>
              </li>
            );
          })
        ) : (
          <li className="checkout-summary__empty">{copy.checkout.emptyDescription}</li>
        )}
      </ul>

      <div className="checkout-summary__totals">
        <div>
          <span>{copy.checkout.labels.subtotal}</span>
          <span>{formatProductPrice(summary.subtotal)}</span>
        </div>
        <div>
          <span>{copy.checkout.labels.delivery}</span>
          <span>
            {summary.deliveryFee === 0
              ? copy.checkout.freeDeliveryLabel
              : formatProductPrice(summary.deliveryFee)}
          </span>
        </div>
        <div className="checkout-summary__totals--strong">
          <span>{copy.checkout.labels.total}</span>
          <span>{formatProductPrice(summary.total)}</span>
        </div>
      </div>
    </aside>
  );
}
