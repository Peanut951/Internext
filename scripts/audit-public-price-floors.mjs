import fs from "node:fs";
import path from "node:path";
import {
  applyPublicPriceFloor,
  loadPublicPriceFloorMap,
} from "./lib/public-price-floors.mjs";

const root = process.cwd();
const floorPath = path.join(root, "public", "data", "catalog-public-price-floors.json");
const feedPath = path.join(root, "public", "google-products.xml");
const floorData = JSON.parse(fs.readFileSync(floorPath, "utf8"));
const rows = Array.isArray(floorData.prices) ? floorData.prices : [];
const floorByKey = loadPublicPriceFloorMap(root);

const normalize = (value) => String(value || "").trim().toLowerCase();
const decodeXml = (value) => String(value || "")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

const seenAlloysSkus = new Set();
const seenVendorCodes = new Set();
const dataErrors = [];

for (const [index, row] of rows.entries()) {
  const alloysSku = normalize(row.alloysSku);
  const vendorCode = normalize(row.vendorCode);
  const floor = Number(row.floorIncGst);

  if (!alloysSku || !vendorCode || !Number.isFinite(floor) || floor <= 0) {
    dataErrors.push(`Row ${index + 1} is missing a valid SKU, vendor code, or price.`);
  }
  if (seenAlloysSkus.has(alloysSku)) dataErrors.push(`Duplicate Alloys SKU: ${row.alloysSku}`);
  if (seenVendorCodes.has(vendorCode)) dataErrors.push(`Duplicate vendor code: ${row.vendorCode}`);
  seenAlloysSkus.add(alloysSku);
  seenVendorCodes.add(vendorCode);
}

const invariantInput = {
  code: rows[0]?.alloysSku,
  supplierCode: rows[0]?.vendorCode,
  price: 1,
  priceText: "$1.00 Inc GST",
  resellerPrice: 77.77,
  resellerPriceText: "$77.77 Ex GST",
  rrp: 2,
  rrpText: "$2.00",
};
const invariantResult = applyPublicPriceFloor(invariantInput, floorByKey);
if (
  invariantResult.resellerPrice !== invariantInput.resellerPrice ||
  invariantResult.resellerPriceText !== invariantInput.resellerPriceText
) {
  dataErrors.push("Applying a public price floor changed reseller pricing.");
}

const missingPriceInput = { ...invariantInput, price: null, priceText: "Contact for pricing" };
const missingPriceResult = applyPublicPriceFloor(missingPriceInput, floorByKey);
if (missingPriceResult.price !== null || missingPriceResult.priceText !== "Contact for pricing") {
  dataErrors.push("A public price floor replaced a missing supplier price.");
}

const feedXml = fs.readFileSync(feedPath, "utf8");
const feedItems = [...feedXml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
  const item = match[1];
  const get = (tag) => decodeXml(item.match(new RegExp(`<g:${tag}>([\\s\\S]*?)<\\/g:${tag}>`))?.[1]);
  return {
    id: normalize(get("id")),
    mpn: normalize(get("mpn")),
    price: Number.parseFloat(get("price")),
  };
});

const violations = [];
let advertisedMatches = 0;

for (const row of rows) {
  const keys = new Set([normalize(row.alloysSku), normalize(row.vendorCode)]);
  const product = feedItems.find((item) => keys.has(item.id) || keys.has(item.mpn));
  if (!product) continue;

  advertisedMatches += 1;
  const floor = Number(row.floorIncGst);
  if (!Number.isFinite(product.price) || product.price + 0.001 < floor) {
    violations.push(`${row.alloysSku}: feed ${product.price || "missing"}, floor ${floor}`);
  }
}

if (dataErrors.length || violations.length) {
  for (const error of dataErrors) console.error(`Price-floor data error: ${error}`);
  for (const violation of violations) console.error(`Price-floor violation: ${violation}`);
  process.exitCode = 1;
} else {
  console.log(
    `Public price-floor audit passed: ${rows.length} configured, ${advertisedMatches} currently advertised, 0 below floor, reseller invariant preserved.`,
  );
}
