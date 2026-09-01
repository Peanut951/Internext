export type CompetitorMatchMethod = "gtin" | "brand_mpn" | "manual_verified" | string;

export type CompetitorObservation = {
  id?: string;
  sellerId?: string;
  sellerName?: string;
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
      savingIncGst: number;
    };

export function normalizeProductIdentity(value: unknown): string;
export function isEligibleCompetitorObservation(
  observation: CompetitorObservation,
  now?: Date | string,
): { eligible: boolean; reason: string | null };
export function buildCompetitorPriceRecommendation(input: {
  standardPriceIncGst: number;
  minimumAllowedPriceIncGst: number;
  observations: CompetitorObservation[];
  undercutAmount?: number;
  now?: Date | string;
}): CompetitorRecommendation;

