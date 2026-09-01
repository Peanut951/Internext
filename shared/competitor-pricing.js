const EXACT_MATCH_METHODS = new Set(["gtin", "brand_mpn", "manual_verified"]);

const roundCurrency = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const isPositiveMoney = (value) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

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
  undercutAmount = 1,
  now = new Date(),
}) => {
  if (!isPositiveMoney(standardPriceIncGst)) {
    return { eligible: false, reason: "invalid_standard_price" };
  }
  if (!isPositiveMoney(minimumAllowedPriceIncGst)) {
    return { eligible: false, reason: "minimum_price_required" };
  }
  if (!isPositiveMoney(undercutAmount)) {
    return { eligible: false, reason: "invalid_undercut_amount" };
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
    cheapestObservation.landedPriceIncGst - undercutAmount,
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
    savingIncGst: roundCurrency(standardPriceIncGst - recommendedPriceIncGst),
  };
};

