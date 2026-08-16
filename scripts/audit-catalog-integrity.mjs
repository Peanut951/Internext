import fs from "node:fs";
import path from "node:path";

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
const snapshot = readJson("public/data/catalog-live-overrides.json", { items: [] });
const quoteProducts = readJson("public/data/supplier-quote-products.json", { products: [] }).products || [];
const verifiedProducts = [...(snapshot.items || []), ...quoteProducts];
const verifiedKeys = new Set(verifiedProducts.flatMap(getKeys));
const verifiedCodes = new Set(verifiedProducts.map((product) => String(product.code || "").trim().toLowerCase()).filter(Boolean));
const allowedCustomerCodes = new Set(verifiedCodes);

// Public catalogue codes can differ from supplier SKUs. Permit an alias only when
// that exact enrichment record is linked to a currently verified supplier key.
for (const product of [...rawProducts, ...leaderProducts]) {
  if (getKeys(product).some((key) => verifiedKeys.has(key))) {
    const code = String(product.code || "").trim().toLowerCase();
    if (code) allowedCustomerCodes.add(code);
  }
}

const unsupportedRawProducts = [...rawProducts, ...leaderProducts].filter(
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

const findUnsupportedCodes = (codes) => Array.from(new Set(codes.filter((code) => !allowedCustomerCodes.has(code)))).sort();
const report = {
  auditedAt: new Date().toISOString(),
  verifiedSnapshotUpdatedAt: snapshot.updatedAt || null,
  supplierSnapshotStatus: snapshot.suppliers || null,
  counts: {
    rawEnrichmentProducts: rawProducts.length,
    leaderEnrichmentProducts: leaderProducts.length,
    verifiedSupplierProducts: (snapshot.items || []).length,
    verifiedQuoteProducts: quoteProducts.length,
    unsupportedRawEnrichmentProducts: unsupportedRawProducts.length,
    googleProducts: googleIds.length,
    sitemapProducts: sitemapCodes.length,
    staticProductPages: staticPageCodes.length,
  },
  unsupportedCustomerFacing: {
    googleProductCodes: findUnsupportedCodes(googleIds),
    sitemapProductCodes: findUnsupportedCodes(sitemapCodes),
    staticPageProductCodes: findUnsupportedCodes(staticPageCodes),
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
console.log(JSON.stringify(report.counts, null, 2));
console.log(`Unsupported customer-facing catalogue entries: ${unsupportedOutputCount}`);
console.log(`Audit report: ${path.relative(root, reportPath)}`);

if (unsupportedOutputCount > 0) {
  process.exitCode = 1;
}
