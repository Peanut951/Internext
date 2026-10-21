import assert from "node:assert/strict";
import test from "node:test";
import { applyCatalogContentOverride } from "../shared/catalog-content-overrides.js";

test("does not alter unrelated catalogue products", () => {
  const product = { code: "OTHER-1", longDescription: "Existing description." };
  assert.equal(applyCatalogContentOverride(product), product);
});
