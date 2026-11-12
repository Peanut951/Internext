import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  entryPoints: ["api/catalog/live.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { catalogStockOverrideTestUtils } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);

const {
  buildStockOverrideMap,
  getStockOverrideForProduct,
  applyStockOverrideToProduct,
  removeAppliedStockOverrides,
} = catalogStockOverrideTestUtils;

const override = {
  code: "IPY-T54W",
  supplierCode: "SIP-T54W",
  stockQuantity: 108,
  stockLocation: "internext",
};

const baseProduct = {
  code: "IPY-T54W",
  supplierCode: "SIP-T54W",
  availabilityText: "In Stock",
  etaStatus: "",
  stockQuantity: 1,
  stockByWarehouse: {
    adl: 0,
    bne: 0,
    mel: 0,
    syd: 0,
    wa: 0,
    internext: 1,
  },
};

test("an override matching code and supplier code is applied once", () => {
  const overridesByKey = buildStockOverrideMap([override]);
  const matches = getStockOverrideForProduct(baseProduct, overridesByKey);
  assert.equal(matches.length, 1);

  const adjusted = applyStockOverrideToProduct(baseProduct, matches);
  assert.equal(adjusted.stockQuantity, 109);
  assert.equal(adjusted.stockByWarehouse.internext, 109);
  assert.equal(adjusted.stockByWarehouse.adminAdjustment, 108);
  assert.deepEqual(adjusted.stockByWarehouse.adminAdjustments, { internext: 108 });
});

test("repeated stock refreshes do not compound an applied override", () => {
  const overridesByKey = buildStockOverrideMap([override]);
  const matches = getStockOverrideForProduct(baseProduct, overridesByKey);
  const first = applyStockOverrideToProduct(baseProduct, matches);
  const second = applyStockOverrideToProduct(removeAppliedStockOverrides(first), matches);
  const third = applyStockOverrideToProduct(removeAppliedStockOverrides(second), matches);

  assert.equal(first.stockQuantity, 109);
  assert.equal(second.stockQuantity, 109);
  assert.equal(third.stockQuantity, 109);
});

test("refresh removal repairs legacy inconsistent adjustment metadata", () => {
  const corruptedProduct = {
    ...baseProduct,
    stockQuantity: 217,
    stockByWarehouse: {
      ...baseProduct.stockByWarehouse,
      internext: 217,
      adminAdjustment: 216,
      adminLocation: "internext",
      adminAdjustments: { internext: 108 },
    },
  };

  const supplierProduct = removeAppliedStockOverrides(corruptedProduct);
  assert.equal(supplierProduct.stockQuantity, 1);
  assert.equal(supplierProduct.stockByWarehouse.internext, 1);
});
