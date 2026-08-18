import fs from "node:fs";
import path from "node:path";
import { isTangibleCatalogProduct } from "./lib/product-classification.mjs";
import {
  applySourcedShippingMeasurement,
  buildSourcedShippingMeasurementMap,
  loadSourcedShippingMeasurements,
  sourcedShippingMeasurementsPath,
} from "./lib/sourced-shipping-measurements.mjs";

const ICECAT_ENDPOINT = "https://live.icecat.biz/api/";
const reportPath = path.resolve("reports/shipping-measurement-icecat-enrichment.json");
const args = process.argv.slice(2);
const options = { concurrency: 8, limit: Number.POSITIVE_INFINITY, retryMisses: false, code: "" };

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--concurrency") {
    options.concurrency = Number.parseInt(args[index + 1] || "", 10);
    index += 1;
  } else if (arg === "--limit") {
    options.limit = Number.parseInt(args[index + 1] || "", 10);
    index += 1;
  } else if (arg === "--retry-misses") {
    options.retryMisses = true;
  } else if (arg === "--code") {
    options.code = String(args[index + 1] || "").trim().toLowerCase();
    index += 1;
  }
}

if (!Number.isFinite(options.concurrency) || options.concurrency < 1) options.concurrency = 8;
if (!Number.isFinite(options.limit) || options.limit < 1) options.limit = Number.POSITIVE_INFINITY;

const readJson = (filePath, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
};
const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};
const normalize = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizeGtin = (value) => String(value || "").replace(/\D/g, "").replace(/^0+/, "");
const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const complete = (product) =>
  [product.weightKg, product.heightCm, product.widthCm, product.depthCm].every(positive);
const productKeys = (product) => [product.code, product.supplierCode].map(normalize).filter(Boolean);

const fetchJson = async (url, attempts = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json", "User-Agent": "Internext catalogue measurement verification/1.0" },
      });
      if (response.status === 404 || response.status === 400) return null;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
};

const getQueries = (product) => {
  const queries = [];
  const gtin = normalizeGtin(product.gtin || product.ean || product.upc || product.barcode);
  if (gtin) queries.push({ query: `ean_upc=${encodeURIComponent(gtin)}`, kind: "gtin" });
  const brand = String(product.manufacturer || "").trim();
  for (const partCode of [product.supplierCode, product.code].filter(Boolean)) {
    if (brand) {
      queries.push({
        query: `brand=${encodeURIComponent(brand)}&productcode=${encodeURIComponent(partCode)}`,
        kind: "mpn",
      });
    }
  }
  return queries.filter(
    (query, index, list) => list.findIndex((candidate) => candidate.query === query.query) === index,
  );
};

const responseMatchesProduct = (product, json) => {
  const info = json?.data?.GeneralInfo;
  if (!info) return false;
  const expectedKeys = productKeys(product);
  const returnedPartCode = normalize(info.BrandPartCode);
  if (returnedPartCode && expectedKeys.includes(returnedPartCode)) return true;

  const expectedGtin = normalizeGtin(product.gtin || product.ean || product.upc || product.barcode);
  const returnedGtins = (Array.isArray(info.GTIN) ? info.GTIN : [info.GTIN]).map(normalizeGtin).filter(Boolean);
  return Boolean(expectedGtin && returnedGtins.includes(expectedGtin));
};

const convertDimensionToCm = (presentationValue) => {
  const match = String(presentationValue || "").match(/(-?\d+(?:\.\d+)?)\s*(mm|cm|m|in|inch|inches)\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!positive(value)) return null;
  if (unit === "mm") return value / 10;
  if (unit === "m") return value * 100;
  if (unit === "in" || unit === "inch" || unit === "inches") return value * 2.54;
  return value;
};

const convertWeightToKg = (presentationValue) => {
  const match = String(presentationValue || "").match(/(-?\d+(?:\.\d+)?)\s*(mg|g|kg|lb|lbs|pound|pounds|oz)\b/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!positive(value)) return null;
  if (unit === "mg") return value / 1_000_000;
  if (unit === "g") return value / 1000;
  if (["lb", "lbs", "pound", "pounds"].includes(unit)) return value * 0.45359237;
  if (unit === "oz") return value * 0.028349523;
  return value;
};

