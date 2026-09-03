import { Buffer } from "node:buffer";
import { readEnv } from "../checkout/_shared.js";
import {
  normalizeDataForSeoProductInfo,
  type NormalizedProviderListing,
} from "../../shared/competitor-provider-normalization.js";

type CatalogProduct = Record<string, unknown> & {
  code?: string;
  supplierCode?: string;
  manufacturer?: string;
};

export type DataForSeoProductMatch = {
  provider: "dataforseo";
  productCode: string;
  providerProductId: string;
  matchMethod: "gtin" | "brand_mpn";
  productName: string;
  verifiedAt: string;
};

type KnownProductMatch = {
  productCode: string;
  providerProductId: string;
};

export type DataForSeoFetchOptions = {
  cursor?: string | null;
  products: CatalogProduct[];
  knownMatches?: KnownProductMatch[];
};

export type DataForSeoFetchResult = {
  provider: "dataforseo";
  listings: NormalizedProviderListing[];
  productMatches: DataForSeoProductMatch[];
  productsRead: number;
  requestsMade: number;
  nextCursor: string | null;
};

const API_ROOT = "https://api.dataforseo.com/v3/merchant/google";
const TAG_PREFIX = "internext:";

const readPositiveInteger = (name: string, fallback: number, maximum: number) => {
  const value = Math.floor(Number(readEnv(name)));
  return Number.isFinite(value) && value > 0 ? Math.min(value, maximum) : fallback;
};

const getConfig = () => {
  const login = readEnv("DATAFORSEO_LOGIN");
  const password = readEnv("DATAFORSEO_PASSWORD");
  if (!login || !password) throw new Error("DataForSEO API credentials are not configured.");

  const configuredLocations = readEnv("DATAFORSEO_LOCATIONS")
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);
  const locationName = readEnv("DATAFORSEO_LOCATION_NAME") || configuredLocations[0] || "Australia";

  return {
    authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`,
    locationName,
    languageCode: readEnv("DATAFORSEO_LANGUAGE_CODE") || "en",
    seDomain: readEnv("DATAFORSEO_SE_DOMAIN") || "google.com.au",
  };
};

const requestJson = async (
  path: string,
  authorization: string,
  body?: Record<string, unknown>[],
) => {
  const response = await fetch(`${API_ROOT}/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: authorization,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`DataForSEO returned ${response.status}: ${text.slice(0, 500)}`);
  }
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("DataForSEO returned invalid JSON.");
  }
  if (Number(payload.status_code) !== 20000) {
    throw new Error(`DataForSEO rejected the request: ${String(payload.status_message || "unknown error")}`);
  }
  const failedTask = getTasks(payload).find((task) => Number(task.status_code) >= 40000);
  if (failedTask) {
    throw new Error(`DataForSEO rejected a task: ${String(failedTask.status_message || "unknown task error")}`);
  }
  return payload;
};

const encodeTag = (stage: "search" | "info", productCode: string) =>
  `${TAG_PREFIX}${stage}:${Buffer.from(productCode, "utf8").toString("base64url")}`;

const decodeTag = (value: unknown) => {
  const match = String(value || "").match(/^internext:(search|info):([A-Za-z0-9_-]+)$/);
  if (!match) return null;
  try {
    return {
      stage: match[1] as "search" | "info",
      productCode: Buffer.from(match[2], "base64url").toString("utf8"),
    };
  } catch {
    return null;
  }
};

const getTasks = (payload: Record<string, unknown>) =>
  (Array.isArray(payload.tasks) ? payload.tasks : []) as Record<string, unknown>[];

const getReadyTasks = (payload: Record<string, unknown>) => {
  const ready: { id: string; tag: string }[] = [];
  for (const task of getTasks(payload)) {
    const results = Array.isArray(task.result) ? task.result : [];
    for (const result of results) {
      if (!result || typeof result !== "object") continue;
      const row = result as Record<string, unknown>;
      const id = String(row.id || "").trim();
      const tag = String(row.tag || "").trim();
      if (id && decodeTag(tag)) ready.push({ id, tag });
    }
  }
  return ready;
};

