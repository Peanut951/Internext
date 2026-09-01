import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCompetitorPriceRecommendation,
  isEligibleCompetitorObservation,
} from "../shared/competitor-pricing.js";

const now = new Date("2026-09-01T02:00:00.000Z");

const observation = (overrides = {}) => ({
  id: "observation-1",
  sellerName: "Verified Seller",
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

test("selects the cheapest eligible seller and recommends exactly one dollar below", () => {
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
  assert.equal(result.recommendedPriceIncGst, 149);
  assert.equal(result.savingIncGst, 31);
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
  assert.equal(result.recommendedPriceIncGst, 149);
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
  assert.equal(result.recommendedPriceIncGst, 148);
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

