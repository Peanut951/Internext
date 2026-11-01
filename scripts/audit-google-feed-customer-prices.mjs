import fs from "node:fs";
import path from "node:path";
import { applyPublicPriceFloor, loadPublicPriceFloorMap } from "./lib/public-price-floors.mjs";

const DEFAULT_SITE_URL = "https://www.internext.com.au";
const PAGE_SIZE = 500;
const CONCURRENCY = 4;
const PRICE_TOLERANCE = 0.009;
const REQUEST_TIMEOUT_MS = 60_000;
const auditRunId = Date.now().toString(36);
const localMode = process.argv.includes("--local");

const siteUrl = String(process.argv.find((argument) => argument.startsWith("--site="))?.slice(7) || DEFAULT_SITE_URL)
  .trim()
  .replace(/\/$/, "");

const decodeXml = (value) =>
  String(value || "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const parsePrice = (value) => {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const roundMoney = (value) => Math.round(Number(value) * 100) / 100;
const pricesMatch = (left, right) =>
  Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= PRICE_TOLERANCE;

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: { Accept: "application/xml,text/xml,text/plain,*/*" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  return response.text();
};

const parseFeedItems = (xml) => {
  const items = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = match[1];
    const code = decodeXml(item.match(/<g:id>([\s\S]*?)<\/g:id>/i)?.[1]).trim();
    const price = parsePrice(item.match(/<g:price>([\s\S]*?)<\/g:price>/i)?.[1]);
    if (code) items.push({ code, price });
  }
  return items;
};

const fetchCatalogPage = async (page) => {
  const params = new URLSearchParams({
    view: "products",
    page: String(page),
    pageSize: String(PAGE_SIZE),
    auditPriceCheck: auditRunId,
  });
  const url = `${siteUrl}/api/catalog/live?${params}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (!Array.isArray(payload.items)) throw new Error(`${url} returned an invalid catalogue response.`);
  return payload;
};

const fetchCatalogProduct = async (code) => {
  const params = new URLSearchParams({ view: "product", code, auditPriceCheck: auditRunId });
  const url = `${siteUrl}/api/catalog/live?${params}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
  const payload = await response.json();
  return payload?.item || null;
};

const fetchInParallel = async (pages) => {
  const results = new Array(pages.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < pages.length) {
      const index = nextIndex++;
      results[index] = await fetchCatalogPage(pages[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pages.length) }, worker));
  return results;
};

const feedXml = localMode
  ? fs.readFileSync(path.resolve("public", "google-products.xml"), "utf8")
  : await fetchText(`${siteUrl}/google-products.xml`);
const feedItems = parseFeedItems(feedXml);
if (feedItems.length === 0) throw new Error("The Google product feed contained no products.");

const duplicateFeedCodes = feedItems
  .map(({ code }) => code.toLowerCase())
  .filter((code, index, codes) => codes.indexOf(code) !== index);
let catalogItems;
let catalogSnapshotCounts;
if (localMode) {
  const snapshot = JSON.parse(fs.readFileSync(path.resolve("public", "data", "catalog-live-overrides.json"), "utf8"));
  const publicPriceFloors = loadPublicPriceFloorMap();
  catalogItems = (Array.isArray(snapshot.items) ? snapshot.items : [])
    .map((product) => applyPublicPriceFloor(product, publicPriceFloors));
  catalogSnapshotCounts = [catalogItems.length];
} else {
  const firstCatalogPage = await fetchCatalogPage(1);
  const pageCount = Number(firstCatalogPage.pageCount);
  if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error("The catalogue returned an invalid page count.");
  const remainingPages = pageCount > 1
    ? await fetchInParallel(Array.from({ length: pageCount - 1 }, (_, index) => index + 2))
    : [];
  const catalogPages = [firstCatalogPage, ...remainingPages];
  if (catalogPages.some((page, index) => Number(page.page) !== index + 1)) {
    throw new Error("The public catalogue returned pages out of sequence.");
  }
  catalogItems = catalogPages.flatMap((page) => page.items);
  catalogSnapshotCounts = Array.from(new Set(catalogPages.map((page) => Number(page.count))));
}
const catalogByKey = new Map();
for (const product of catalogItems) {
  for (const key of [product?.code, product?.supplierCode]) {
    const normalized = String(key || "").trim().toLowerCase();
    if (normalized && !catalogByKey.has(normalized)) catalogByKey.set(normalized, product);
  }
}

