export type CompetitorMatchMethod = "gtin" | "brand_mpn" | "manual_verified" | string;

export type CompetitorObservation = {
  id?: string;
  sellerId?: string;
  sellerName?: string;
  sellerDomain: string;
  sellerVerified: boolean;
  sellerEnabled: boolean;
  inStock: boolean;
  priceIncludesGst: boolean;
  shippingVerified: boolean;
  matchMethod: CompetitorMatchMethod;
  matchVerified: boolean;
  landedPriceIncGst: number;
  observedAt: string;
  expiresAt: string;
  productUrl?: string;
};

export type CompetitorRecommendation =
  | { eligible: false; reason: string; cheapestObservation?: CompetitorObservation; recommendedPriceIncGst?: number }
  | {
      eligible: true;
      reason: null;
      cheapestObservation: CompetitorObservation;
      standardPriceIncGst: number;
      competitorPriceIncGst: number;
      recommendedPriceIncGst: number;
      undercutPercent: number;
      undercutAmountIncGst: number;
      savingIncGst: number;
    };

export const DEFAULT_COMPETITOR_UNDERCUT_PERCENT: number;
export function normalizeProductIdentity(value: unknown): string;
export function getCompetitorMinimumAllowedPrice(resellerPriceExGst: unknown): number | null;
export function isProtectedCompetitorPricingProduct(
  product: { manufacturer?: unknown; code?: unknown; supplierCode?: unknown } | null | undefined,
): boolean;
export function isAutomaticCompetitorPricingAllowed(
  product: { publicPriceFixed?: boolean; manufacturer?: unknown; code?: unknown; supplierCode?: unknown } | null | undefined,
  mode?: "monitor_only" | "automatic" | "excluded",
): boolean;
export function isEligibleCompetitorObservation(
  observation: CompetitorObservation,
  now?: Date | string,
): { eligible: boolean; reason: string | null };
export function buildCompetitorPriceRecommendation(input: {
  standardPriceIncGst: number;
  minimumAllowedPriceIncGst: number;
  observations: CompetitorObservation[];
  undercutPercent?: number;
  now?: Date | string;
}): CompetitorRecommendation;

