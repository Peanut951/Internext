import fs from "node:fs";
import path from "node:path";
import { loadLeaderFeedProducts } from "./lib/leader-feed.mjs";
import { loadAlloysLiveCatalogItems } from "./lib/alloys-live-feed.mjs";
import { filterTangibleCatalogProducts } from "./lib/product-classification.mjs";

const SITE_URL = "https://www.internext.com.au";
const publicDir = path.resolve("public");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const staticProducts = readJson(path.join(publicDir, "data", "catalog-products.json"));
const leaderProducts = readJson(path.join(publicDir, "data", "leader-products.json"));
const previousLiveItems = readJson(path.join(publicDir, "data", "catalog-live-overrides.json")).items || [];
const verifiedQuoteProducts = readJson(path.join(publicDir, "data", "supplier-quote-products.json")).products || [];
let leaderFeedProducts = [];
let alloysLiveItems = [];

try {
  leaderFeedProducts = await loadLeaderFeedProducts();
} catch (error) {
  console.warn(`Leader feed unavailable for sitemap build: ${error.message}`);
}

try {
  alloysLiveItems = await loadAlloysLiveCatalogItems();
} catch (error) {
  console.warn(`Alloys feed unavailable for sitemap build: ${error.message}`);
}

const getProductKeys = (product) =>
  [product.code, product.supplierCode]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

const leaderStaticKeys = new Set(leaderProducts.flatMap(getProductKeys));
const currentLeaderKeys = new Set(
  (leaderFeedProducts.length > 0 ? leaderFeedProducts : leaderProducts).flatMap(getProductKeys),
);
const currentAlloysKeys = new Set(
  (alloysLiveItems.length > 0
    ? alloysLiveItems
    : previousLiveItems.filter((product) =>
        getProductKeys(product).every((key) => !leaderStaticKeys.has(key)),
      )
  ).flatMap(getProductKeys),
);
const verifiedQuoteKeys = new Set(verifiedQuoteProducts.flatMap(getProductKeys));

const productCodes = Array.from(
  new Set(
    filterTangibleCatalogProducts([...staticProducts, ...leaderProducts, ...leaderFeedProducts])
      .filter((product) =>
        getProductKeys(product).some(
          (key) =>
            currentAlloysKeys.has(key) ||
            currentLeaderKeys.has(key) ||
            verifiedQuoteKeys.has(key),
        ),
      )
      .map((product) => String(product.code || "").trim())
      .filter(Boolean),
  ),
).sort((a, b) => a.localeCompare(b));
const today = new Date().toISOString().slice(0, 10);

const categoryPaths = [
  "projectors",
  "digital-signage",
  "tvs-panels",
  "interactive-panels",
  "mounts-brackets",
  "consumer-cameras",
  "imaging-accessories",
  "ip-cameras",
  "nvrs-recorders",
  "surveillance-accessories",
  "printers",
  "multifunction",
  "scanners",
  "office-technology",
  "a4-printers",
  "a3-printers",
  "inkjet",
  "laser",
  "large-format",
  "3d-printers",
  "inkjet-consumables",
  "laser-consumables",
  "large-format-consumables",
  "ribbon-tape",
  "3d-filament",
  "other-consumables",
  "a4-scanners",
  "a3-scanners",
  "portable-scanners",
  "access-control",
  "intercom-systems",
  "ip-communications",
  "ups-power",
  "automation-lighting",
  "energy-management",
  "storage",
  "switches",
  "routers",
  "access-points",
  "networking-accessories",
  "headsets",
  "conference",
  "voip",
  "video-collab",
  "uc-accessories",
];

const staticPaths = [
  "about",
  "contact",
  "services",
  "support/faq",
  "support/shipping",
  "support/warranty",
  "support/returns",
  "support/payment-security",
  "support/consumer-guarantees",
  "privacy",
  "terms",
];

const urls = [
  { loc: `${SITE_URL}/`, changefreq: "weekly", priority: "1.0" },
  { loc: `${SITE_URL}/products`, changefreq: "daily", priority: "0.9" },
  ...staticPaths.map((path) => ({
    loc: `${SITE_URL}/${path}`,
    changefreq: "monthly",
    priority: "0.65",
  })),
  ...categoryPaths.map((path) => ({
    loc: `${SITE_URL}/products/${path}`,
    changefreq: "weekly",
    priority: "0.75",
  })),
  ...productCodes.map((code) => ({
    loc: `${SITE_URL}/products/item/${encodeURIComponent(code)}`,
    changefreq: "weekly",
    priority: "0.8",
  })),
];

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(
    (url) =>
      `  <url><loc>${escapeXml(url.loc)}</loc><lastmod>${today}</lastmod><changefreq>${url.changefreq}</changefreq><priority>${url.priority}</priority></url>`,
  ),
  "</urlset>",
  "",
].join("\n");

const robots = [
  "User-agent: *",
  "Allow: /",
  "Disallow: /api/",
  `Sitemap: ${SITE_URL}/sitemap.xml`,
  `Product-feed: ${SITE_URL}/google-products.xml`,
  "",
].join("\n");

fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(publicDir, "robots.txt"), robots);

console.log(`Generated ${urls.length} sitemap URLs.`);
