import assert from "node:assert/strict";
import test from "node:test";
import { isCatalogProductExcluded } from "../shared/catalog-product-exclusions.js";
import { isTangibleCatalogProduct } from "../scripts/lib/product-classification.mjs";

test("removes Canon CST-28 by either catalogue or supplier product code", () => {
  assert.equal(isCatalogProductExcluded({ code: "CST-28" }), true);
  assert.equal(isCatalogProductExcluded({ supplierCode: "ST-28" }), true);
  assert.equal(isTangibleCatalogProduct({
    code: "CST-28",
    supplierCode: "ST-28",
    manufacturer: "Canon",
    description: "Replacement printer stand",
  }), false);
});

test("does not exclude other Canon products", () => {
  assert.equal(isCatalogProductExcluded({ code: "CCART056", supplierCode: "3480B002" }), false);
});

