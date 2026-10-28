import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { applyLeaderPricing } from "../scripts/lib/leader-feed.mjs";
import { buildOptimizedProductTitle } from "../shared/product-title-policy.js";

const products = JSON.parse(
  fs.readFileSync(path.resolve("public", "data", "local-stock-products.json"), "utf8"),
);

test("T54W remains a priced, in-stock catalogue exception with local images", () => {
  const product = products.find((item) => item.code === "IPY-T54W");
  assert.ok(product);
  assert.equal(product.supplierCode, "SIP-T54W");
  assert.equal(product.stockQuantity, 1);
  assert.equal(product.stockByWarehouse.internext, 1);
  assert.equal(product.gtin, "6938818303171");
  assert.equal(buildOptimizedProductTitle(product), "Yealink SIP-T54W - Prime Business Phone");

  const priced = applyLeaderPricing(product);
  assert.equal(priced.price, 345.84);
  assert.equal(priced.priceText, "$345.84 Inc GST");
  assert.equal(priced.resellerPrice, 314.4);
  assert.equal(priced.resellerPriceText, "$314.40 Ex GST");

  assert.equal(product.imageUrls.length, 4);
  for (const imageUrl of product.imageUrls) {
    assert.ok(fs.existsSync(path.resolve("public", imageUrl.replace(/^\//, ""))), imageUrl);
  }
});
