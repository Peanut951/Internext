import assert from "node:assert/strict";
import test from "node:test";
import {
  applyVerifiedProductIdentities,
  dedupeVerifiedProducts,
} from "../scripts/lib/verified-product-identity.mjs";

test("uses the current supplier product code for stale enrichment aliases", () => {
  const products = applyVerifiedProductIdentities(
    [{ code: "HS-HAIO136DE", supplierCode: "HAIO136DE", description: "Enriched title" }],
    [{ code: "HS-HAIO136GE", supplierCode: "HAIO136DE", price: 100 }],
  );

  assert.deepEqual(products, [{
    code: "HS-HAIO136GE",
    supplierCode: "HAIO136DE",
    description: "Enriched title",
    supplierSource: undefined,
  }]);
});

test("prefers an exact current code when supplier keys overlap", () => {
  const products = applyVerifiedProductIdentities(
    [{ code: "CURRENT", supplierCode: "SHARED" }],
    [
      { code: "CURRENT", supplierCode: "CURRENT-MPN", supplierSource: "alloys" },
      { code: "OTHER", supplierCode: "SHARED", supplierSource: "leader" },
    ],
  );

  assert.equal(products[0].code, "CURRENT");
  assert.equal(products[0].supplierCode, "CURRENT-MPN");
  assert.equal(products[0].supplierSource, "alloys");
});

test("drops products that are not present in the verified supplier catalogue", () => {
  const products = applyVerifiedProductIdentities(
    [{ code: "STALE", supplierCode: "STALE-MPN" }],
    [{ code: "LIVE", supplierCode: "LIVE-MPN" }],
  );

  assert.deepEqual(products, []);
});

test("uses one canonical supplier identity for overlapping live records", () => {
  const products = dedupeVerifiedProducts([
    { code: "OLD-CODE", supplierCode: "SHARED-MPN", price: 90 },
    { code: "CURRENT-CODE", supplierCode: "SHARED-MPN", price: 100 },
  ]);

  assert.deepEqual(products, [
    { code: "CURRENT-CODE", supplierCode: "SHARED-MPN", price: 100 },
  ]);
});
