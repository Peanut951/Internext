import fs from "node:fs";
import { isTangibleCatalogProduct } from "./lib/product-classification.mjs";

const readJson = (path) => {
  if (!fs.existsSync(path)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(path, "utf8"));
};

const keyFor = (product) => String(product.code || product.supplierCode || "").trim().toLowerCase();
const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const textFor = (product) =>
  [product.description, product.longDescription, JSON.stringify(product.leaderSpecs || {})]
    .filter(Boolean)
    .join(" ");

const hasCompleteDimensionFields = (product) =>
  isPositiveNumber(product.weightKg) &&
  isPositiveNumber(product.heightCm) &&
  isPositiveNumber(product.widthCm) &&
  isPositiveNumber(product.depthCm);

const hasParsedWeight = (product) => /(\d+(?:\.\d+)?)\s*(kg|g|gram|grams)\b/i.test(textFor(product));
const hasParsedDimensions = (product) =>
  /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm)\b/i.test(
    textFor(product),
  );

const baseProducts = readJson("public/data/catalog-products.json");
const leaderProducts = readJson("public/data/leader-products.json");
const liveOverrides = readJson("public/data/catalog-live-overrides.json").items || [];

const productsByKey = new Map();
for (const product of [...baseProducts, ...leaderProducts]) {
  const key = keyFor(product);
  if (key) {
    productsByKey.set(key, product);
  }
}

for (const product of liveOverrides) {
  const key = keyFor(product);
  if (key) {
    productsByKey.set(key, { ...(productsByKey.get(key) || {}), ...product });
  }
}

const physicalProducts = [...productsByKey.values()].filter(isTangibleCatalogProduct);
const complete = physicalProducts.filter(hasCompleteDimensionFields);
const parseable = physicalProducts.filter(
  (product) => !hasCompleteDimensionFields(product) && (hasParsedWeight(product) || hasParsedDimensions(product)),
);
const fallback = physicalProducts.filter(
  (product) => !hasCompleteDimensionFields(product) && !(hasParsedWeight(product) || hasParsedDimensions(product)),
);

console.log(
  JSON.stringify(
    {
      totalPhysical: physicalProducts.length,
      completeSupplierDimensionFields: complete.length,
      missingAnyDimensionFields: physicalProducts.length - complete.length,
      canPartlyParseFromText: parseable.length,
      needsCategoryFallback: fallback.length,
      sampleFallback: fallback.slice(0, 20).map((product) => ({
        code: product.code,
        supplierCode: product.supplierCode,
        name: product.description,
      })),
    },
    null,
    2,
  ),
);
