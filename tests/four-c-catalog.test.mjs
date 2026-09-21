import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const products = JSON.parse(fs.readFileSync("public/data/4c-products.json", "utf8"));

test("4C snapshot contains only unique, priced physical products", () => {
  assert.equal(products.length, 4542);
  assert.equal(new Set(products.map((product) => product.code.toLowerCase())).size, products.length);
  assert.ok(products.every((product) => product.supplierSource === "4cabling"));
  assert.ok(products.every((product) => /^4C-[A-Za-z0-9._-]+$/.test(product.code)));
  assert.ok(products.every((product) => Number.isFinite(product.price) && product.price > 0));
  assert.ok(products.every((product) => Number.isInteger(product.stockQuantity) && product.stockQuantity >= 0));
});

test("4C prices use the existing 20 percent markup and GST rule", () => {
  const cableTies = products.find((product) => product.supplierCode === "011.060.0026");
  assert.ok(cableTies);
  assert.equal(cableTies.code, "4C-011.060.0026");
  assert.equal(cableTies.resellerPrice, 2.4);
  assert.equal(cableTies.price, 2.64);
  assert.equal(cableTies.stockQuantity, 84);
  assert.ok(cableTies.rrp >= Math.round(cableTies.price * 1.1 * 100) / 100);
});

test("invalid supplier prices and private cost fields are not published", () => {
  assert.equal(products.some((product) => product.supplierCode === "UB.UCK.G2.PLUS"), false);
  for (const product of products) {
    assert.equal(Object.hasOwn(product, "Price_Ex"), false);
    assert.equal(Object.hasOwn(product, "Price_Inc"), false);
    assert.equal(Object.hasOwn(product, "costExGst"), false);
  }
});