const getTaskTag = (payload: Record<string, unknown>) => {
  for (const task of getTasks(payload)) {
    const data = task.data && typeof task.data === "object"
      ? task.data as Record<string, unknown>
      : {};
    const tag = String(data.tag || task.tag || "").trim();
    if (decodeTag(tag)) return tag;
  }
  return "";
};

const collectObjects = (value: unknown, predicate: (row: Record<string, unknown>) => boolean) => {
  const found: Record<string, unknown>[] = [];
  const visit = (current: unknown) => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!current || typeof current !== "object") return;
    const row = current as Record<string, unknown>;
    if (predicate(row)) found.push(row);
    Object.values(row).forEach(visit);
  };
  visit(value);
  return found;
};

const normalizeIdentity = (value: unknown) =>
  String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const findSearchCandidate = (payload: Record<string, unknown>, product: CatalogProduct) => {
  const candidates = collectObjects(
    payload,
    (row) => Boolean(row.product_id) && Boolean(row.title || row.product_name),
  );
  const expectedMpn = normalizeIdentity(product.supplierCode || product.code);
  const expectedBrand = normalizeIdentity(product.manufacturer);
  return candidates.find((candidate) => {
    const title = normalizeIdentity(candidate.title || candidate.product_name);
    return expectedMpn && title.includes(expectedMpn) && (!expectedBrand || title.includes(expectedBrand));
  }) || candidates[0] || null;
};

const postTasks = async (
  path: string,
  tasks: Record<string, unknown>[],
  authorization: string,
) => {
  let requests = 0;
  for (let offset = 0; offset < tasks.length; offset += 100) {
    await requestJson(path, authorization, tasks.slice(offset, offset + 100));
    requests += 1;
  }
  return requests;
};

const mapWithConcurrency = async <T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
) => {
  const results = new Array<R>(values.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (index < values.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(values[currentIndex]);
    }
  });
  await Promise.all(workers);
  return results;
};

const parseCursor = (cursor: string | null | undefined) => {
  try {
    const parsed = JSON.parse(cursor || "{}") as { offset?: unknown; nextScanAt?: unknown };
    return {
      offset: Math.max(0, Math.floor(Number(parsed.offset) || 0)),
      nextScanAt: String(parsed.nextScanAt || ""),
    };
  } catch {
    return { offset: 0, nextScanAt: "" };
  }
};

const getGtin = (product: CatalogProduct) => {
  for (const value of [product.gtin, product.ean, product.upc, product.barcode]) {
    const digits = String(value || "").replace(/\D/g, "");
    if (/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits)) return digits;
  }
  return "";
};

const buildSearchKeyword = (product: CatalogProduct) => {
  const gtin = getGtin(product);
  if (gtin) return gtin;
  return [product.manufacturer, product.supplierCode || product.code]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 700);
};

