import assert from "node:assert/strict";
import test from "node:test";
import {
  STANDARD_SHIPPING_RATE_EX_GST_AUD,
  STANDARD_SHIPPING_RATE_INC_GST_AUD,
  getStandardShippingService,
} from "../shared/shipping-policy.js";

test("standard shipping is $15 excluding GST and $16.50 including GST", () => {
  const service = getStandardShippingService();

  assert.equal(STANDARD_SHIPPING_RATE_EX_GST_AUD, 15);
  assert.equal(STANDARD_SHIPPING_RATE_INC_GST_AUD, 16.5);
  assert.equal(service.priceExGst, 15);
  assert.equal(service.priceExGstText, "$15.00");
  assert.equal(service.price, 16.5);
  assert.equal(service.priceText, "$16.50");
  assert.match(service.name, /\$15\.00 ex GST/i);
});
