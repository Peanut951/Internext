import assert from "node:assert/strict";
import test from "node:test";
import {
  STANDARD_SHIPPING_RATE_INC_GST_AUD,
  getStandardShippingService,
} from "../shared/shipping-policy.js";

test("standard shipping is a $15 GST-inclusive flat rate", () => {
  const service = getStandardShippingService();

  assert.equal(STANDARD_SHIPPING_RATE_INC_GST_AUD, 15);
  assert.equal(service.price, 15);
  assert.equal(service.priceText, "$15.00");
  assert.match(service.name, /inc GST/i);
});
