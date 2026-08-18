import fs from "node:fs";
import path from "node:path";
import { isTangibleCatalogProduct } from "./lib/product-classification.mjs";
import {
  loadSourcedShippingMeasurements,
  sourcedShippingMeasurementsPath,
} from "./lib/sourced-shipping-measurements.mjs";

const ALLOYS_ORIGIN = "https://www.alloys.com.au";
const reportPath = path.resolve("reports/shipping-measurement-enrichment.json");
const args = process.argv.slice(2);
const options = { concurrency: 6, limit: Number.POSITIVE_INFINITY, retryMisses: false, code: "" };

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

if (!Number.isFinite(options.concurrency) || options.concurrency < 1) options.concurrency = 6;
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
const positive = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const complete = (product) =>
  [product.weightKg, product.heightCm, product.widthCm, product.depthCm].every(positive);
const productKeys = (product) => [product.code, product.supplierCode].map(normalize).filter(Boolean);

const decodeHtml = (value) =>
  String(value || "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&times;|&#215;/gi, "x")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&[a-z0-9#]+;/gi, " ");

const htmlToText = (html) =>
  decodeHtml(
    String(html || "")
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<\/(?:div|p|li|tr|td|th|h[1-6]|section|article)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();

const fetchText = async (url, attempts = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "Internext catalogue measurement verification/1.0",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { text: await response.text(), finalUrl: response.url };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
};

const findExactProductUrl = async (product) => {
  const expectedKeys = new Set(productKeys(product));
  for (const query of [product.code, product.supplierCode].filter(Boolean)) {
    const searchUrl = `${ALLOYS_ORIGIN}/ProductDisplay.aspx?ProductSearch=${encodeURIComponent(query)}`;
    const { text, finalUrl } = await fetchText(searchUrl);
    const finalPath = new URL(finalUrl).pathname;
    if (!/productdisplay\.aspx/i.test(finalPath) && [...expectedKeys].some((key) => normalize(text).includes(key))) {
      return finalUrl;
    }

    const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = anchorPattern.exec(text))) {
      const label = normalize(htmlToText(match[2]));
      if (![...expectedKeys].some((key) => label.includes(key))) continue;
      const candidate = new URL(decodeHtml(match[1]), ALLOYS_ORIGIN);
      candidate.search = "";
      return candidate.href;
    }
  }
  return "";
};

const parseAlloysMeasurements = (html, product) => {
  const text = htmlToText(html);
  const expectedKeys = productKeys(product);
  if (!expectedKeys.some((key) => normalize(text).includes(key))) return null;

  const specificationStart = text.toLowerCase().lastIndexOf("technical specifications");
  const specificationText = specificationStart >= 0 ? text.slice(specificationStart, specificationStart + 2500) : text;
  const readField = (label) => {
    const match = specificationText.match(new RegExp(`(?:^|\\n)${label}\\s*(?:\\n|:)?\\s*(\\d+(?:\\.\\d+)?)`, "i"));
    return match ? Number(match[1]) : null;
  };

  const heightMetres = readField("Height");
  const weightKg = readField("Weight");
  const widthMetres = readField("Width");
  const lengthMetres = readField("Length");
  if (![heightMetres, weightKg, widthMetres, lengthMetres].every(positive)) return null;

  const result = {
    weightKg,
    heightCm: Math.round(heightMetres * 10000) / 100,
    widthCm: Math.round(widthMetres * 10000) / 100,
    depthCm: Math.round(lengthMetres * 10000) / 100,
  };
  if (result.weightKg > 1000 || [result.heightCm, result.widthCm, result.depthCm].some((value) => value > 1500)) {
    return null;
  }
  return result;
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
const savedByKey = new Map();
for (const item of savedItems) for (const key of productKeys(item)) savedByKey.set(key, item);
const report = readJson(reportPath, { processed: {}, successes: [], misses: [], errors: [] });
if (options.retryMisses) {
  report.processed = {};
  report.misses = [];
  report.errors = [];
}

const missingProducts = [...productsByKey.values()]
  .filter(isTangibleCatalogProduct)
  .filter((product) => !complete(product))
  .filter((product) => !productKeys(product).some((key) => savedByKey.has(key)))
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
  report.counts = {
    targeted: missingProducts.length,
    sourced: items.length,
    misses: report.misses.length,
    errors: report.errors.length,
  };
  writeJson(reportPath, report);
  completedSinceSave = 0;
};

const worker = async () => {
  while (cursor < missingProducts.length) {
    const product = missingProducts[cursor++];
    const productKey = normalize(product.code || product.supplierCode);
    try {
      const productUrl = await findExactProductUrl(product);
      if (!productUrl) {
        report.misses.push({ code: product.code, supplierCode: product.supplierCode, reason: "exact-product-page-not-found" });
      } else {
        const { text, finalUrl } = await fetchText(productUrl);
        const measurements = parseAlloysMeasurements(text, product);
        if (!measurements) {
          report.misses.push({ code: product.code, supplierCode: product.supplierCode, sourceReference: finalUrl, reason: "complete-measurements-not-published" });
        } else {
          report.successes.push({
            code: product.code,
            supplierCode: product.supplierCode,
            ...measurements,
            source: "Alloys public product page",
            sourceReference: finalUrl.split("?")[0],
            confidence: "verified",
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      report.errors.push({ code: product.code, supplierCode: product.supplierCode, error: error instanceof Error ? error.message : String(error) });
    }
    report.processed[productKey] = true;
    completedSinceSave += 1;
    if (completedSinceSave >= 20) persist();
  }
};

console.log(`Checking ${missingProducts.length} incomplete products against exact Alloys product pages...`);
await Promise.all(Array.from({ length: Math.min(options.concurrency, missingProducts.length || 1) }, () => worker()));
persist();
console.log(JSON.stringify(report.counts, null, 2));
