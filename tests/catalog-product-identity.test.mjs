import assert from "node:assert/strict";
import test from "node:test";
import {
  areCatalogProductsSameIdentity,
  dedupeCatalogProductsByIdentity,
} from "../shared/catalog-product-identity.js";

test("deduplicates exact cross-supplier manufacturer models and retains aliases", () => {
  const fourC = {
    code: "4C-UB.USW.ULTRA.60W",
    supplierCode: "UB.USW.ULTRA.60W",
    supplierSource: "4cabling",
    manufacturer: "4Cabling",
    description: "Ubiquiti USW-Ultra-60W compact PoE switch",
    price: null,
    quoteRequired: true,
  };
  const leader = {
    code: "NHU-USW-ULTRA-60W",
    supplierCode: "USW-Ultra-60W",
    supplierSource: "leader",
    manufacturer: "Ubiquiti",
    description: "Ubiquiti USW-Ultra-60W compact PoE switch",
    price: 323.4,
    quoteRequired: false,
  };

  const products = dedupeCatalogProductsByIdentity([fourC, leader], {
    selectPreferred: (current, next) => Number(next.price || 0) > Number(current.price || 0) ? next : current,
  });

  assert.equal(products.length, 1);
  assert.equal(products[0].code, "NHU-USW-ULTRA-60W");
  assert.ok(products[0].catalogAliases.includes("4C-UB.USW.ULTRA.60W"));
});

test("does not merge different model variants", () => {
  assert.equal(areCatalogProductsSameIdentity(
    {
      code: "4C-UB.USW.ULTRA.60W",
      supplierCode: "UB.USW.ULTRA.60W",
      supplierSource: "4cabling",
      manufacturer: "Ubiquiti",
    },
    {
      code: "NHU-USW-ULTRA-210W",
      supplierCode: "USW-Ultra-210W",
      supplierSource: "leader",
      manufacturer: "Ubiquiti",
    },
  ), false);
});

test("does not merge a shared model code across incompatible brands", () => {
  assert.equal(areCatalogProductsSameIdentity(
    { code: "ONE", supplierCode: "MODEL-123", manufacturer: "Brand One" },
    { code: "TWO", supplierCode: "MODEL-123", manufacturer: "Brand Two" },
  ), false);
});

test("recognizes exact GTIN matches independently of supplier codes", () => {
  assert.equal(areCatalogProductsSameIdentity(
    {
      code: "ALLOYS-ONE",
      supplierCode: "ONE",
      supplierSource: "alloys",
      manufacturer: "Vendor",
      gtin: "1234567890123",
    },
    {
      code: "LEADER-TWO",
      supplierCode: "TWO",
      supplierSource: "leader",
      manufacturer: "Vendor",
      ean: "1234567890123",
    },
  ), true);
});
