import assert from "node:assert/strict";
import test from "node:test";
import { FOUR_C_CATALOG_MAX_AGE_MS, isCurrentFourCProduct } from "../shared/four-c-catalog-freshness.js";

const now = Date.parse("2026-09-22T00:00:00.000Z");
const product = (updatedAt) => ({ supplierSource: "4cabling", supplierCatalogUpdatedAt: updatedAt });

test("4C products expire seven days after supplier confirmation", () => {
  assert.equal(isCurrentFourCProduct(product(new Date(now - FOUR_C_CATALOG_MAX_AGE_MS).toISOString()), now), true);
  assert.equal(isCurrentFourCProduct(product(new Date(now - FOUR_C_CATALOG_MAX_AGE_MS - 1).toISOString()), now), false);
});

test("missing, invalid and future 4C timestamps fail closed", () => {
  assert.equal(isCurrentFourCProduct(product(""), now), false);
  assert.equal(isCurrentFourCProduct(product("invalid"), now), false);
  assert.equal(isCurrentFourCProduct(product(new Date(now + 1).toISOString()), now), false);
});

test("admin stock edits cannot revive an expired supplier snapshot", () => {
  assert.equal(isCurrentFourCProduct({ ...product(new Date(now - FOUR_C_CATALOG_MAX_AGE_MS - 1).toISOString()), stockRecordUpdated: new Date(now).toISOString() }, now), false);
});

test("other suppliers are not subject to the 4C snapshot limit", () => {
  assert.equal(isCurrentFourCProduct({ supplierSource: "alloys" }, now), true);
  assert.equal(isCurrentFourCProduct({ supplierSource: "leader" }, now), true);
});
