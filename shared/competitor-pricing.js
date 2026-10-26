import { isEligibleAustralianRetailerDomain } from "./competitor-provider-normalization.js";

const EXACT_MATCH_METHODS = new Set(["gtin", "brand_mpn", "manual_verified"]);

export const DEFAULT_COMPETITOR_UNDERCUT_PERCENT = 5;

const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const isPositiveMoney = (value) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export const getCompetitorMinimumAllowedPrice = (resellerPriceExGst) => {
  const value = Number(resellerPriceExGst);
  if (!Number.isFinite(value) || value <= 0) return null;

  const resellerMarkupRate = 0.2;
  const minimumProfitRate = 0.05;
  const supplierCostExGst = value / (1 + resellerMarkupRate);
  return roundCurrency(supplierCostExGst * (1 + minimumProfitRate) * 1.1);
};

export const isProtectedCompetitorPricingProduct = (product) => {
  const manufacturer = normalizeProductIdentity(product?.manufacturer);
  const catalogueCode = String(product?.code || "").trim().toLowerCase();
  const supplierCode = String(product?.supplierCode || "").trim().toLowerCase();
  return manufacturer === "grandstream" ||
    manufacturer.startsWith("grandstreamnetworks") ||
    catalogueCode.startsWith("gr-") ||
    supplierCode.startsWith("gr-");
};

export const isAutomaticCompetitorPricingAllowed = (product, mode) =>
  product?.publicPriceFixed !== true &&
  !isProtectedCompetitorPricingProduct(product) &&
  (mode || "automatic") === "automatic";

const toTimestamp = (value) => {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const normalizeProductIdentity = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const isEligibleCompetitorObservation = (observation, now = new Date()) => {
  if (!observation || observation.sellerVerified !== true) {
    return { eligible: false, reason: "seller_not_verified" };
  }
  if (observation.sellerEnabled !== true) {
    return { eligible: false, reason: "seller_disabled" };
  }
  if (!isEligibleAustralianRetailerDomain(observation.sellerDomain)) {
    return { eligible: false, reason: "seller_not_eligible_australian_retailer" };
  }
  if (observation.inStock !== true) {
    return { eligible: false, reason: "competitor_not_in_stock" };
  }
  if (observation.priceIncludesGst !== true) {
    return { eligible: false, reason: "gst_not_verified" };
  }
  if (observation.shippingVerified !== true) {
    return { eligible: false, reason: "shipping_not_verified" };
  }
  if (!EXACT_MATCH_METHODS.has(String(observation.matchMethod || ""))) {
    return { eligible: false, reason: "product_match_not_exact" };
  }
  if (observation.matchVerified !== true) {
    return { eligible: false, reason: "product_match_not_verified" };
  }
  if (!isPositiveMoney(observation.landedPriceIncGst)) {
    return { eligible: false, reason: "invalid_landed_price" };
  }

  const nowTimestamp = now instanceof Date ? now.getTime() : toTimestamp(now);
  const observedTimestamp = toTimestamp(observation.observedAt);
  const expiresTimestamp = toTimestamp(observation.expiresAt);
  if (nowTimestamp === null || observedTimestamp === null || expiresTimestamp === null) {
    return { eligible: false, reason: "invalid_observation_time" };
  }
  if (observedTimestamp > nowTimestamp + 5 * 60 * 1000) {
    return { eligible: false, reason: "observation_from_future" };
  }
  if (expiresTimestamp <= nowTimestamp) {
    return { eligible: false, reason: "observation_expired" };
  }

  return { eligible: true, reason: null };
};

export const buildCompetitorPriceRecommendation = ({
  standardPriceIncGst,
  minimumAllowedPriceIncGst,
  observations,
  undercutPercent = DEFAULT_COMPETITOR_UNDERCUT_PERCENT,
  now = new Date(),
}) => {
  if (!isPositiveMoney(standardPriceIncGst)) {
    return { eligible: false, reason: "invalid_standard_price" };
  }
  if (!isPositiveMoney(minimumAllowedPriceIncGst)) {
    return { eligible: false, reason: "minimum_price_required" };
  }
  if (!isPositiveMoney(undercutPercent) || undercutPercent >= 100) {
    return { eligible: false, reason: "invalid_undercut_percent" };
  }

  const eligibleObservations = (Array.isArray(observations) ? observations : [])
    .filter((observation) => isEligibleCompetitorObservation(observation, now).eligible)
    .sort((left, right) => left.landedPriceIncGst - right.landedPriceIncGst);

  const cheapestObservation = eligibleObservations[0];
  if (!cheapestObservation) {
    return { eligible: false, reason: "no_verified_competitor_price" };
  }
  if (cheapestObservation.landedPriceIncGst >= standardPriceIncGst) {
    return { eligible: false, reason: "internext_already_cheapest" };
  }

  const recommendedPriceIncGst = roundCurrency(
    cheapestObservation.landedPriceIncGst * (1 - undercutPercent / 100),
  );
  const undercutAmountIncGst = roundCurrency(
    cheapestObservation.landedPriceIncGst - recommendedPriceIncGst,
  );
  if (!isPositiveMoney(recommendedPriceIncGst)) {
    return { eligible: false, reason: "recommended_price_invalid" };
  }
  if (recommendedPriceIncGst < minimumAllowedPriceIncGst) {
    return {
      eligible: false,
      reason: "minimum_price_would_be_breached",
      cheapestObservation,
      recommendedPriceIncGst,
    };
  }

  return {
    eligible: true,
    reason: null,
    cheapestObservation,
    standardPriceIncGst: roundCurrency(standardPriceIncGst),
    competitorPriceIncGst: roundCurrency(cheapestObservation.landedPriceIncGst),
    recommendedPriceIncGst,
    undercutPercent,
    undercutAmountIncGst,
    savingIncGst: roundCurrency(standardPriceIncGst - recommendedPriceIncGst),
  };
};

