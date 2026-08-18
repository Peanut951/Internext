import fs from "node:fs";
import { isTangibleCatalogProduct } from "./lib/product-classification.mjs";
import {
  applySourcedShippingMeasurement,
  buildSourcedShippingMeasurementMap,
  loadSourcedShippingMeasurements,
} from "./lib/sourced-shipping-measurements.mjs";

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
  /(\d+(?:\.\d+)?)\s*[xX\u00d7]\s*(\d+(?:\.\d+)?)\s*[xX\u00d7]\s*(\d+(?:\.\d+)?)\s*(mm|cm)\b/i.test(
    textFor(product),
  );

const loadShippingMeasurementOverrides = async () => {
  const supabaseUrl = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  const serviceRoleKey = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_SECRET_KEY || "",
  ).trim();
  if (!supabaseUrl || !serviceRoleKey) return [];

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/catalog_shipping_measurements?select=code,supplier_code,weight_kg,height_cm,width_cm,depth_cm,source,confidence,updated_at`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          Accept: "application/json",
        },
      },
    );
    return response.ok ? await response.json() : [];
  } catch {
    return [];
  }
};

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

const sourcedMeasurements = loadSourcedShippingMeasurements();
const sourcedMeasurementsByKey = buildSourcedShippingMeasurementMap(sourcedMeasurements);
for (const [key, product] of productsByKey) {
  productsByKey.set(key, applySourcedShippingMeasurement(product, sourcedMeasurementsByKey));
}

const measurementOverrides = await loadShippingMeasurementOverrides();
for (const override of measurementOverrides) {
  const overrideKeys = [override.code, override.supplier_code]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  const existingKey = overrideKeys.find((key) => productsByKey.has(key));
  if (!existingKey) continue;
  const product = productsByKey.get(existingKey);
  const correctedProduct = {
    ...product,
    weightKg: Number(override.weight_kg),
    heightCm: Number(override.height_cm),
    widthCm: Number(override.width_cm),
    depthCm: Number(override.depth_cm),
    measurementSource: override.source,
    measurementConfidence: override.confidence,
    measurementUpdatedAt: override.updated_at,
    measurementOverride: true,
  };
  productsByKey.set(existingKey, correctedProduct);
  for (const key of overrideKeys) {
    if (productsByKey.has(key)) productsByKey.set(key, correctedProduct);
  }
}

const physicalProducts = [...productsByKey.values()].filter(isTangibleCatalogProduct);
const complete = physicalProducts.filter(hasCompleteDimensionFields);
const missing = physicalProducts.filter((product) => !hasCompleteDimensionFields(product));
const parseable = physicalProducts.filter(
  (product) => !hasCompleteDimensionFields(product) && (hasParsedWeight(product) || hasParsedDimensions(product)),
);
const fallback = physicalProducts.filter(
  (product) => !hasCompleteDimensionFields(product) && !(hasParsedWeight(product) || hasParsedDimensions(product)),
);

const audit = {
  generatedAt: new Date().toISOString(),
  summary: {
      totalPhysical: physicalProducts.length,
      completeSupplierDimensionFields: complete.length,
      missingAnyDimensionFields: physicalProducts.length - complete.length,
      canPartlyParseFromText: parseable.length,
      needsCategoryFallback: fallback.length,
      adminMeasurementOverrides: measurementOverrides.length,
      sourcedVerifiedMeasurements: sourcedMeasurements.length,
      confidence: {
        verified: physicalProducts.filter((product) => product.measurementConfidence === "verified").length,
        high: complete.filter((product) => product.measurementConfidence !== "verified").length,
        medium: parseable.length,
        low: fallback.length,
      },
      sampleFallback: fallback.slice(0, 20).map((product) => ({
        code: product.code,
        supplierCode: product.supplierCode,
        name: product.description,
      })),
  },
  unresolved: missing.map((product) => ({
    code: product.code,
    supplierCode: product.supplierCode,
    manufacturer: product.manufacturer,
    name: product.description,
    missingFields: ["weightKg", "heightCm", "widthCm", "depthCm"].filter(
      (field) => !isPositiveNumber(product[field]),
    ),
    currentValues: {
      weightKg: isPositiveNumber(product.weightKg) ? Number(product.weightKg) : null,
      heightCm: isPositiveNumber(product.heightCm) ? Number(product.heightCm) : null,
      widthCm: isPositiveNumber(product.widthCm) ? Number(product.widthCm) : null,
      depthCm: isPositiveNumber(product.depthCm) ? Number(product.depthCm) : null,
    },
    textContainsMeasurement: hasParsedWeight(product) || hasParsedDimensions(product),
  })),
};

fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/shipping-measurement-audit.json", `${JSON.stringify(audit, null, 2)}\n`);
console.log(JSON.stringify(audit.summary, null, 2));
