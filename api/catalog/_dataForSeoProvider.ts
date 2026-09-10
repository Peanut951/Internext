import { Buffer } from "node:buffer";
import { readEnv } from "../checkout/_shared.js";
import {
  normalizeDataForSeoProductInfo,
  type NormalizedProviderListing,
} from "../../shared/competitor-provider-normalization.js";
import {
  buildDataForSeoSearchKeyword,
  classifyDataForSeoTaskPayload,
  collectDataForSeoTaskPayloads,
} from "../../shared/dataforseo-task-utils.js";

export { buildDataForSeoSearchKeyword } from "../../shared/dataforseo-task-utils.js";

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
  diagnostics: {
    tasksCollected: number;
    noResultTasks: number;
    failedTasks: number;
    searchMatchesQueued: number;
    unverifiedProductPages: number;
  };
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
    const payload = await requestJson(path, authorization, tasks.slice(offset, offset + 100));
    requests += 1;
    const taskStatus = classifyDataForSeoTaskPayload(payload);
    if (taskStatus.outcome !== "success") {
      throw new Error(`DataForSEO rejected a submitted task: ${taskStatus.statusMessage}`);
    }
  }
  return requests;
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
  const diagnostics = {
    tasksCollected: 0,
    noResultTasks: 0,
    failedTasks: 0,
    searchMatchesQueued: 0,
    unverifiedProductPages: 0,
  };

  const [searchReadyPayload, infoReadyPayload] = await Promise.all([
    requestJson("products/tasks_ready", config.authorization),
    requestJson("product_info/tasks_ready", config.authorization),
  ]);
  requests.count += 2;

  const searchReady = getReadyTasks(searchReadyPayload).slice(0, maxReady);
  const searchResults = await collectDataForSeoTaskPayloads(searchReady, async (ready) => {
    try {
      return await requestJson(
        `products/task_get/advanced/${encodeURIComponent(ready.id)}`,
        config.authorization,
      );
    } finally {
      requests.count += 1;
    }
  });
  for (const result of searchResults) {
    diagnostics.tasksCollected += 1;
    if (result.outcome === "no_results") diagnostics.noResultTasks += 1;
    if (result.outcome === "failed") diagnostics.failedTasks += 1;
    if (!result.payload) continue;
    const tag = decodeTag(result.ready.tag || getTaskTag(result.payload));
    const product = tag ? catalogByCode.get(tag.productCode.toLowerCase()) : null;
    if (!tag || tag.stage !== "search" || !product) continue;
    const candidate = findSearchCandidate(result.payload, product);
    const productId = String(candidate?.product_id || "").trim();
    if (!productId) continue;
    productInfoTasks.push({
      product_id: productId,
      location_name: config.locationName,
      language_code: config.languageCode,
      se_domain: config.seDomain,
      tag: encodeTag("info", String(product.code)),
    });
    diagnostics.searchMatchesQueued += 1;
  }

  const infoReady = getReadyTasks(infoReadyPayload).slice(0, maxReady);
  const infoResults = await collectDataForSeoTaskPayloads(infoReady, async (ready) => {
    try {
      return await requestJson(
        `product_info/task_get/advanced/${encodeURIComponent(ready.id)}`,
        config.authorization,
      );
    } finally {
      requests.count += 1;
    }
  });
  for (const result of infoResults) {
    diagnostics.tasksCollected += 1;
    if (result.outcome === "no_results") diagnostics.noResultTasks += 1;
    if (result.outcome === "failed") diagnostics.failedTasks += 1;
    if (!result.payload) continue;
    const tag = decodeTag(result.ready.tag || getTaskTag(result.payload));
    const product = tag ? catalogByCode.get(tag.productCode.toLowerCase()) : null;
    if (!tag || tag.stage !== "info" || !product) continue;
    const normalized = normalizeDataForSeoProductInfo(result.payload, product, {
      currency: "AUD",
      locationName: config.locationName,
    });
    if (!normalized) continue;
    listings.push(...normalized.listings);
    if (!normalized.matchVerified) {
      diagnostics.unverifiedProductPages += 1;
      continue;
    }
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
      const keyword = buildDataForSeoSearchKeyword(product);
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
    diagnostics,
  };
};
