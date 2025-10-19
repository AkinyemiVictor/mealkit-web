/*
  Normalize products data:
  - Consolidate size variants (Small/Medium/Large) into a `variations` array per product
  - Preserve existing variations (e.g., fruits with ripe/unripe)
  - Renumber ids per category into rounded ranges (fruits: 1+, vegetables: 100+, etc.)
  - Remove unintended duplicates

  Usage:
    node tools/normalize-products.mjs
*/

import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const dataPath = path.join(repoRoot, 'src', 'data', 'products.js');

function readProductsModule(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const marker = 'export const products';
  const idx = src.indexOf(marker);
  if (idx === -1) throw new Error('Could not find `export const products` in products.js');
  // Find first { after marker
  let i = src.indexOf('{', idx);
  if (i === -1) throw new Error('Could not find opening brace for products object');
  let depth = 0;
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let j = i; j < src.length; j++) {
    const ch = src[j];
    if (inStr) {
      if (esc) {
        esc = false;
      } else if (ch === '\\') {
        esc = true;
      } else if (ch === '"') {
        inStr = false;
      }
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (depth === 0) {
      end = j;
      break;
    }
  }
  if (end === -1) throw new Error('Failed to locate end of products object');
  const jsonText = src.slice(i, end + 1);
  // Try strict JSON parse; if it fails, attempt a relaxed evaluation
  let obj;
  try {
    obj = JSON.parse(jsonText);
  } catch (e) {
    // Remove trailing commas (simple heuristic)
    const noTrailing = jsonText
      .replace(/,\s*([}\]])/g, '$1');
    try {
      obj = JSON.parse(noTrailing);
    } catch (e2) {
      // As a last resort, use Function to evaluate (file is controlled in repo)
      // eslint-disable-next-line no-new-func
      obj = Function('return (' + noTrailing + ')')();
    }
  }
  return { src, objStart: i, objEnd: end + 1, products: obj };
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''; }

// Extract base product name and a size label (Small/Medium/Large),
// moving any parenthetical qualifier into the size label, e.g.:
//   "Red Onion Small(Shallots)" -> base: "Red Onion", size: "Small (Shallots)"
//   "Cabbage Large" -> base: "Cabbage", size: "Large"
function splitBaseAndSize(name) {
  if (!name) return null;
  const sizeMatch = name.match(/\b(small|medium|large)\b/i);
  if (!sizeMatch) return null;
  const sizeWord = cap(sizeMatch[1]);
  // Any parenthetical note anywhere in the name
  const parenMatch = name.match(/\(([^)]+)\)/);
  const qualifier = parenMatch ? parenMatch[1].trim() : '';
  // Base name: drop parentheses and size word
  const baseName = name
    .replace(/\(([^)]+)\)/g, '')
    .replace(/\b(small|medium|large)\b/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sizeLabel = qualifier ? `${sizeWord} (${qualifier})` : sizeWord;
  return { baseName, sizeLabel };
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-z0-9\s-]+/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

// Category base ranges
const CATEGORY_BASES = {
  fruits: 0,
  vegetables: 100,
  meatPoultry: 200,
  fishSeaFood: 300,
  grainsCereals: 400,
  dairyEggs: 500,
  tubersLegumes: 600,
  spicesCondiments: 700,
  oilCookingEssentials: 800,
  DrinksBeverages: 900,
  cookedFood: 1000,
  SnackesPasteries: 1100,
  others: 1200,
};

function consolidateCategoryItems(categoryKey, items) {
  // Fruits already tend to have ripeness variations; leave items with existing variations as-is.
  const isFruit = categoryKey === 'fruits';
  const grouped = new Map();
  const result = [];

  for (const item of items || []) {
    if (!item || typeof item !== 'object') continue;
    if (Array.isArray(item.variations) && item.variations.length) {
      result.push({ ...item });
      continue;
    }
    if (isFruit) {
      // Do not force-size-group fruits that lack explicit variations
      result.push({ ...item });
      continue;
    }
    const split = splitBaseAndSize(item.name || '');
    if (!split) {
      result.push({ ...item });
      continue;
    }
    const { baseName, sizeLabel } = split;
    const key = baseName.toLowerCase();
    const existing = grouped.get(key) || {
      baseName,
      product: {
        ...item,
        name: baseName,
        // image becomes representative; keep first encountered
        image: item.image,
        variations: [],
      },
    };
    // Build variation
    const variationId = `${slugify(baseName)}_${slugify(sizeLabel)}`;
    existing.product.variations.push({
      variationId,
      size: sizeLabel,
      price: item.price,
      unit: item.unit,
      stock: item.stock,
      image: item.image,
      oldPrice: item.oldPrice,
      discount: item.discount,
    });
    // Ensure top-level only contains fields relevant when variations exist
    delete existing.product.price;
    delete existing.product.unit;
    delete existing.product.stock;
    delete existing.product.oldPrice;
    delete existing.product.discount;
    grouped.set(key, existing);
  }

  // Append consolidated items to result, replacing any originals that were grouped
  for (const { product } of grouped.values()) {
    // Ensure at least one variation and representative image
    if (!product.image && product.variations[0]?.image) {
      product.image = product.variations[0].image;
    }
    result.push(product);
  }

  // Remove duplicates by name within category
  const seenNames = new Set();
  const deduped = [];
  for (const p of result) {
    const key = (p?.name || '').toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    deduped.push(p);
  }
  return deduped;
}

function renumber(productsObj) {
  const out = {};
  // Preserve key ordering from the original object
  for (const key of Object.keys(productsObj)) {
    const base = CATEGORY_BASES[key];
    const items = productsObj[key];
    const consolidated = consolidateCategoryItems(key, items);
    let start = (typeof base === 'number') ? base : 100 * (Object.keys(out).length + 1);
    let idx = 1;
    out[key] = consolidated.map((p) => {
      const clone = { ...p };
      clone.id = start + idx; // 1-based within range (e.g., 100+1 => 101)
      idx += 1;
      return clone;
    });
  }
  return out;
}

function writeProductsModule(originalSrc, start, end, productsObj) {
  const pretty = JSON.stringify(productsObj, null, 2);
  const before = originalSrc.slice(0, start);
  const after = originalSrc.slice(end);
  const newSrc = `${before}${pretty}${after}`;
  return newSrc;
}

// Main
const { src, objStart, objEnd, products } = readProductsModule(dataPath);
const backupPath = dataPath + '.bak';
fs.writeFileSync(backupPath, src, 'utf8');

const normalized = renumber(products);
const updatedSrc = writeProductsModule(src, objStart, objEnd, normalized);
fs.writeFileSync(dataPath, updatedSrc, 'utf8');

console.log('Normalized products written to', dataPath);
console.log('Backup saved to', backupPath);
