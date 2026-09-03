import { createHmac } from "node:crypto";
import { readEnv } from "../checkout/_shared.js";
import {
  normalizePrice2SpyPayload,
  normalizePrisyncListing,
  type NormalizedProviderListing,
} from "../../shared/competitor-provider-normalization.js";
import {
  fetchDataForSeoListings,
  type DataForSeoProductMatch,
} from "./_dataForSeoProvider.js";

export type CompetitorProviderName = "prisync" | "price2spy" | "dataforseo";

export type ProviderProductMatch = DataForSeoProductMatch;

export type ProviderFetchResult = {
  provider: CompetitorProviderName;
  listings: NormalizedProviderListing[];
  productMatches: ProviderProductMatch[];
  productsRead: number;
  requestsMade: number;
  nextCursor: string | null;
};

export type ProviderFetchOptions = {
  cursor?: string | null;
  products?: Record<string, unknown>[];
  knownMatches?: { productCode: string; providerProductId: string }[];
};

const toPositiveInteger = (value: string, fallback: number, maximum: number) => {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
};

const parseJsonResponse = async (response: Response, provider: string) => {
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${provider} returned ${response.status}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`${provider} returned invalid JSON.`);
  }
};

const getPrisyncConfig = () => {
  const apiKey = readEnv("PRISYNC_API_KEY");
  const apiToken = readEnv("PRISYNC_API_TOKEN");
  const baseUrl = (readEnv("PRISYNC_API_BASE_URL") || "https://prisync.com/api/v2").replace(/\/$/, "");
  if (!apiKey || !apiToken) {
    throw new Error("Prisync credentials are not configured.");
  }
  if (!isAllowedPrisyncUrl(baseUrl)) {
    throw new Error("PRISYNC_API_BASE_URL must use HTTPS on prisync.com.");
  }
  return { apiKey, apiToken, baseUrl };
};

const isAllowedPrisyncUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    return parsed.protocol === "https:" && (hostname === "prisync.com" || hostname.endsWith(".prisync.com"));
  } catch {
    return false;
  }
};

const resolvePrisyncPageUrl = (value: unknown, baseUrl: string) => {
  const candidate = String(value || "").trim();
  if (!candidate) return "";
  try {
    const resolved = new URL(candidate, `${baseUrl}/`).toString();
    return isAllowedPrisyncUrl(resolved) ? resolved : "";
  } catch {
    return "";
  }
};

