import assert from "node:assert/strict";
import test from "node:test";

import { parseLeaderFeedCsv } from "../scripts/lib/leader-feed.mjs";

test("Leader products use the same 20 percent customer and reseller margins", () => {
  const csv = [
    "STOCK CODE,SHORT DESCRIPTION,DBP,MANUFACTURER SKU,MANUFACTURER,AA,AQ,AN,AV,AW,AT,IMAGE",
    "HXSI-KM590,Simplecom KM590,79,KM590,Simplecom,1,2,3,4,5,31,https://example.com/km590.jpg",
  ].join("\n");

  const [product] = parseLeaderFeedCsv(csv);

  assert.equal(product.price, 104.28);
  assert.equal(product.priceText, "$104.28 Inc GST");
  assert.equal(product.resellerPrice, 94.8);
  assert.equal(product.resellerPriceText, "$94.80 Ex GST");
  assert.equal(product.stockQuantity, 15);
});
