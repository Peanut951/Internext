import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildOptimizedProductTitle,
  getProductTitleMpn,
  normalizeProductTitleToken,
} from "../shared/product-title-policy.js";

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

test("puts the Grandstream model and product type into an otherwise generic supplier name", () => {
  const title = buildOptimizedProductTitle({
    code: "GR-GRP2613W",
    supplierCode: "GR-GRP2613W",
    manufacturer: "Grandstream",
    description: '6 Lines 6 SIP Accounts 2.8" Screen POE + Gige Color WI-FI',
  });

  assert.match(title, /^Grandstream GRP2613W - Business Phone - /);
  assert.match(title, /PoE/);
  assert.match(title, /Gigabit Ethernet/);
  assert.match(title, /Wi-Fi/);
});

test("uses a readable 4Cabling title while retaining its searchable supplier part number", () => {
  const title = buildOptimizedProductTitle({
    code: "4C-016.008.0001",
    supplierCode: "016.008.0001",
    manufacturer: "4Cabling",
    description: "Single Keystone Surface Mount Box",
  });

  assert.equal(title, "4Cabling 016.008.0001 - Single Keystone Surface Mount Box");
  assert.doesNotMatch(title, /4C-016/);
});

test("every supplier catalogue record receives a bounded title containing brand and MPN", () => {
  const products = [
    ...readJson("public/data/catalog-products.json"),
    ...readJson("public/data/leader-products.json"),
    ...readJson("public/data/4c-products.json"),
  ].filter((product) => product?.code && product?.manufacturer);

  const failures = [];
  for (const product of products) {
    const title = buildOptimizedProductTitle(product);
    const normalizedTitle = normalizeProductTitleToken(title);
    const brand = normalizeProductTitleToken(product.manufacturer);
    const mpn = normalizeProductTitleToken(getProductTitleMpn(product));
    const reasons = [];
    if (title.length > 150) reasons.push(`length ${title.length}`);
    if (brand && !normalizedTitle.includes(brand)) reasons.push("missing brand");
    if (mpn && !normalizedTitle.includes(mpn)) reasons.push("missing MPN");
    if (/^(?:undefined|null)\b|\b(?:undefined|null)$/i.test(title)) reasons.push("invalid placeholder");
    if (reasons.length) failures.push({ code: product.code, title, reasons });
  }

  assert.deepEqual(failures.slice(0, 20), []);
  assert.ok(products.length > 10_000);
});