export const fetchDataForSeoListings = async (
  options: DataForSeoFetchOptions,
): Promise<DataForSeoFetchResult> => {
  const config = getConfig();
  const catalogByCode = new Map(
    options.products
      .map((product) => [String(product.code || "").trim().toLowerCase(), product] as const)
      .filter(([code]) => Boolean(code)),
  );
  const maxReady = readPositiveInteger("DATAFORSEO_READY_TASK_LIMIT", 100, 500);
  const requests = { count: 0 };
  const listings: NormalizedProviderListing[] = [];
  const productMatches: DataForSeoProductMatch[] = [];
  const productInfoTasks: Record<string, unknown>[] = [];

  const [searchReadyPayload, infoReadyPayload] = await Promise.all([
    requestJson("products/tasks_ready", config.authorization),
    requestJson("product_info/tasks_ready", config.authorization),
  ]);
  requests.count += 2;

  const searchReady = getReadyTasks(searchReadyPayload).slice(0, maxReady);
  const searchResults = await mapWithConcurrency(searchReady, 8, async (ready) => {
    const payload = await requestJson(
      `products/task_get/advanced/${encodeURIComponent(ready.id)}`,
      config.authorization,
    );
    requests.count += 1;
    return payload;
  });
  for (const payload of searchResults) {
    const tag = decodeTag(getTaskTag(payload));
    const product = tag ? catalogByCode.get(tag.productCode.toLowerCase()) : null;
    if (!tag || tag.stage !== "search" || !product) continue;
    const candidate = findSearchCandidate(payload, product);
    const productId = String(candidate?.product_id || "").trim();
    if (!productId) continue;
    productInfoTasks.push({
      product_id: productId,
      location_name: config.locationName,
      language_code: config.languageCode,
      se_domain: config.seDomain,
      tag: encodeTag("info", String(product.code)),
    });
  }

  const infoReady = getReadyTasks(infoReadyPayload).slice(0, maxReady);
  const infoResults = await mapWithConcurrency(infoReady, 8, async (ready) => {
    const payload = await requestJson(
      `product_info/task_get/advanced/${encodeURIComponent(ready.id)}`,
      config.authorization,
    );
    requests.count += 1;
    return payload;
  });
  for (const payload of infoResults) {
    const tag = decodeTag(getTaskTag(payload));
    const product = tag ? catalogByCode.get(tag.productCode.toLowerCase()) : null;
    if (!tag || tag.stage !== "info" || !product) continue;
    const normalized = normalizeDataForSeoProductInfo(payload, product, {
      currency: "AUD",
      locationName: config.locationName,
    });
    if (!normalized?.matchVerified) continue;
    listings.push(...normalized.listings);
    productMatches.push({
      provider: "dataforseo",
      productCode: String(product.code),
      providerProductId: normalized.providerProductId,
      matchMethod: normalized.matchMethod,
      productName: normalized.productName,
      verifiedAt: normalized.observedAt,
    });
  }

  const cursor = parseCursor(options.cursor);
  const now = Date.now();
  const scanDue = !cursor.nextScanAt || Date.parse(cursor.nextScanAt) <= now;
  const batchSize = readPositiveInteger("COMPETITOR_SYNC_MAX_PRODUCTS", 100, 500);
  const batch = scanDue ? options.products.slice(cursor.offset, cursor.offset + batchSize) : [];
  const knownByCode = new Map(
    (options.knownMatches || []).map((match) => [match.productCode.toLowerCase(), match]),
  );
  const searchTasks: Record<string, unknown>[] = [];

  for (const product of batch) {
    const code = String(product.code || "").trim();
    if (!code) continue;
    const common = {
      location_name: config.locationName,
      language_code: config.languageCode,
      se_domain: config.seDomain,
    };
    const known = knownByCode.get(code.toLowerCase());
    if (known?.providerProductId) {
      productInfoTasks.push({
        ...common,
        product_id: known.providerProductId,
        tag: encodeTag("info", code),
      });
    } else {
      const keyword = buildSearchKeyword(product);
      if (!keyword) continue;
      searchTasks.push({
        ...common,
        keyword,
        depth: 40,
        tag: encodeTag("search", code),
      });
    }
  }

  requests.count += await postTasks("product_info/task_post", productInfoTasks, config.authorization);
  requests.count += await postTasks("products/task_post", searchTasks, config.authorization);

  const nextOffset = cursor.offset + batch.length;
  const scanCompleted = batch.length > 0 && nextOffset >= options.products.length;
  const rescanDays = readPositiveInteger("DATAFORSEO_FULL_RESCAN_DAYS", 7, 30);
  const nextCursor = scanCompleted
    ? JSON.stringify({
        offset: 0,
        nextScanAt: new Date(now + rescanDays * 24 * 60 * 60 * 1000).toISOString(),
      })
    : JSON.stringify({ offset: nextOffset, nextScanAt: cursor.nextScanAt || null });

  return {
    provider: "dataforseo",
    listings,
    productMatches,
    productsRead: batch.length,
    requestsMade: requests.count,
    nextCursor,
  };
};
