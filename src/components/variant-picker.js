"use client";

import { useState, useEffect } from "react";

export default function VariantPicker({
  variations = [],
  selectedId,
  onChange,
}) {
  const [current, setCurrent] = useState(selectedId || (variations[0]?.variationId ?? null));

  useEffect(() => {
    setCurrent(selectedId || (variations[0]?.variationId ?? null));
  }, [selectedId, variations]);

  const handleSelect = (id) => {
    setCurrent(id);
    const variant = variations.find((v) => v.variationId === id);
    if (variant && onChange) onChange(variant);
  };

  if (!Array.isArray(variations) || variations.length === 0) return null;

  return (
    <div className="product-variant-picker">
      <h3>Choose an option</h3>
      <div className="product-variant-picker__options" role="list">
        {variations.map((v) => {
          const label = v.name || v.ripeness || v.size || v.packaging || v.variationId;
          const isActive = current === v.variationId;
          return (
            <button
              key={v.variationId || label}
              type="button"
              role="listitem"
              className={`product-variant-picker__option${isActive ? " is-active" : ""}`.trim()}
              onClick={() => handleSelect(v.variationId)}
              aria-pressed={isActive}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

