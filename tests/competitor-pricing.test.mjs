import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCompetitorPriceRecommendation,
  getCompetitorMinimumAllowedPrice,
  isAutomaticCompetitorPricingAllowed,
  isEligibleCompetitorObservation,
  isProtectedCompetitorPricingProduct,
} from "../shared/competitor-pricing.js";

const now = new Date("2026-09-01T02:00:00.000Z");

const observation = (overrides = {}) => ({
  id: "observation-1",
  sellerName: "Verified Seller",
  sellerDomain: "verified-seller.com.au",
  sellerVerified: true,
  sellerEnabled: true,
  inStock: true,
  priceIncludesGst: true,
  shippingVerified: true,
  matchMethod: "brand_mpn",
  matchVerified: true,
  landedPriceIncGst: 150,
  observedAt: "2026-09-01T01:00:00.000Z",
  expiresAt: "2026-09-02T01:00:00.000Z",
  ...overrides,
});

test("selects the cheapest eligible seller and recommends five percent below", () => {
  const result = buildCompetitorPriceRecommendation({
    standardPriceIncGst: 180,
    minimumAllowedPriceIncGst: 120,
    observations: [
      observation({ id: "higher", landedPriceIncGst: 160 }),
      observation({ id: "lowest", landedPriceIncGst: 150 }),
    ],
    now,
  });

  assert.equal(result.eligible, true);
  assert.equal(result.cheapestObservation.id, "lowest");
  assert.equal(result.competitorPriceIncGst, 150);
  assert.equal(result.recommendedPriceIncGst, 142.5);
  assert.equal(result.undercutPercent, 5);
  assert.equal(result.undercutAmountIncGst, 7.5);
  assert.equal(result.savingIncGst, 37.5);
});

test("rejects an unverified seller even when it has the cheapest price", () => {
  const result = buildCompetitorPriceRecommendation({
    standardPriceIncGst: 180,
    minimumAllowedPriceIncGst: 120,
    observations: [
      observation({ sellerVerified: false, landedPriceIncGst: 100 }),
      observation({ id: "verified", landedPriceIncGst: 150 }),
    ],
    now,
  });

  assert.equal(result.eligible, true);
  assert.equal(result.cheapestObservation.id, "verified");
  assert.equal(result.recommendedPriceIncGst, 142.5);
});

test("rejects stale, out-of-stock, unknown-shipping, and fuzzy matches", () => {
  const invalidObservations = [
    observation({ expiresAt: "2026-09-01T01:59:59.000Z" }),
    observation({ inStock: false }),
    observation({ shippingVerified: false }),
    observation({ matchMethod: "title" }),
  ];

  for (const candidate of invalidObservations) {
    assert.equal(isEligibleCompetitorObservation(candidate, now).eligible, false);
  }

  const result = buildCompetitorPriceRecommendation({
    standardPriceIncGst: 180,
    minimumAllowedPriceIncGst: 120,
    observations: invalidObservations,
    now,
  });
  assert.deepEqual(result, { eligible: false, reason: "no_verified_competitor_price" });
});

test("refuses to reduce below the explicit minimum allowed price", () => {
  const result = buildCompetitorPriceRecommendation({
    standardPriceIncGst: 180,
    minimumAllowedPriceIncGst: 150,
    observations: [observation({ landedPriceIncGst: 149 })],
    now,
  });

  assert.equal(result.eligible, false);
  assert.equal(result.reason, "minimum_price_would_be_breached");
  assert.equal(result.recommendedPriceIncGst, 141.55);
});

test("supports an explicit percentage while rejecting invalid percentages", () => {
  const result = buildCompetitorPriceRecommendation({
    standardPriceIncGst: 200,
    minimumAllowedPriceIncGst: 100,
    observations: [observation({ landedPriceIncGst: 160 })],
    undercutPercent: 10,
    now,
  });

  assert.equal(result.eligible, true);
  assert.equal(result.recommendedPriceIncGst, 144);
  assert.equal(result.undercutAmountIncGst, 16);

  assert.deepEqual(
    buildCompetitorPriceRecommendation({
      standardPriceIncGst: 200,
      minimumAllowedPriceIncGst: 100,
      observations: [observation()],
      undercutPercent: 100,
      now,
    }),
    { eligible: false, reason: "invalid_undercut_percent" },
  );
});

test("does not change the price when Internext is already cheapest", () => {
  const result = buildCompetitorPriceRecommendation({
    standardPriceIncGst: 140,
    minimumAllowedPriceIncGst: 120,
    observations: [observation({ landedPriceIncGst: 150 })],
    now,
  });

  assert.deepEqual(result, { eligible: false, reason: "internext_already_cheapest" });
});

test("derives a minimum advertised price with five percent profit above supplier cost", () => {
  assert.equal(getCompetitorMinimumAllowedPrice(100), 96.25);
  assert.equal(getCompetitorMinimumAllowedPrice(123.45), 118.82);
  assert.equal(getCompetitorMinimumAllowedPrice(null), null);
});

test("defaults ordinary products to automatic but never adjusts fixed, excluded, or Grandstream products", () => {
  assert.equal(isAutomaticCompetitorPricingAllowed({}, undefined), true);
  assert.equal(isAutomaticCompetitorPricingAllowed({}, "monitor_only"), false);
  assert.equal(isAutomaticCompetitorPricingAllowed({}, "excluded"), false);
  assert.equal(isAutomaticCompetitorPricingAllowed({ publicPriceFixed: true }, "automatic"), false);
  assert.equal(isAutomaticCompetitorPricingAllowed({ manufacturer: "Grandstream" }, "automatic"), false);
  assert.equal(isProtectedCompetitorPricingProduct({ manufacturer: "Grandstream Networks" }), true);
  assert.equal(isProtectedCompetitorPricingProduct({ code: "GR-GRP2613W" }), true);
  assert.equal(isProtectedCompetitorPricingProduct({ manufacturer: "Canon" }), false);
});

test("rejects marketplaces and non-Australian sellers even if marked verified", () => {
  assert.equal(isEligibleCompetitorObservation(observation({ sellerDomain: "amazon.com.au" }), now).eligible, false);
  assert.equal(isEligibleCompetitorObservation(observation({ sellerDomain: "retailer.example.com" }), now).eligible, false);
  assert.equal(isEligibleCompetitorObservation(observation({ sellerDomain: "retailer.com.au" }), now).eligible, true);
});

