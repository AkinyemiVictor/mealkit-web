"use client";

import { useEffect, useMemo, useState } from "react";
import fallbackCatalogue from "@/data/products";
import { normaliseProductCatalogue } from "@/lib/catalogue";

let inMemoryCache = null;

export default function useProducts() {
  const [catalogue, setCatalogue] = useState(() => fallbackCatalogue);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchProducts = async () => {
      if (inMemoryCache) {
        setCatalogue(inMemoryCache);
        return;
      }
      setStatus("loading");
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const grouped = json && json.grouped ? json.grouped : json;
        if (!cancelled) {
          inMemoryCache = grouped;
          setCatalogue(grouped);
          setStatus("ready");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setStatus("error");
        }
      }
    };
    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  const lookup = useMemo(() => normaliseProductCatalogue(catalogue), [catalogue]);

  return {
    catalogue,
    ordered: lookup.ordered,
    index: lookup.index,
    status,
    error,
  };
}
