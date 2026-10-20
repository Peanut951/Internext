import assert from "node:assert/strict";
import test from "node:test";
import {
  applyCatalogContentOverride,
  CANON_CST_28_COMPATIBILITY_NOTE,
} from "../shared/catalog-content-overrides.js";

test("adds the Canon CST-28 compatibility note without replacing existing copy", () => {
  const product = {
    code: "CST-28",
    supplierCode: "ST-28",
    longDescription: "Canon replacement stand assembly.",
  };

  const result = applyCatalogContentOverride(product);

  assert.match(result.longDescription, /^Canon replacement stand assembly\./);
  assert.match(result.longDescription, /imagePROGRAF iPF64xx-series printer/);
  assert.match(result.longDescription, /damaged or broken original unit\.$/);
});

test("matches the supplier code and remains idempotent", () => {
  const product = {
    code: "legacy-code",
    supplierCode: "st-28",
    longDescription: CANON_CST_28_COMPATIBILITY_NOTE,
  };

  const result = applyCatalogContentOverride(applyCatalogContentOverride(product));

  assert.equal(result.longDescription, CANON_CST_28_COMPATIBILITY_NOTE);
});

test("does not alter unrelated catalogue products", () => {
  const product = { code: "OTHER-1", longDescription: "Existing description." };
  assert.equal(applyCatalogContentOverride(product), product);
});
