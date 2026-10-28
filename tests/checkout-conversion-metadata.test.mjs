import assert from "node:assert/strict";
import test from "node:test";
import { buildStripeCheckoutParams } from "../api/checkout/_shared.ts";

const basePayload = {
  origin: "https://www.internext.com.au",
  orderNumber: "INT-TEST-1",
  customer: {
    firstName: "Test",
    lastName: "Customer",
    email: "test@example.com",
  },
  items: [
    {
      code: "TEST-1",
      description: "Test product",
      manufacturer: "Internext",
      qty: 1,
      price: 132,
      priceText: "$132.00 Inc GST",
    },
  ],
};

test("stores verified gross profit in Stripe session and payment metadata", () => {
  const params = buildStripeCheckoutParams({
    ...basePayload,
    conversion: {
      value: 20,
      complete: true,
      basis: "gross_profit_ex_gst_before_freight_and_fees",
    },
  });

  assert.equal(params.get("metadata[google_ads_conversion_value]"), "20");
  assert.equal(params.get("metadata[google_ads_conversion_status]"), "complete");
  assert.equal(
    params.get("payment_intent_data[metadata][google_ads_conversion_value]"),
    "20",
  );
});

test("marks an incomplete calculation unavailable without blocking Stripe checkout", () => {
  const params = buildStripeCheckoutParams({
    ...basePayload,
    conversion: {
      value: 0,
      complete: false,
      basis: "gross_profit_ex_gst_before_freight_and_fees",
    },
  });

  assert.equal(params.get("mode"), "payment");
  assert.equal(params.get("metadata[google_ads_conversion_status]"), "unavailable");
});