const parsePrisyncCursor = (cursor: string | null | undefined, baseUrl: string) => {
  if (!cursor) return { url: `${baseUrl}/list/product`, offset: 0 };
  try {
    const parsed = JSON.parse(cursor) as { url?: unknown; offset?: unknown };
    const url = resolvePrisyncPageUrl(parsed.url, baseUrl);
    const offset = Math.max(0, Math.floor(Number(parsed.offset) || 0));
    return url ? { url, offset } : { url: `${baseUrl}/list/product`, offset: 0 };
  } catch {
    return { url: `${baseUrl}/list/product`, offset: 0 };
  }
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

export const fetchPrisyncListings = async (
  options: ProviderFetchOptions = {},
): Promise<ProviderFetchResult> => {
  const config = getPrisyncConfig();
  const maxProducts = toPositiveInteger(readEnv("COMPETITOR_SYNC_MAX_PRODUCTS"), 10, 100);
  const maxListingsPerProduct = toPositiveInteger(
    readEnv("COMPETITOR_SYNC_MAX_LISTINGS_PER_PRODUCT"),
    10,
    100,
  );
  const headers = {
    apikey: config.apiKey,
    apitoken: config.apiToken,
    Accept: "application/json",
  };
  const getJson = async (url: string) => {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
    return parseJsonResponse(response, "Prisync");
  };

  let requestsMade = 0;
  const cursor = parsePrisyncCursor(options.cursor, config.baseUrl);
  if (!isAllowedPrisyncUrl(cursor.url)) throw new Error("Prisync cursor URL is not allowed.");
  const page = await getJson(cursor.url);
  requestsMade += 1;
  const pageProducts = Array.isArray(page.results) ? page.results : [];
  const products = pageProducts.slice(cursor.offset, cursor.offset + maxProducts);
  const nextOffset = cursor.offset + products.length;
  const nextPageUrl = resolvePrisyncPageUrl(page.next, config.baseUrl);
  const nextCursor = nextOffset < pageProducts.length
    ? JSON.stringify({ url: cursor.url, offset: nextOffset })
    : nextPageUrl
      ? JSON.stringify({ url: nextPageUrl, offset: 0 })
      : null;

  const listingGroups = await mapWithConcurrency(products, 4, async (product) => {
    const productId = String(product.id || product.product_id || "").trim();
    if (!productId) return [];
    const details = await getJson(`${config.baseUrl}/get/product/id/${encodeURIComponent(productId)}`);
    requestsMade += 1;
    const urlIds = Array.isArray(details.urls) ? details.urls.slice(0, maxListingsPerProduct) : [];
    const normalized = await mapWithConcurrency(urlIds, 4, async (urlId) => {
      const listing = await getJson(`${config.baseUrl}/get/url/id/${encodeURIComponent(String(urlId))}`);
      requestsMade += 1;
      return normalizePrisyncListing({ ...product, ...details }, listing, { currency: "AUD" });
    });
    return normalized.filter((listing): listing is NormalizedProviderListing => Boolean(listing));
  });
  const listings = listingGroups.flat();

  return {
    provider: "prisync",
    listings,
    productMatches: [],
    productsRead: products.length,
    requestsMade,
    nextCursor,
  };
};

const getPrice2SpyConfig = () => {
  const clientId = readEnv("PRICE2SPY_CLIENT_ID");
  const clientSecret = readEnv("PRICE2SPY_CLIENT_SECRET");
  const baseUrl = (readEnv("PRICE2SPY_API_BASE_URL") || "https://api.price2spy.com/rest/v1").replace(/\/$/, "");
  if (!clientId || !clientSecret) {
    throw new Error("Price2Spy credentials are not configured.");
  }
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:" || parsed.hostname !== "api.price2spy.com") {
    throw new Error("PRICE2SPY_API_BASE_URL must use https://api.price2spy.com.");
  }
  return { clientId, clientSecret, baseUrl, host: `${parsed.hostname}:443` };
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const price2SpyRequest = async (payload: Record<string, unknown>) => {
  const config = getPrice2SpyConfig();
  const path = "/rest/v1/get-current-pricing-data";
  const body = JSON.stringify(payload);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const epoch = Math.floor(Date.now() / 1000).toString();
    const stringToSign = ["POST", config.host, "application/json", path, epoch, body].join("\n");
    const signature = createHmac("sha256", config.clientSecret)
      .update(stringToSign)
      .digest("base64");
    const response = await fetch(`${config.baseUrl}/get-current-pricing-data`, {
      method: "POST",
      headers: {
        Host: config.host,
        "X-P2S-Date": epoch,
        Authorization: `HmacSHA256 ${config.clientId}:${signature}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body,
      signal: AbortSignal.timeout(30_000),
    });
    if (response.status !== 429 && response.status < 500) {
      return parseJsonResponse(response, "Price2Spy");
    }
    if (attempt < 2) await wait(500 * 2 ** attempt);
  }

  throw new Error("Price2Spy remained unavailable after three attempts.");
};

export const fetchPrice2SpyListings = async (): Promise<ProviderFetchResult> => {
  const payload = await price2SpyRequest({ active: true });
  const listings = normalizePrice2SpyPayload(payload, { currency: "AUD" });
  const productIds = new Set(listings.map((listing) => listing.providerProductId).filter(Boolean));
  return {
    provider: "price2spy",
    listings,
    productMatches: [],
    productsRead: productIds.size,
    requestsMade: 1,
    nextCursor: null,
  };
};

export const getConfiguredCompetitorProvider = (): CompetitorProviderName => {
  const provider = readEnv("COMPETITOR_PRICE_PROVIDER").toLowerCase();
  if (provider === "prisync" || provider === "price2spy" || provider === "dataforseo") return provider;
  throw new Error("COMPETITOR_PRICE_PROVIDER must be dataforseo, prisync, or price2spy.");
};

export const fetchConfiguredProviderListings = async (options: ProviderFetchOptions = {}) => {
  const provider = getConfiguredCompetitorProvider();
  if (provider === "prisync") return fetchPrisyncListings(options);
  if (provider === "price2spy") return fetchPrice2SpyListings();
  return fetchDataForSeoListings({
    cursor: options.cursor,
    products: options.products || [],
    knownMatches: options.knownMatches,
  });
};
