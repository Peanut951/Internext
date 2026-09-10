import { randomUUID } from "node:crypto";
import { readEnv } from "../checkout/_shared.js";
import { loadMergedCatalogProducts } from "./live.js";
import {
  fetchConfiguredProviderListings,
  getConfiguredCompetitorProvider,
} from "./_competitorProviders.js";
import {
  normalizeCompetitorDomain,
  resolveExactCatalogMatch,
  type NormalizedProviderListing,
} from "../../shared/competitor-provider-normalization.js";

type ApprovedSeller = {
  id: string;
  name: string;
  domain: string;
  verified: boolean;
  enabled: boolean;
};

type CatalogIdentityProduct = Record<string, unknown> & {
  code?: string;
  supplierCode?: string;
};

type CatalogMatch = {
  product: CatalogIdentityProduct;
  matchMethod: "gtin" | "brand_mpn" | "manual_verified";
  matchVerified: true;
};

type ProductControl = {
  product_code: string;
  mode: "monitor_only" | "automatic" | "excluded";
};

type StoredProductMatch = {
  product_code: string;
  provider_product_id: string;
};

type RestConfig = {
  supabaseUrl: string;
  serviceRoleKey: string;
};

const TABLES = {
  settings: "competitor_pricing_settings",
  sellers: "competitor_sellers",
  observations: "competitor_price_observations",
  candidates: "competitor_discovery_candidates",
  syncRuns: "competitor_provider_sync_runs",
  syncState: "competitor_provider_sync_state",
  productControls: "competitor_product_controls",
  productMatches: "competitor_product_matches",
};

const readBooleanEnv = (name: string) => readEnv(name).toLowerCase() === "true";

export const isCompetitorDiscoveryEnabled = () => readBooleanEnv("COMPETITOR_DISCOVERY_ENABLED");

const getRestConfig = (): RestConfig => {
  const supabaseUrl = readEnv("SUPABASE_URL") || readEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY") || readEnv("SERVICE_ROLE_SECRET_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service role is not configured for competitor discovery.");
  }
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ""), serviceRoleKey };
};

