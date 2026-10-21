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
import {
  buildCompetitorPriceRecommendation,
  getCompetitorMinimumAllowedPrice,
  isAutomaticCompetitorPricingAllowed,
  type CompetitorObservation,
} from "../../shared/competitor-pricing.js";

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
  price?: number | null;
  resellerPrice?: number | null;
  originalPrice?: number | null;
  publicPriceFloor?: number | null;
  publicPriceFixed?: boolean;
  quoteRequired?: boolean;
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

type StoredObservation = {
  id: string;
  product_code: string;
  supplier_code?: string | null;
  landed_price_inc_gst: number;
  in_stock: boolean;
  price_includes_gst: boolean;
  shipping_verified: boolean;
  match_method: string;
  match_verified: boolean;
  observed_at: string;
  expires_at: string;
  competitor_product_url: string;
  seller?: { verified?: boolean; enabled?: boolean } | { verified?: boolean; enabled?: boolean }[] | null;
};

type OpenRecommendation = {
  id: string;
  product_code: string;
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
  recommendations: "competitor_price_recommendations",
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

const getPricingSettings = async (config: RestConfig) => {
  const rows = await restRequest(
    config,
    `${TABLES.settings}?select=undercut_amount_inc_gst,observation_max_age_hours&id=eq.true&limit=1`,
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  const maxAgeHours = Number(row?.observation_max_age_hours);
  const undercutAmountIncGst = Number(row?.undercut_amount_inc_gst);
  return {
    maxAgeHours: Number.isFinite(maxAgeHours) && maxAgeHours > 0 ? Math.min(maxAgeHours, 168) : 24,
    undercutAmountIncGst:
      Number.isFinite(undercutAmountIncGst) && undercutAmountIncGst > 0
        ? Math.round(undercutAmountIncGst * 100) / 100
        : 1,
  };
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
    `${TABLES.productControls}?select=product_code,mode&limit=10000`,
  );
  return Array.isArray(rows) ? rows : [];
};

const getActiveObservations = async (
  config: RestConfig,
  provider: string,
): Promise<StoredObservation[]> => {
  const now = new Date().toISOString();
  const rows = await restRequest(
    config,
    `${TABLES.observations}?select=id,product_code,supplier_code,landed_price_inc_gst,in_stock,price_includes_gst,shipping_verified,match_method,match_verified,observed_at,expires_at,competitor_product_url,seller:competitor_sellers(verified,enabled)&provider=eq.${encodeURIComponent(provider)}&expires_at=gt.${encodeURIComponent(now)}&order=observed_at.desc&limit=10000`,
  );
  return Array.isArray(rows) ? rows : [];
};

const getOpenRecommendations = async (config: RestConfig): Promise<OpenRecommendation[]> => {
  const rows = await restRequest(
    config,
    `${TABLES.recommendations}?select=id,product_code&status=in.(pending,approved)&limit=10000`,
  );
  return Array.isArray(rows) ? rows : [];
};

const toCompetitorObservation = (row: StoredObservation): CompetitorObservation => {
  const seller = Array.isArray(row.seller) ? row.seller[0] : row.seller;
  return {
    id: row.id,
    sellerVerified: seller?.verified === true,
    sellerEnabled: seller?.enabled === true,
    inStock: row.in_stock === true,
    priceIncludesGst: row.price_includes_gst === true,
    shippingVerified: row.shipping_verified === true,
    matchMethod: row.match_method,
    matchVerified: row.match_verified === true,
    landedPriceIncGst: Number(row.landed_price_inc_gst),
    observedAt: row.observed_at,
    expiresAt: row.expires_at,
    productUrl: row.competitor_product_url,
  };
};

const generateAutomaticRecommendations = async ({
  config,
  provider,
  products,
  controls,
  undercutAmountIncGst,
}: {
  config: RestConfig;
  provider: string;
  products: CatalogIdentityProduct[];
  controls: ProductControl[];
  undercutAmountIncGst: number;
}) => {
  const [storedObservations, openRecommendations] = await Promise.all([
    getActiveObservations(config, provider),
    getOpenRecommendations(config),
  ]);
  const productsByCode = new Map(
    products
      .map((product) => [String(product.code || "").trim().toLowerCase(), product] as const)
      .filter(([code]) => Boolean(code)),
  );
  const controlsByCode = new Map(
    controls.map((control) => [control.product_code.trim().toLowerCase(), control.mode]),
  );
  const openByCode = new Map(
    openRecommendations.map((recommendation) => [recommendation.product_code.trim().toLowerCase(), recommendation]),
  );
  const observationsByCode = new Map<string, StoredObservation[]>();
  for (const observation of storedObservations) {
    const code = String(observation.product_code || "").trim().toLowerCase();
    if (!code) continue;
    const current = observationsByCode.get(code) || [];
    current.push(observation);
    observationsByCode.set(code, current);
  }

  let generated = 0;
  let expired = 0;
  const now = new Date();
  for (const [code, rows] of observationsByCode) {
    const product = productsByCode.get(code);
    const productMode = controlsByCode.get(code) || "automatic";
    if (!product || !isAutomaticCompetitorPricingAllowed(product, productMode)) continue;

    const standardPrice = Number(product.originalPrice ?? product.price);
    const minimumAllowedPrice = getCompetitorMinimumAllowedPrice(product.resellerPrice);
    const decision = buildCompetitorPriceRecommendation({
      standardPriceIncGst: standardPrice,
      minimumAllowedPriceIncGst: minimumAllowedPrice ?? standardPrice,
      observations: rows.map(toCompetitorObservation),
      undercutAmount: undercutAmountIncGst,
      now,
    });
    const existing = openByCode.get(code);

    if (!decision.eligible) {
      if (existing) {
        await restRequest(config, `${TABLES.recommendations}?id=eq.${encodeURIComponent(existing.id)}`, {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            status: "expired",
            decision_note: `Automatic recommendation withdrawn: ${decision.reason}.`,
            decided_at: now.toISOString(),
            updated_at: now.toISOString(),
          }),
        });
        expired += 1;
      }
      continue;
    }

    const observation = decision.cheapestObservation;
    const values = {
      product_code: String(product.code || "").trim(),
      supplier_code: String(product.supplierCode || "").trim() || null,
      observation_id: observation.id,
      standard_price_inc_gst: decision.standardPriceIncGst,
      minimum_allowed_price_inc_gst: minimumAllowedPrice,
      competitor_price_inc_gst: decision.competitorPriceIncGst,
      recommended_price_inc_gst: decision.recommendedPriceIncGst,
      undercut_amount_inc_gst: undercutAmountIncGst,
      status: "approved",
      decision_note: "Automatically approved from an exact product match and an admin-verified seller.",
      decided_by: "system:competitor-pricing",
      decided_at: now.toISOString(),
      generated_at: now.toISOString(),
      expires_at: observation.expiresAt,
      updated_at: now.toISOString(),
    };
    if (existing) {
      await restRequest(config, `${TABLES.recommendations}?id=eq.${encodeURIComponent(existing.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(values),
      });
    } else {
      await restRequest(config, TABLES.recommendations, {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(values),
      });
    }
    generated += 1;
  }

  return { generated, expired };
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
    const [catalog, sellers, pricingSettings, cursor, controls, storedMatches] = await Promise.all([
      loadMergedCatalogProducts(),
      getApprovedSellers(config),
      getPricingSettings(config),
      getSyncCursor(config, provider),
      getProductControls(config),
      getStoredProductMatches(config, provider),
    ]);
    const excludedCodes = new Set(
      controls
        .filter((control) => control.mode === "excluded")
        .map((control) => control.product_code.trim().toLowerCase())
        .filter(Boolean),
    );
    const eligibleProducts = catalog.items.filter(
      (product) =>
        product.quoteRequired !== true &&
        product.publicPriceFixed !== true &&
        !excludedCodes.has(String(product.code || "").trim().toLowerCase()),
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
      maxAgeHours: pricingSettings.maxAgeHours,
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
    const recommendationResult = await generateAutomaticRecommendations({
      config,
      provider: providerResult.provider,
      products: catalog.items,
      controls,
      undercutAmountIncGst: pricingSettings.undercutAmountIncGst,
    });
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
      recommendationsGenerated: recommendationResult.generated,
      recommendationsExpired: recommendationResult.expired,
      diagnostics: providerResult.diagnostics,
    };
    const resultParts = [];
    if (result.diagnostics) {
      resultParts.push(`${result.productsRead} catalogue products submitted`);
      resultParts.push(`${result.diagnostics.tasksCollected} completed tasks collected`);
      resultParts.push(`${result.diagnostics.searchMatchesQueued} seller lookups queued`);
    }
    if (result.recommendationsGenerated) {
      resultParts.push(`${result.recommendationsGenerated} automatic price recommendations approved`);
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
