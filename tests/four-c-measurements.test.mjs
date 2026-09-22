import assert from "node:assert/strict";
import test from "node:test";
import { applySourcedShippingMeasurement, buildSourcedShippingMeasurementMap } from "../scripts/lib/sourced-shipping-measurements.mjs";
import { mergeFourCMeasurements } from "../scripts/lib/four-c-measurement-import.mjs";

const catalog = [{ code: "4C-SKU-1", supplierCode: "SKU-1", supplierSource: "4cabling" }];
const headers = "SKU,Package_Weight_Kg,Package_Height_Cm,Package_Width_Cm,Package_Depth_Cm,Source_Reference\n";

test("4C package measurements do not inherit an Alloys SKU match", () => {
  const map = buildSourcedShippingMeasurementMap([{
    code: "SKU-1", supplierCode: "SKU-1", weightKg: 1, heightCm: 2, widthCm: 3, depthCm: 4,
  }]);
  assert.equal(applySourcedShippingMeasurement(catalog[0], map), catalog[0]);
});

test("an exact 4C code can receive a sourced package measurement", () => {
  const map = buildSourcedShippingMeasurementMap([{
    code: "4C-SKU-1", weightKg: 1, heightCm: 2, widthCm: 3, depthCm: 4,
  }]);
  assert.equal(applySourcedShippingMeasurement(catalog[0], map).weightKg, 1);
});

test("bulk import requires complete dimensions and evidence, preserving existing rows", () => {
  const existing = { items: [{ code: "OTHER", weightKg: 7 }] };
  const data = mergeFourCMeasurements(`${headers}SKU-1,1.25,20,30,40,4C document 123\n`, catalog, existing, "2026-09-22T00:00:00Z");
  assert.equal(data.items.length, 2);
  assert.equal(data.items[1].code, "4C-SKU-1");
  assert.equal(data.items[1].weightKg, 1.25);
  assert.equal(data.items[1].sourceReference, "4C document 123");
  assert.equal(data.items[1].confidence, "high");
  assert.equal(existing.items.length, 1);
  assert.throws(() => mergeFourCMeasurements(`${headers}SKU-1,1.25,,30,40,4C document 123\n`, catalog, existing), /complete positive/);
  assert.throws(() => mergeFourCMeasurements(`${headers}SKU-1,1.25,20,30,40,\n`, catalog, existing), /evidence reference/);
  assert.throws(() => mergeFourCMeasurements(`${headers}OTHER,1.25,20,30,40,4C document 123\n`, catalog, existing), /unknown 4C SKU/);
});
