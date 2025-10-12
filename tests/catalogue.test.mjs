import test from "node:test";
import assert from "node:assert/strict";

import {
  normaliseProductCatalogue,
  pickMostPopularProducts,
  resolveStockClass,
} from "../src/lib/catalogue.js";

test("normaliseProductCatalogue flattens nested collections and keeps unique ids", () => {
  const catalogue = normaliseProductCatalogue({
    fruits: [
      { id: "1", name: "Apple", price: 100, stock: "In Stock" },
      { id: "2", name: "Orange", price: 120, stock: "Limited stock" },
    ],
    extras: [
      { id: "1", name: "Apple duplicate", price: 200, stock: "In Stock" },
      {
        id: "3",
        name: "Avocado",
        variations: [{ price: 300, stock: "In Stock", unit: "kg" }],
      },
    ],
  });

  assert.equal(catalogue.ordered.length, 3);
  assert.equal(catalogue.index.get("1").name, "Apple");
  assert.equal(catalogue.index.get("3").unit, "kg");
});

test("pickMostPopularProducts filters out excluded ids and respects limit", () => {
  const sample = [
    { id: "1", name: "Item 1" },
    { id: "2", name: "Item 2" },
    { id: "3", name: "Item 3" },
    { id: "4", name: "Item 4" },
  ];
  const result = pickMostPopularProducts(sample, new Set(["2", "3"]), 2);
  assert.deepEqual(
    result.map((product) => product.id),
    ["1", "4"],
    "returns items not excluded and in original order"
  );
});

test("resolveStockClass maps stock labels to css modifiers", () => {
  assert.equal(resolveStockClass("Out of stock"), "is-unavailable");
  assert.equal(resolveStockClass("Limited stock"), "is-limited");
  assert.equal(resolveStockClass("In Stock"), "is-available");
});
