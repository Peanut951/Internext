export type NormalizedProviderListing = {
  provider: "prisync" | "price2spy" | "dataforseo";
  providerProductId: string;
  providerListingId: string;
  providerProductCode: string;
  gtin: string;
  mpn: string;
  brand: string;
  productName: string;
  sellerName: string;
  sellerDomain: string;
  productUrl: string;
  itemPriceIncGst: number;
  shippingPriceIncGst: number;
  currency: string;
  inStock: boolean;
  condition?: string;
  isNew?: boolean;
  shippingVerified?: boolean;
  observedAt: string;
  sourceReference: string;
};

export function normalizeCompetitorDomain(value: unknown): string;
export function isDomainApproved(domain: unknown, approvedDomains: unknown[]): boolean;
export function normalizePrisyncListing(
  product: Record<string, unknown>,
  listing: Record<string, unknown>,
  options?: { now?: string; currency?: string },
): NormalizedProviderListing | null;
export function normalizePrice2SpyPayload(
  payload: Record<string, unknown>,
  options?: { now?: string; currency?: string },
): NormalizedProviderListing[];
export function normalizeDataForSeoProductInfo(
  payload: Record<string, unknown>,
  product: Record<string, unknown>,
  options?: { now?: string; currency?: string; locationName?: string },
): {
  providerProductId: string;
  productName: string;
  observedAt: string;
  matchMethod: "gtin" | "brand_mpn";
  matchVerified: true;
  listings: NormalizedProviderListing[];
} | null;
export function resolveExactCatalogMatch<T extends object>(
  listing: NormalizedProviderListing,
  products: T[],
): { product: T; matchMethod: "gtin" | "brand_mpn" | "manual_verified"; matchVerified: true } | null;
