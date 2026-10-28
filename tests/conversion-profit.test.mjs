import assert from "node:assert/strict";
import test from "node:test";
import {
  CONVERSION_VALUE_BASIS,
  calculateGrossProfitConversionValue,
  deriveSupplierCostExGst,
} from "../shared/conversion-profit.js";

test("derives supplier cost from the established reseller markup", () => {
  assert.equal(deriveSupplierCostExGst(120), 100);
  assert.equal(deriveSupplierCostExGst(null), null);
  assert.equal(deriveSupplierCostExGst(-1), null);
});

test("reports public checkout gross profit excluding GST", () => {
  const result = calculateGrossProfitConversionValue([
    {
      sellPrice: 132,
      supplierCostExGst: 100,
      quantity: 2,
      sellPriceIncludesGst: true,
    },
  ]);

  assert.deepEqual(result, {
    value: 40,
    complete: true,
    basis: CONVERSION_VALUE_BASIS,
  });
});

test("reports reseller gross profit after the applied checkout discount", () => {
  const result = calculateGrossProfitConversionValue(
    [
      {
        sellPrice: 120,
        supplierCostExGst: 100,
        quantity: 1,
        sellPriceIncludesGst: false,
      },
    ],
    { discountRate: 0.1 },
  );

  assert.equal(result.value, 8);
  assert.equal(result.complete, true);
});

test("fails closed when supplier cost is unavailable", () => {
  const result = calculateGrossProfitConversionValue([
    {
      sellPrice: 132,
      supplierCostExGst: Number.NaN,
      quantity: 1,
      sellPriceIncludesGst: true,
    },
  ]);

  assert.equal(result.value, 0);
  assert.equal(result.complete, false);
});