const restRequest = async (
  config: RestConfig,
  path: string,
  init: RequestInit = {},
) => {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Competitor storage returned ${response.status}: ${detail.slice(0, 500)}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

const upsertRows = async (
  config: RestConfig,
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
) => {
  if (rows.length === 0) return;
  await restRequest(config, `${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
};

const getApprovedSellers = async (config: RestConfig): Promise<ApprovedSeller[]> => {
  const rows = await restRequest(
    config,
    `${TABLES.sellers}?select=id,name,domain,verified,enabled&verified=eq.true&enabled=eq.true`,
  );
  return Array.isArray(rows) ? rows : [];
};

const getObservationMaxAgeHours = async (config: RestConfig) => {
  const rows = await restRequest(
    config,
    `${TABLES.settings}?select=observation_max_age_hours&id=eq.true&limit=1`,
  );
  const value = Number(Array.isArray(rows) ? rows[0]?.observation_max_age_hours : null);
  return Number.isFinite(value) && value > 0 ? Math.min(value, 168) : 24;
};

const findApprovedSeller = (domain: string, sellers: ApprovedSeller[]) => {
  const normalized = normalizeCompetitorDomain(domain);
  return sellers.find((seller) => {
    const approved = normalizeCompetitorDomain(seller.domain);
    return approved && (normalized === approved || normalized.endsWith(`.${approved}`));
  });
};

const isOwnDomain = (domain: string) => {
  const normalized = normalizeCompetitorDomain(domain);
  return normalized === "internext.com.au" || normalized.endsWith(".internext.com.au");
};

const addHours = (value: string, hours: number) => {
  const timestamp = Date.parse(value);
  const base = Number.isFinite(timestamp) ? timestamp : Date.now();
  return new Date(base + hours * 60 * 60 * 1000).toISOString();
};

const candidateRow = (
  listing: NormalizedProviderListing,
  reviewReason: string,
  match?: CatalogMatch | null,
) => ({
  provider: listing.provider,
  provider_product_id: listing.providerProductId || null,
  provider_listing_id: listing.providerListingId,
  product_code: match?.product?.code || listing.requestedProductCode || listing.providerProductCode || "unmatched",
  supplier_code: match?.product?.supplierCode || null,
  seller_name: listing.sellerName || listing.sellerDomain,
  seller_domain: listing.sellerDomain,
  competitor_product_url: listing.productUrl,
  observed_price_inc_gst: listing.itemPriceIncGst,
  observed_shipping_inc_gst: listing.shippingPriceIncGst,
  currency: listing.currency,
  in_stock: listing.inStock,
  match_method: match?.matchMethod || null,
  review_reason: reviewReason,
  last_seen_at: listing.observedAt,
  updated_at: new Date().toISOString(),
});

const processListings = ({
  listings,
  products,
  sellers,
  maxAgeHours,
}: {
  listings: NormalizedProviderListing[];
  products: CatalogIdentityProduct[];
  sellers: ApprovedSeller[];
  maxAgeHours: number;
}) => {
  const priceIncludesGst = readBooleanEnv("COMPETITOR_PROVIDER_PRICES_INCLUDE_GST");
  const providerPriceIncludesShipping = readBooleanEnv("COMPETITOR_PROVIDER_PRICES_INCLUDE_SHIPPING");
  const candidates: Record<string, unknown>[] = [];
  const observations: Record<string, unknown>[] = [];
  let ignoredOwnListings = 0;

  for (const listing of listings) {
    if (isOwnDomain(listing.sellerDomain)) {
      ignoredOwnListings += 1;
      continue;
    }
    if (listing.isNew === false) {
      candidates.push(candidateRow(listing, "condition_not_new"));
      continue;
    }

    const match = resolveExactCatalogMatch(listing, products);
    const seller = findApprovedSeller(listing.sellerDomain, sellers);
    if (!seller) {
      candidates.push(candidateRow(listing, "seller_not_approved", match));
      continue;
    }
    if (!match) {
      candidates.push(candidateRow(listing, "product_match_not_exact"));
      continue;
    }
    if (listing.currency !== "AUD") {
      candidates.push(candidateRow(listing, "currency_not_aud", match));
      continue;
    }
    if (!priceIncludesGst) {
      candidates.push(candidateRow(listing, "gst_configuration_not_verified", match));
      continue;
    }

    const explicitShipping = listing.shippingPriceIncGst > 0;
    const shippingVerified = providerPriceIncludesShipping || listing.shippingVerified === true || explicitShipping;
    if (!shippingVerified) {
      candidates.push(candidateRow(listing, "shipping_not_verified", match));
      continue;
    }

    const shippingPrice = providerPriceIncludesShipping ? 0 : listing.shippingPriceIncGst;
    observations.push({
      seller_id: seller.id,
      product_code: match.product.code,
      supplier_code: match.product.supplierCode || null,
      brand: match.product.manufacturer || listing.brand || "Unknown",
      mpn: match.product.supplierCode || listing.mpn || null,
      gtin: match.product.gtin || listing.gtin || null,
      competitor_product_url: listing.productUrl,
      item_price_inc_gst: listing.itemPriceIncGst,
      shipping_price_inc_gst: shippingPrice,
      price_includes_gst: true,
      shipping_verified: true,
      in_stock: listing.inStock,
      match_method: match.matchMethod,
      match_verified: true,
      match_verified_by: `${listing.provider}:exact-identity`,
      source: listing.provider,
      source_reference: listing.sourceReference,
      provider: listing.provider,
      provider_product_id: listing.providerProductId || null,
      provider_listing_id: listing.providerListingId,
      observed_at: listing.observedAt,
      expires_at: addHours(listing.observedAt, maxAgeHours),
    });
  }

  return { candidates, observations, ignoredOwnListings };
};

const createSyncRun = async (config: RestConfig, provider: string) => {
  const id = randomUUID();
  await restRequest(config, TABLES.syncRuns, {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ id, provider, status: "running", started_at: new Date().toISOString() }),
  });
  return id;
};

const finishSyncRun = async (
  config: RestConfig,
  id: string,
  values: Record<string, unknown>,
) => {
  await restRequest(config, `${TABLES.syncRuns}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ ...values, finished_at: new Date().toISOString() }),
  });
};

const getSyncCursor = async (config: RestConfig, provider: string) => {
  const rows = await restRequest(
    config,
    `${TABLES.syncState}?select=cursor&provider=eq.${encodeURIComponent(provider)}&limit=1`,
  );
  return String(Array.isArray(rows) ? rows[0]?.cursor || "" : "") || null;
};

const saveSyncCursor = async (config: RestConfig, provider: string, cursor: string | null) => {
  await upsertRows(
    config,
    TABLES.syncState,
    [{ provider, cursor, last_success_at: new Date().toISOString(), updated_at: new Date().toISOString() }],
    "provider",
  );
};

const getProductControls = async (config: RestConfig): Promise<ProductControl[]> => {
  const rows = await restRequest(
    config,
    `${TABLES.productControls}?select=product_code,mode&mode=eq.excluded&limit=10000`,
  );
  return Array.isArray(rows) ? rows : [];
};

