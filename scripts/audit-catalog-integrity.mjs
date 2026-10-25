import fs from "node:fs";
import path from "node:path";
import { isCurrentFourCProduct } from "../shared/four-c-catalog-freshness.js";
import { filterTangibleCatalogProducts } from "./lib/product-classification.mjs";
import {
  applyVerifiedProductIdentities,
  dedupeVerifiedProducts,
} from "./lib/verified-product-identity.mjs";

const root = process.cwd();
const readJson = (relativePath, fallback) => {
  const filePath = path.join(root, relativePath);
  return fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : fallback;
};
const readText = (relativePath) => {
  const filePath = path.join(root, relativePath);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
};
const getKeys = (product) =>
  [product?.code, product?.supplierCode]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
const decodeXmlText = (value) => String(value || "")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

const rawProducts = readJson("public/data/catalog-products.json", []);
const leaderProducts = readJson("public/data/leader-products.json", []);
const fourCProducts = readJson("public/data/4c-products.json", []);
const snapshot = readJson("public/data/catalog-live-overrides.json", { items: [] });
const quoteProducts = (readJson("public/data/supplier-quote-products.json", { products: [] }).products || [])
  .filter((product) => product?.code && product?.manufacturer && (product?.description || product?.name));
const expiredFourCQuoteProducts = fourCProducts
  .filter((product) => !isCurrentFourCProduct(product))
  .map((product) => ({
    ...product,
    price: null,
    resellerPrice: null,
    stockQuantity: 0,
    quoteRequired: true,
  }));
const verifiedQuoteProducts = dedupeVerifiedProducts([...quoteProducts, ...expiredFourCQuoteProducts]);
const currentSnapshotItems = (snapshot.items || []).filter((product) => isCurrentFourCProduct(product));
const verifiedProducts = dedupeVerifiedProducts([...currentSnapshotItems, ...verifiedQuoteProducts]);
const expectedVisibleProducts = filterTangibleCatalogProducts(applyVerifiedProductIdentities(
  [
    ...rawProducts,
    ...leaderProducts,
    ...fourCProducts.filter((product) => isCurrentFourCProduct(product)),
    ...currentSnapshotItems,
    ...verifiedQuoteProducts,
  ],
  verifiedProducts,
));
const verifiedKeys = new Set(verifiedProducts.flatMap(getKeys));
const expectedVisibleCodes = new Set(
  expectedVisibleProducts.map((product) => String(product.code || "").trim().toLowerCase()).filter(Boolean),
);
const allowedVisibleCodes = new Set(expectedVisibleCodes);
const allowedPurchasableCodes = new Set(
  currentSnapshotItems.map((product) => String(product.code || "").trim().toLowerCase()).filter(Boolean),
);

const unsupportedRawProducts = [...rawProducts, ...leaderProducts, ...fourCProducts].filter(
  (product) => !getKeys(product).some((key) => verifiedKeys.has(key)),
);

const googleIds = Array.from(readText("public/google-products.xml").matchAll(/<g:id>([^<]+)<\/g:id>/g))
  .map((match) => decodeXmlText(match[1]).trim().toLowerCase());
const sitemapCodes = Array.from(readText("public/sitemap.xml").matchAll(/\/products\/item\/([^<]+)<\/loc>/g))
  .map((match) => {
    try {
      return decodeURIComponent(match[1]).trim().toLowerCase();
    } catch {
      return match[1].trim().toLowerCase();
    }
  });
const staticPagesRoot = path.join(root, "dist", "products", "item");
const staticPageCodes = fs.existsSync(staticPagesRoot)
  ? fs.readdirSync(staticPagesRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        try {
          return decodeURIComponent(entry.name).trim().toLowerCase();
        } catch {
          return entry.name.trim().toLowerCase();
        }
      })
  : [];

const findUnsupportedCodes = (codes, allowedCodes) =>
  Array.from(new Set(codes.filter((code) => !allowedCodes.has(code)))).sort();
const findMissingCodes = (expectedCodes, actualCodes) => {
  const actual = new Set(actualCodes);
  return Array.from(expectedCodes).filter((code) => !actual.has(code)).sort();
};
const findDuplicateCodes = (codes) => {
  const seen = new Set();
  const duplicates = new Set();
  for (const code of codes) {
    if (seen.has(code)) duplicates.add(code);
    seen.add(code);
  }
  return Array.from(duplicates).sort();
};
const report = {
  auditedAt: new Date().toISOString(),
  verifiedSnapshotUpdatedAt: snapshot.updatedAt || null,
  supplierSnapshotStatus: snapshot.suppliers || null,
  counts: {
    rawEnrichmentProducts: rawProducts.length,
    leaderEnrichmentProducts: leaderProducts.length,
    fourCEnrichmentProducts: fourCProducts.length,
    verifiedSupplierProducts: (snapshot.items || []).length,
    verifiedQuoteProducts: verifiedQuoteProducts.length,
    expectedVisibleProducts: expectedVisibleCodes.size,
    unsupportedRawEnrichmentProducts: unsupportedRawProducts.length,
    googleProducts: googleIds.length,
    sitemapProducts: sitemapCodes.length,
    staticProductPages: staticPageCodes.length,
  },
  unsupportedCustomerFacing: {
    googleProductCodes: findUnsupportedCodes(googleIds, allowedPurchasableCodes),
    sitemapProductCodes: findUnsupportedCodes(sitemapCodes, allowedVisibleCodes),
    staticPageProductCodes: findUnsupportedCodes(staticPageCodes, allowedVisibleCodes),
  },
  missingCustomerFacing: {
    sitemapProductCodes: findMissingCodes(expectedVisibleCodes, sitemapCodes),
    staticPageProductCodes: findMissingCodes(expectedVisibleCodes, staticPageCodes),
  },
  duplicateCustomerFacing: {
    googleProductCodes: findDuplicateCodes(googleIds),
    sitemapProductCodes: findDuplicateCodes(sitemapCodes),
    staticPageProductCodes: findDuplicateCodes(staticPageCodes),
  },
  unsupportedRawExamples: unsupportedRawProducts.slice(0, 100).map((product) => ({
    code: product.code,
    supplierCode: product.supplierCode,
    manufacturer: product.manufacturer,
    description: product.description || product.name,
  })),
};

const reportPath = path.join(root, "reports", "catalog-integrity-audit.json");
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

const unsupportedOutputCount = Object.values(report.unsupportedCustomerFacing)
  .reduce((total, codes) => total + codes.length, 0);
const missingOutputCount = Object.values(report.missingCustomerFacing)
  .reduce((total, codes) => total + codes.length, 0);
const duplicateOutputCount = Object.values(report.duplicateCustomerFacing)
  .reduce((total, codes) => total + codes.length, 0);
console.log(JSON.stringify(report.counts, null, 2));
console.log(`Unsupported customer-facing catalogue entries: ${unsupportedOutputCount}`);
console.log(`Missing customer-facing catalogue entries: ${missingOutputCount}`);
console.log(`Duplicate customer-facing catalogue entries: ${duplicateOutputCount}`);
console.log(`Audit report: ${path.relative(root, reportPath)}`);

if (unsupportedOutputCount > 0 || missingOutputCount > 0 || duplicateOutputCount > 0) {
  process.exitCode = 1;
}
