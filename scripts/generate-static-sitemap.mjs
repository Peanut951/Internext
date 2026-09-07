import fs from "node:fs";
import path from "node:path";
import { loadLeaderFeedProducts } from "./lib/leader-feed.mjs";
import { loadAlloysLiveCatalogItems } from "./lib/alloys-live-feed.mjs";
import { filterTangibleCatalogProducts } from "./lib/product-classification.mjs";
import { getIndexableRoutes, SITE_URL } from "./lib/seo-routes.mjs";
import {
  applyVerifiedProductIdentities,
  dedupeVerifiedProducts,
} from "./lib/verified-product-identity.mjs";

const publicDir = path.resolve("public");

const readJson = (filePath, fallback) => {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const staticProducts = readJson(path.join(publicDir, "data", "catalog-products.json"), []);
const leaderProducts = readJson(path.join(publicDir, "data", "leader-products.json"), []);
const previousLiveItems = readJson(
  path.join(publicDir, "data", "catalog-live-overrides.json"),
  { items: [] },
).items || [];
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

const isLeaderSnapshotItem = (product) =>
  product?.supplierSource === "leader" ||
  product?.leaderDealerBuyEx != null ||
  product?.leaderCategory != null;
const previousLeaderItems = previousLiveItems.filter(isLeaderSnapshotItem);
const previousAlloysItems = previousLiveItems.filter((product) => !isLeaderSnapshotItem(product));
const activeLeaderItems = leaderFeedProducts.length > 0
  ? leaderFeedProducts
  : previousLeaderItems.length > 0
    ? previousLeaderItems
    : leaderProducts;
const activeAlloysItems = alloysLiveItems.length > 0 ? alloysLiveItems : previousAlloysItems;
const verifiedProducts = dedupeVerifiedProducts([...activeAlloysItems, ...activeLeaderItems]);
const productCodes = Array.from(
  new Set(
    filterTangibleCatalogProducts(applyVerifiedProductIdentities(
      [
        ...staticProducts,
        ...leaderProducts,
        ...previousLiveItems,
      ],
      verifiedProducts,
    ))
      .map((product) => String(product.code || "").trim())
      .filter(Boolean),
  ),
).sort((a, b) => a.localeCompare(b));
const urls = [
  ...getIndexableRoutes().map((route) => ({
    loc: `${SITE_URL}${route.path === "/" ? "/" : route.path}`,
  })),
  ...productCodes.map((code) => ({
    loc: `${SITE_URL}/products/item/${encodeURIComponent(code)}`,
  })),
];

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((url) => `  <url><loc>${escapeXml(url.loc)}</loc></url>`),
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
