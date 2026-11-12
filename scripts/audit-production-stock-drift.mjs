import fs from "node:fs";
import path from "node:path";

const DEFAULT_SITE_URL = "https://www.internext.com.au";
const PAGE_SIZE = 500;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;

const siteUrl = String(process.env.INTERNEXT_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
const reportPath = path.resolve("reports", "production-stock-drift-audit.json");

const sleep = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs));

const fetchJson = async (url) => {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || `Request returned ${response.status}.`);
      }
      return data;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt);
    }
  }
  throw lastError;
};

const fetchCatalog = async ({ live }) => {
  const scanId = Date.now();
  const getPageUrl = (page) => {
    const params = new URLSearchParams({
      view: "products",
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (live) params.set("stockRefresh", String(scanId));
    return `${siteUrl}/api/catalog/live?${params}`;
  };

  const firstPage = await fetchJson(getPageUrl(1));
  const pageCount = Number(firstPage.pageCount || 1);
  const expectedCount = Number(firstPage.count || 0);
  const products = [...(firstPage.items || [])];

  for (let page = 2; page <= pageCount; page += 1) {
    const data = await fetchJson(getPageUrl(page));
    if (Number(data.count || 0) !== expectedCount || Number(data.pageCount || 1) !== pageCount) {
      throw new Error(`${live ? "Live" : "snapshot"} catalogue changed during pagination.`);
    }
    products.push(...(data.items || []));
    console.log(`${live ? "Live" : "Snapshot"} catalogue: ${products.length}/${expectedCount}`);
  }

  return {
    updatedAt: firstPage.updatedAt || null,
    expectedCount,
    products,
  };
};

const fetchLiveProductsByCodes = async (products) => {
  const batchSize = 100;
  const liveProducts = [];
  let updatedAt = null;

  for (let start = 0; start < products.length; start += batchSize) {
    const batch = products.slice(start, start + batchSize);
    const params = new URLSearchParams({
      view: "cart",
      codes: batch.map((product) => product.code).join(","),
      stockRefresh: `${Date.now()}-${start}`,
    });
    const data = await fetchJson(`${siteUrl}/api/catalog/live?${params}`);
    updatedAt = data.updatedAt || updatedAt;
    liveProducts.push(...(data.items || []));
    console.log(`Live stock: ${Math.min(start + batchSize, products.length)}/${products.length}`);
  }

  return {
    updatedAt,
    expectedCount: products.length,
    products: liveProducts,
  };
};

const normalizeKey = (value) => String(value || "").trim().toLowerCase();
const getProductKeys = (product) =>
  [product?.code, product?.supplierCode, ...(product?.catalogAliases || [])]
    .map(normalizeKey)
    .filter(Boolean);

const buildProductMap = (products) => {
  const byKey = new Map();
  for (const product of products) {
    for (const key of getProductKeys(product)) {
      if (!byKey.has(key)) byKey.set(key, product);
    }
  }
  return byKey;
};

const getStock = (product) => {
  const warehouses = product?.stockByWarehouse || {};
  return {
    total: Number(product?.stockQuantity || 0),
    adl: Number(warehouses.adl || 0),
    bne: Number(warehouses.bne || 0),
    mel: Number(warehouses.mel || 0),
    syd: Number(warehouses.syd || 0),
    wa: Number(warehouses.wa || 0),
    internext: Number(warehouses.internext || 0),
  };
};

const stockChanged = (left, right) =>
  Object.keys(left).some((key) => left[key] !== right[key]);

const snapshot = await fetchCatalog({ live: false });
const live = await fetchLiveProductsByCodes(snapshot.products);
const liveByKey = buildProductMap(live.products);
const matchedLiveCodes = new Set();
const discrepancies = [];
const missingFromLive = [];

for (const product of snapshot.products) {
  const liveProduct = getProductKeys(product)
    .map((key) => liveByKey.get(key))
    .find(Boolean);
  if (!liveProduct) {
    missingFromLive.push({
      code: product.code,
      supplierCode: product.supplierCode,
      supplierSource: product.supplierSource,
      description: product.description || product.name,
    });
    continue;
  }

  matchedLiveCodes.add(normalizeKey(liveProduct.code));
  const snapshotStock = getStock(product);
  const liveStock = getStock(liveProduct);
  if (!stockChanged(snapshotStock, liveStock)) continue;

  discrepancies.push({
    code: liveProduct.code || product.code,
    supplierCode: liveProduct.supplierCode || product.supplierCode,
    supplierSource: liveProduct.supplierSource || product.supplierSource,
    description: liveProduct.description || liveProduct.name || product.description || product.name,
    snapshotStock,
    liveStock,
    totalDelta: liveStock.total - snapshotStock.total,
    snapshotStockRecordUpdated: product.stockRecordUpdated || null,
    liveStockRecordUpdated: liveProduct.stockRecordUpdated || null,
    adminAdjustment: Number(liveProduct.stockByWarehouse?.adminAdjustment || 0),
    adminAdjustments: liveProduct.stockByWarehouse?.adminAdjustments || {},
  });
}

const missingFromSnapshot = [];

const pricedSupplierProducts = snapshot.products.filter((product) =>
  product.quoteRequired !== true &&
  ["alloys", "leader", "4cabling"].includes(String(product.supplierSource || "").toLowerCase()),
);
const changedPricedSupplierProducts = discrepancies.filter((product) =>
  ["alloys", "leader", "4cabling"].includes(String(product.supplierSource || "").toLowerCase()),
);

const report = {
  auditedAt: new Date().toISOString(),
  siteUrl,
  snapshotUpdatedAt: snapshot.updatedAt,
  liveUpdatedAt: live.updatedAt,
  summary: {
    snapshotProducts: snapshot.products.length,
    liveProducts: live.products.length,
    pricedSupplierProducts: pricedSupplierProducts.length,
    stockDiscrepancies: discrepancies.length,
    pricedSupplierStockDiscrepancies: changedPricedSupplierProducts.length,
    missingFromLive: missingFromLive.length,
    missingFromSnapshot: missingFromSnapshot.length,
    increases: discrepancies.filter((item) => item.totalDelta > 0).length,
    decreases: discrepancies.filter((item) => item.totalDelta < 0).length,
    unchangedTotalsWithWarehouseChanges: discrepancies.filter((item) => item.totalDelta === 0).length,
  },
  discrepancies: discrepancies.sort((left, right) =>
    Math.abs(right.totalDelta) - Math.abs(left.totalDelta) || left.code.localeCompare(right.code),
  ),
  missingFromLive,
  missingFromSnapshot,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify(report.summary, null, 2));
console.log(`Report: ${path.relative(process.cwd(), reportPath)}`);
