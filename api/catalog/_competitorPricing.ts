import { readEnv } from "../checkout/_shared.js";

export type CompetitorPricingMode = "disabled" | "observe" | "active";

type ActiveRecommendationRow = {
  id?: unknown;
  product_code?: unknown;
  supplier_code?: unknown;
  standard_price_inc_gst?: unknown;
  minimum_allowed_price_inc_gst?: unknown;
  competitor_price_inc_gst?: unknown;
  recommended_price_inc_gst?: unknown;
  undercut_amount_inc_gst?: unknown;
  expires_at?: unknown;
  observed_at?: unknown;
};

export type CompetitorAdjustableProduct = {
  code?: string | null;
  supplierCode?: string | null;
  price?: number | null;
  priceText?: string;
  publicPriceFloor?: number | null;
  resellerPrice?: number | null;
  resellerPriceText?: string;
  originalPrice?: number | null;
  originalPriceText?: string;
  competitorAdjusted?: boolean;
  competitorPriceObservedAt?: string;
};

type ActiveCompetitorAdjustment = {
  id: string;
  productCode: string;
  supplierCode: string;
  standardPriceIncGst: number;
  minimumAllowedPriceIncGst: number;
  competitorPriceIncGst: number;
  recommendedPriceIncGst: number;
  undercutAmountIncGst: number;
  expiresAt: string;
  observedAt: string;
};

const ACTIVE_RECOMMENDATIONS_VIEW = "active_competitor_price_recommendations";

const formatCustomerAud = (value: number) =>
  `${new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} Inc GST`;

const toPositiveMoney = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) / 100 : null;
};

const normalizeKey = (value: unknown) => String(value || "").trim().toLowerCase();

const toActiveAdjustment = (row: ActiveRecommendationRow): ActiveCompetitorAdjustment | null => {
  const productCode = String(row.product_code || "").trim();
  const standardPriceIncGst = toPositiveMoney(row.standard_price_inc_gst);
  const minimumAllowedPriceIncGst = toPositiveMoney(row.minimum_allowed_price_inc_gst);
  const competitorPriceIncGst = toPositiveMoney(row.competitor_price_inc_gst);
  const recommendedPriceIncGst = toPositiveMoney(row.recommended_price_inc_gst);
  const undercutAmountIncGst = toPositiveMoney(row.undercut_amount_inc_gst);
  const expiresAt = String(row.expires_at || "").trim();
  const observedAt = String(row.observed_at || "").trim();

  if (
    !productCode ||
    standardPriceIncGst === null ||
    minimumAllowedPriceIncGst === null ||
    competitorPriceIncGst === null ||
    recommendedPriceIncGst === null ||
    undercutAmountIncGst === null ||
    !expiresAt ||
    !observedAt
  ) {
    return null;
  }

  if (
    recommendedPriceIncGst >= standardPriceIncGst ||
    recommendedPriceIncGst < minimumAllowedPriceIncGst ||
    Math.abs(recommendedPriceIncGst - (competitorPriceIncGst - undercutAmountIncGst)) > 0.001
  ) {
    return null;
  }

  return {
    id: String(row.id || "").trim(),
    productCode,
    supplierCode: String(row.supplier_code || "").trim(),
    standardPriceIncGst,
    minimumAllowedPriceIncGst,
    competitorPriceIncGst,
    recommendedPriceIncGst,
    undercutAmountIncGst,
    expiresAt,
    observedAt,
  };
};

export const getCompetitorPricingMode = (): CompetitorPricingMode => {
  const mode = readEnv("COMPETITOR_PRICING_MODE").toLowerCase();
  return mode === "active" || mode === "observe" ? mode : "disabled";
};

const getSupabaseRestConfig = () => {
  const supabaseUrl = readEnv("SUPABASE_URL") || readEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY") || readEnv("SERVICE_ROLE_SECRET_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  return { supabaseUrl: supabaseUrl.replace(/\/$/, ""), serviceRoleKey };
};

export const fetchActiveCompetitorAdjustments = async () => {
  if (getCompetitorPricingMode() !== "active") {
    return [] as ActiveCompetitorAdjustment[];
  }

  const config = getSupabaseRestConfig();
  if (!config) {
    return [] as ActiveCompetitorAdjustment[];
  }

  try {
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/${ACTIVE_RECOMMENDATIONS_VIEW}?select=id,product_code,supplier_code,standard_price_inc_gst,minimum_allowed_price_inc_gst,competitor_price_inc_gst,recommended_price_inc_gst,undercut_amount_inc_gst,expires_at,observed_at`,
      {
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`,
          Accept: "application/json",
        },
      },
    );
    if (!response.ok) {
      return [] as ActiveCompetitorAdjustment[];
    }

    const rows = await response.json() as ActiveRecommendationRow[];
    return Array.isArray(rows)
      ? rows.map(toActiveAdjustment).filter((row): row is ActiveCompetitorAdjustment => Boolean(row))
      : [];
  } catch {
    // Repricing fails closed: supplier-derived prices remain unchanged.
    return [] as ActiveCompetitorAdjustment[];
  }
};

export const applyCompetitorPriceAdjustments = async <T extends CompetitorAdjustableProduct>(
  products: T[],
): Promise<T[]> => {
  if (getCompetitorPricingMode() !== "active") {
    return products;
  }

  const adjustments = await fetchActiveCompetitorAdjustments();
  if (adjustments.length === 0) {
    return products;
  }

  const adjustmentsByKey = new Map<string, ActiveCompetitorAdjustment>();
  for (const adjustment of adjustments) {
    for (const key of [adjustment.productCode, adjustment.supplierCode].map(normalizeKey).filter(Boolean)) {
      const current = adjustmentsByKey.get(key);
      if (!current || adjustment.recommendedPriceIncGst < current.recommendedPriceIncGst) {
        adjustmentsByKey.set(key, adjustment);
      }
    }
  }

  return products.map((product) => {
    const currentPrice = toPositiveMoney(product.price);
    if (currentPrice === null) return product;

    const adjustment = [product.code, product.supplierCode]
      .map(normalizeKey)
      .map((key) => adjustmentsByKey.get(key))
      .find(Boolean);
    if (!adjustment) return product;

    // A supplier or floor price change invalidates the stored recommendation.
    if (Math.abs(currentPrice - adjustment.standardPriceIncGst) > 0.001) return product;
    const publicPriceFloor = toPositiveMoney(product.publicPriceFloor);
    const enforcedMinimum = Math.max(
      adjustment.minimumAllowedPriceIncGst,
      publicPriceFloor || 0,
    );
    if (
      adjustment.recommendedPriceIncGst >= currentPrice ||
      adjustment.recommendedPriceIncGst < enforcedMinimum
    ) {
      return product;
    }

    return {
      ...product,
      originalPrice: currentPrice,
      originalPriceText: formatCustomerAud(currentPrice),
      price: adjustment.recommendedPriceIncGst,
      priceText: formatCustomerAud(adjustment.recommendedPriceIncGst),
      competitorAdjusted: true,
      competitorPriceObservedAt: adjustment.observedAt,
    };
  });
};