const getStoredProductMatches = async (
  config: RestConfig,
  provider: string,
): Promise<StoredProductMatch[]> => {
  const rows: StoredProductMatch[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await restRequest(
      config,
      `${TABLES.productMatches}?select=product_code,provider_product_id&provider=eq.${encodeURIComponent(provider)}&verified=eq.true&order=product_code.asc&limit=1000&offset=${offset}`,
    );
    if (!Array.isArray(page)) break;
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
};

export const runCompetitorProviderSync = async () => {
  if (!isCompetitorDiscoveryEnabled()) {
    return { skipped: true, reason: "competitor_discovery_disabled" };
  }

  const config = getRestConfig();
  const provider = getConfiguredCompetitorProvider();
  const runId = await createSyncRun(config, provider);

  try {
    const [catalog, sellers, maxAgeHours, cursor, controls, storedMatches] = await Promise.all([
      loadMergedCatalogProducts(),
      getApprovedSellers(config),
      getObservationMaxAgeHours(config),
      getSyncCursor(config, provider),
      getProductControls(config),
      getStoredProductMatches(config, provider),
    ]);
    const excludedCodes = new Set(
      controls.map((control) => control.product_code.trim().toLowerCase()).filter(Boolean),
    );
    const eligibleProducts = catalog.items.filter(
      (product) => !excludedCodes.has(String(product.code || "").trim().toLowerCase()),
    );
    const providerResult = await fetchConfiguredProviderListings({
      cursor,
      products: eligibleProducts,
      knownMatches: storedMatches.map((match) => ({
        productCode: match.product_code,
        providerProductId: match.provider_product_id,
      })),
    });
    const processed = processListings({
      listings: providerResult.listings,
      products: catalog.items,
      sellers,
      maxAgeHours,
    });

    await upsertRows(
      config,
      TABLES.productMatches,
      providerResult.productMatches.map((match) => ({
        provider: match.provider,
        product_code: match.productCode,
        provider_product_id: match.providerProductId,
        match_method: match.matchMethod,
        provider_product_name: match.productName || null,
        verified: true,
        verified_at: match.verifiedAt,
        last_seen_at: match.verifiedAt,
        updated_at: new Date().toISOString(),
      })),
      "provider,product_code",
    );

    await upsertRows(
      config,
      TABLES.candidates,
      processed.candidates,
      "provider,provider_listing_id,product_code",
    );
    await upsertRows(
      config,
      TABLES.observations,
      processed.observations,
      "provider,provider_listing_id,observed_at",
    );
    await saveSyncCursor(config, providerResult.provider, providerResult.nextCursor);

    const result = {
      skipped: false,
      provider: providerResult.provider,
      productsRead: providerResult.productsRead,
      listingsRead: providerResult.listings.length,
      observationsStored: processed.observations.length,
      candidatesStored: processed.candidates.length,
      ignoredOwnListings: processed.ignoredOwnListings,
      requestsMade: providerResult.requestsMade,
      diagnostics: providerResult.diagnostics,
    };
    const resultParts = [];
    if (result.diagnostics) {
      resultParts.push(`${result.productsRead} catalogue products submitted`);
      resultParts.push(`${result.diagnostics.tasksCollected} completed tasks collected`);
      resultParts.push(`${result.diagnostics.searchMatchesQueued} seller lookups queued`);
    }
    if (result.diagnostics?.noResultTasks) {
      resultParts.push(`${result.diagnostics.noResultTasks} DataForSEO tasks returned no results`);
    }
    if (result.diagnostics?.failedTasks) {
      resultParts.push(`${result.diagnostics.failedTasks} task results could not be collected`);
    }
    if (result.diagnostics?.unverifiedProductPages) {
      resultParts.push(`${result.diagnostics.unverifiedProductPages} product pages require identity review`);
    }
    await finishSyncRun(config, runId, {
      status: "completed",
      products_read: result.productsRead,
      listings_read: result.listingsRead,
      observations_stored: result.observationsStored,
      candidates_stored: result.candidatesStored,
      ignored_own_listings: result.ignoredOwnListings,
      requests_made: result.requestsMade,
      error_message: resultParts.length > 0 ? `${resultParts.join("; ")}.` : null,
    });
    return result;
  } catch (error) {
    await finishSyncRun(config, runId, {
      status: "failed",
      error_message: error instanceof Error ? error.message.slice(0, 1000) : "Unknown sync error.",
    }).catch(() => undefined);
    throw error;
  }
};