const missingAfterPagination = feedItems
  .filter(({ code }) => !catalogByKey.has(code.toLowerCase()))
  .map(({ code }) => code);
if (!localMode && missingAfterPagination.length > 0) {
  const fallbackItems = new Array(missingAfterPagination.length);
  let nextFallbackIndex = 0;
  const fallbackWorker = async () => {
    while (nextFallbackIndex < missingAfterPagination.length) {
      const index = nextFallbackIndex++;
      fallbackItems[index] = await fetchCatalogProduct(missingAfterPagination[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, missingAfterPagination.length) }, fallbackWorker));
  for (const product of fallbackItems.filter(Boolean)) {
    for (const key of [product?.code, product?.supplierCode]) {
      const normalized = String(key || "").trim().toLowerCase();
      if (normalized) catalogByKey.set(normalized, product);
    }
  }
}

const mismatches = [];
const missingProducts = [];
const invalidFeedPrices = [];
const leakedResellerPrices = [];
const suspectedCostPrices = [];

for (const feedItem of feedItems) {
  const product = catalogByKey.get(feedItem.code.toLowerCase());
  if (!product) {
    missingProducts.push(feedItem.code);
    continue;
  }

  const customerPrice = parsePrice(product.price);
  const resellerPrice = parsePrice(product.resellerPrice);
  if (feedItem.price === null || customerPrice === null) {
    invalidFeedPrices.push({ code: feedItem.code, feedPrice: feedItem.price, customerPrice });
    continue;
  }

  if (!pricesMatch(feedItem.price, customerPrice)) {
    const details = {
      code: feedItem.code,
      feedPrice: roundMoney(feedItem.price),
      customerPrice: roundMoney(customerPrice),
      resellerPrice: resellerPrice === null ? null : roundMoney(resellerPrice),
    };
    mismatches.push(details);
    if (resellerPrice !== null && pricesMatch(feedItem.price, resellerPrice)) leakedResellerPrices.push(details);
    if (resellerPrice !== null && pricesMatch(feedItem.price, roundMoney(resellerPrice / 1.2))) {
      suspectedCostPrices.push(details);
    }
  }
}

const summary = {
  siteUrl,
  feedProducts: feedItems.length,
  catalogProductsReturned: catalogItems.length,
  catalogSnapshotCounts,
  matchingCustomerPrices: feedItems.length - mismatches.length - missingProducts.length - invalidFeedPrices.length,
  mismatchedPrices: mismatches.length,
  resellerPricesExposed: leakedResellerPrices.length,
  suspectedCostPricesExposed: suspectedCostPrices.length,
  missingCatalogProducts: missingProducts.length,
  invalidFeedPrices: invalidFeedPrices.length,
  duplicateFeedCodes: new Set(duplicateFeedCodes).size,
};

console.log(JSON.stringify({
  summary,
  mismatchExamples: mismatches.slice(0, 25),
  resellerPriceExamples: leakedResellerPrices.slice(0, 25),
  suspectedCostPriceExamples: suspectedCostPrices.slice(0, 25),
  missingProductExamples: missingProducts.slice(0, 25),
  invalidPriceExamples: invalidFeedPrices.slice(0, 25),
}, null, 2));

if (
  mismatches.length > 0 ||
  missingProducts.length > 0 ||
  invalidFeedPrices.length > 0 ||
  duplicateFeedCodes.length > 0
) {
  process.exitCode = 1;
}
