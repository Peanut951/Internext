import fs from "node:fs";
import path from "node:path";

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const normalizeCode = (value) => String(value || "").trim().toLowerCase();

const fourCProducts = readJson(path.resolve("public", "data", "4c-products.json"));
const liveSnapshot = readJson(path.resolve("public", "data", "catalog-live-overrides.json"));
const liveProducts = Array.isArray(liveSnapshot.items) ? liveSnapshot.items : [];

const liveByCode = new Map();
const liveBySupplierCode = new Map();

for (const product of liveProducts) {
  const code = normalizeCode(product.code);
  const supplierCode = normalizeCode(product.supplierCode);
  if (code && !liveByCode.has(code)) liveByCode.set(code, product);
  if (supplierCode && !liveBySupplierCode.has(supplierCode)) {
    liveBySupplierCode.set(supplierCode, product);
  }
}

const quoteOnlyCodes = new Set();
const canonicalCurrentCodes = new Set();

for (const product of fourCProducts) {
  const code = normalizeCode(product.code);
  const supplierCode = normalizeCode(product.supplierCode);
  const currentMatch =
    liveByCode.get(code) ||
    liveByCode.get(supplierCode) ||
    liveBySupplierCode.get(supplierCode) ||
    liveBySupplierCode.get(code);

  if (currentMatch) {
    canonicalCurrentCodes.add(String(currentMatch.code));
  } else {
    quoteOnlyCodes.add(String(product.code));
  }
}

let missingCanonicalPages = 0;
const quotePagesMissingContactPricing = [];
const quotePagesWithStructuredOffers = [];

for (const code of new Set([...quoteOnlyCodes, ...canonicalCurrentCodes])) {
  const pagePath = path.resolve("dist", "products", "item", encodeURIComponent(code), "index.html");
  if (!fs.existsSync(pagePath)) {
    missingCanonicalPages += 1;
    continue;
  }

  if (!quoteOnlyCodes.has(code)) continue;

  const html = fs.readFileSync(pagePath, "utf8");
  if (!html.includes("Contact for pricing")) quotePagesMissingContactPricing.push(code);
  if (/"offers"\s*:/.test(html)) quotePagesWithStructuredOffers.push(code);
}

const googleFeed = fs.readFileSync(path.resolve("public", "google-products.xml"), "utf8");
const staleFourCItemsInGoogleFeed = [...googleFeed.matchAll(/<g:id>4C-[^<]+<\/g:id>/g)].length;

const result = {
  fourCProductsChecked: fourCProducts.length,
  quoteOnlyFallbackProducts: quoteOnlyCodes.size,
  canonicalCurrentSupplierMatches: canonicalCurrentCodes.size,
  missingCanonicalPages,
  quotePagesMissingContactPricing: quotePagesMissingContactPricing.length,
  quotePagesWithStructuredOffers: quotePagesWithStructuredOffers.length,
  quotePagesMissingContactPricingCodes: quotePagesMissingContactPricing,
  quotePagesWithStructuredOfferCodes: quotePagesWithStructuredOffers,
  staleFourCItemsInGoogleFeed,
};

console.log(JSON.stringify(result, null, 2));

if (
  missingCanonicalPages > 0 ||
  quotePagesMissingContactPricing.length > 0 ||
  quotePagesWithStructuredOffers.length > 0 ||
  staleFourCItemsInGoogleFeed > 0
) {
  process.exitCode = 1;
}