const parsePackageMeasurements = (json) => {
  const values = new Map();
  for (const group of json?.data?.FeaturesGroups || []) {
    for (const item of group.Features || []) {
      const name = String(item?.Feature?.Name?.Value || item?.Name?.Value || "").trim().toLowerCase();
      const value = item?.PresentationValue;
      if (name) values.set(name, value);
    }
  }

  const widthCm = convertDimensionToCm(values.get("package width"));
  const depthCm = convertDimensionToCm(values.get("package depth"));
  const heightCm = convertDimensionToCm(values.get("package height"));
  const weightKg = convertWeightToKg(values.get("package weight"));
  if (![widthCm, depthCm, heightCm, weightKg].every(positive)) return null;

  const result = {
    weightKg: Math.round(weightKg * 1000) / 1000,
    heightCm: Math.round(heightCm * 100) / 100,
    widthCm: Math.round(widthCm * 100) / 100,
    depthCm: Math.round(depthCm * 100) / 100,
  };
  if (
    ![result.weightKg, result.heightCm, result.widthCm, result.depthCm].every(positive) ||
    result.weightKg > 1000 ||
    [result.heightCm, result.widthCm, result.depthCm].some((value) => value > 1500)
  ) {
    return null;
  }
  return result;
};

const sourceProduct = async (product) => {
  for (const query of getQueries(product)) {
    const url = `${ICECAT_ENDPOINT}?shopname=openIcecat-live&lang=en&content=all&${query.query}`;
    const json = await fetchJson(url);
    if (!json || !responseMatchesProduct(product, json)) continue;
    const measurements = parsePackageMeasurements(json);
    if (!measurements) continue;
    const info = json.data.GeneralInfo;
    return {
      measurements,
      sourceReference: info?.Description?.LeafletPDFURL || info?.Description?.URL || url,
      icecatId: info?.IcecatId,
      matchedBy: query.kind,
    };
  }
  return null;
};

const baseProducts = readJson(path.resolve("public/data/catalog-products.json"), []);
const leaderProducts = readJson(path.resolve("public/data/leader-products.json"), []);
const liveItems = readJson(path.resolve("public/data/catalog-live-overrides.json"), { items: [] }).items || [];
const productsByKey = new Map();
for (const product of [...baseProducts, ...leaderProducts]) {
  const key = normalize(product.code || product.supplierCode);
  if (key) productsByKey.set(key, product);
}
for (const product of liveItems) {
  const key = normalize(product.code || product.supplierCode);
  if (key) productsByKey.set(key, { ...(productsByKey.get(key) || {}), ...product });
}

const savedItems = loadSourcedShippingMeasurements();
const savedMap = buildSourcedShippingMeasurementMap(savedItems);
const report = readJson(reportPath, { processed: {}, successes: [], misses: [], errors: [] });
if (options.retryMisses) {
  report.processed = {};
  report.misses = [];
  report.errors = [];
}

const targets = [...productsByKey.values()]
  .map((product) => applySourcedShippingMeasurement(product, savedMap))
  .filter(isTangibleCatalogProduct)
  .filter((product) => !complete(product))
  .filter((product) => !options.code || productKeys(product).includes(normalize(options.code)))
  .filter((product) => !report.processed[normalize(product.code || product.supplierCode)])
  .slice(0, options.limit);

let cursor = 0;
let completedSinceSave = 0;
const persist = () => {
  const uniqueItems = new Map();
  for (const item of [...savedItems, ...report.successes]) {
    uniqueItems.set(normalize(item.code || item.supplierCode), item);
  }
  const items = [...uniqueItems.values()].sort((a, b) => String(a.code).localeCompare(String(b.code)));
  writeJson(sourcedShippingMeasurementsPath, { updatedAt: new Date().toISOString(), items });
  report.updatedAt = new Date().toISOString();
  report.counts = { targeted: targets.length, sourced: report.successes.length, totalSourced: items.length, misses: report.misses.length, errors: report.errors.length };
  writeJson(reportPath, report);
  completedSinceSave = 0;
};

const worker = async () => {
  while (cursor < targets.length) {
    const product = targets[cursor++];
    const key = normalize(product.code || product.supplierCode);
    try {
      const result = await sourceProduct(product);
      if (!result) {
        report.misses.push({ code: product.code, supplierCode: product.supplierCode, reason: "exact-package-measurements-not-found" });
      } else {
        report.successes.push({
          code: product.code,
          supplierCode: product.supplierCode,
          ...result.measurements,
          source: "Open Icecat package specification",
          sourceReference: result.sourceReference,
          confidence: "verified",
          updatedAt: new Date().toISOString(),
          icecatId: result.icecatId,
          matchedBy: result.matchedBy,
        });
      }
    } catch (error) {
      report.errors.push({ code: product.code, supplierCode: product.supplierCode, error: error instanceof Error ? error.message : String(error) });
    }
    report.processed[key] = true;
    completedSinceSave += 1;
    if (completedSinceSave >= 20) persist();
  }
};

console.log(`Checking ${targets.length} incomplete products against exact Open Icecat records...`);
await Promise.all(Array.from({ length: Math.min(options.concurrency, targets.length || 1) }, () => worker()));
persist();
console.log(JSON.stringify(report.counts, null, 2));
