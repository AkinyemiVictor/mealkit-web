import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const sourceDir = path.join(projectRoot, "public", "assets", "img", "product images");
const targetBaseDir = path.join(projectRoot, "public", "assets", "products");
const fallbackFile = (() => {
  const fallbackCandidates = ["rename.png", "tomato.png", "apple.png"];
  for (const candidate of fallbackCandidates) {
    const candidatePath = path.join(sourceDir, candidate);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }
  const files = fs.readdirSync(sourceDir);
  return path.join(sourceDir, files.find((file) => /\.(png|jpe?g|webp)$/i.test(file)));
})();

const slugify = (value) =>
  (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "item";

const normalise = (value) => (value || "").toString().toLowerCase().replace(/[^a-z0-9]+/g, "");

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const loadProducts = async () => {
  const moduleUrl = pathToFileURL(path.join(projectRoot, "src", "data", "products.js")).href;
  const module = await import(moduleUrl);
  return module.products;
};

const fileEntries = fs
  .readdirSync(sourceDir)
  .filter((file) => /\.(png|jpe?g|webp)$/i.test(file))
  .map((file) => ({
    file,
    fullPath: path.join(sourceDir, file),
    key: normalise(path.parse(file).name),
  }));

const findMatchingFile = (candidates) => {
  for (const candidate of candidates) {
    const key = normalise(candidate);
    if (!key) continue;
    let match = fileEntries.find((entry) => entry.key === key);
    if (match) return match;
    match = fileEntries.find((entry) => entry.key.includes(key) || key.includes(entry.key));
    if (match) return match;
  }
  return null;
};

const copyImage = (sourcePath, destinationPath) => {
  ensureDir(path.dirname(destinationPath));
  if (!fs.existsSync(destinationPath)) {
    fs.copyFileSync(sourcePath, destinationPath);
  }
};

const processProducts = async () => {
  console.log("📦 Normalising product images…");

  if (fs.existsSync(targetBaseDir)) {
    fs.rmSync(targetBaseDir, { recursive: true, force: true });
  }
  ensureDir(targetBaseDir);

  const products = await loadProducts();
  const updatedProducts = {};
  const fallbackRelPath = "/assets/products/placeholder.png";

  const placeholderTarget = path.join(targetBaseDir, "placeholder.png");
  copyImage(fallbackFile, placeholderTarget);

  const fallbackCounts = new Map();

  for (const [categoryKey, items] of Object.entries(products)) {
    const categorySlug = slugify(categoryKey);
    const categoryDir = path.join(targetBaseDir, categorySlug);
    ensureDir(categoryDir);

    updatedProducts[categoryKey] = items.map((product) => {
      const productSlug = slugify(product.name);
      const baseCandidates = [
        product.name,
        product.image ? path.parse(product.image).name : "",
      ];

      let baseImagePath = null;

      if (Array.isArray(product.variations) && product.variations.length) {
        const updatedVariations = product.variations.map((variation, index) => {
          const variationSlugParts = [productSlug];
          const variationCandidates = [
            product.name,
            variation.variationId,
            variation.image ? path.parse(variation.image).name : "",
          ];

          Object.entries(variation)
            .filter(
              ([key, value]) =>
                ![
                  "variationId",
                  "price",
                  "unit",
                  "stock",
                  "oldPrice",
                  "discount",
                  "image",
                  "available",
                ].includes(key) && typeof value === "string"
            )
            .forEach(([, value]) => {
              variationSlugParts.push(slugify(value));
              variationCandidates.push(value);
            });

          const variationSlug = variationSlugParts.filter(Boolean).join("-");
          const destinationFileName = `${variationSlug || `${productSlug}-${index + 1}`}.png`;
          const destinationFullPath = path.join(categoryDir, destinationFileName);
          const destinationRelPath = `/assets/products/${categorySlug}/${destinationFileName}`;

          const match =
            findMatchingFile([...variationCandidates, ...baseCandidates]) ||
            findMatchingFile(baseCandidates);

          if (match) {
            copyImage(match.fullPath, destinationFullPath);
          } else {
            copyImage(placeholderTarget, destinationFullPath);
            fallbackCounts.set(categoryKey, (fallbackCounts.get(categoryKey) || 0) + 1);
          }

          if (!baseImagePath) {
            baseImagePath = destinationRelPath;
          }

          return {
            ...variation,
            image: destinationRelPath,
          };
        });

        return {
          ...product,
          image: baseImagePath || fallbackRelPath,
          variations: updatedVariations,
        };
      }

      const destinationFileName = `${productSlug}.png`;
      const destinationFullPath = path.join(categoryDir, destinationFileName);
      const destinationRelPath = `/assets/products/${categorySlug}/${destinationFileName}`;

      const match = findMatchingFile(baseCandidates);
      if (match) {
        copyImage(match.fullPath, destinationFullPath);
      } else {
        copyImage(placeholderTarget, destinationFullPath);
        fallbackCounts.set(categoryKey, (fallbackCounts.get(categoryKey) || 0) + 1);
      }

      return {
        ...product,
        image: destinationRelPath,
      };
    });
  }

  const outputPath = path.join(projectRoot, "src", "data", "products.js");
  const fileHeader = `export const products = ${JSON.stringify(updatedProducts, null, 2)};\n\nexport default products;\n`;
  fs.writeFileSync(outputPath, fileHeader, "utf8");

  if (fallbackCounts.size) {
    console.log("⚠️  Used placeholder image for the following categories:");
    for (const [category, count] of fallbackCounts.entries()) {
      console.log(`  - ${category}: ${count} items`);
    }
  }

  console.log("✅ Product images normalised and data updated.");
};

processProducts().catch((error) => {
  console.error("Failed to update product images:", error);
  process.exitCode = 1;
});
