"use client";

import { useMemo, useState, useEffect } from "react";
import { formatProductPrice, resolveStockClass, getStockLabel } from "@/lib/catalogue";
import AddToCartForm from "@/components/add-to-cart-form";
import VariantPicker from "@/components/variant-picker";

export default function ProductDetailClient({ product, variations = [], fallbackImage }) {
  const [selectedVariant, setSelectedVariant] = useState(() => (Array.isArray(variations) && variations[0]) || null);

  useEffect(() => {
    setSelectedVariant((Array.isArray(variations) && variations[0]) || null);
  }, [variations]);

  const display = useMemo(() => {
    if (!selectedVariant) return { ...product, image: product.image || fallbackImage };
    return {
      ...product,
      price: selectedVariant.price ?? product.price,
      oldPrice: selectedVariant.oldPrice ?? product.oldPrice,
      unit: selectedVariant.unit || product.unit,
      stock: selectedVariant.stock || product.stock,
      image: selectedVariant.image || product.image || fallbackImage,
      variantId: selectedVariant.variationId,
      variantName: selectedVariant.name || selectedVariant.ripeness || selectedVariant.size || selectedVariant.packaging,
    };
  }, [product, selectedVariant, fallbackImage]);

  const stockClass = resolveStockClass(display.stock);
  const stockLabel = getStockLabel(display.stock);
  const isUnavailable = stockClass === "is-unavailable";

  return (
    <>
      <div className="product-detail-media">
        <img src={display.image || fallbackImage} alt={product.name} loading="lazy" />
        {isUnavailable ? (
          <div className="product-detail-media__overlay" aria-hidden="true">Out of Stock</div>
        ) : null}
      </div>

      <div className="product-detail-content">
        <div className="product-detail-badges">
          {display.discount ? <span className="product-detail-discount">{display.discount}% Off</span> : null}
          <span className={`product-detail-season ${display.inSeason ? "is-in-season" : "is-off-season"}`}>
            {display.inSeason ? "In Season" : "Out of Season"}
          </span>
        </div>

        <h1>{product.name}</h1>

        <div className="product-detail-pricing">
          <span className="product-detail-price">{formatProductPrice(display.price, display.unit)}</span>
          {display.oldPrice && display.oldPrice > display.price ? (
            <span className="product-detail-old-price">{formatProductPrice(display.oldPrice, display.unit)}</span>
          ) : null}
        </div>

        {stockLabel ? <p className={`product-detail-stock ${stockClass}`.trim()}>{stockLabel}</p> : null}

        {Array.isArray(variations) && variations.length ? (
          <VariantPicker
            variations={variations}
            selectedId={selectedVariant?.variationId}
            onChange={(v) => setSelectedVariant(v)}
          />
        ) : null}

        <AddToCartForm product={display} fallbackImage={fallbackImage} />
      </div>
    </>
  );
}
