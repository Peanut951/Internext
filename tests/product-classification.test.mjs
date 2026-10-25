import test from "node:test";
import assert from "node:assert/strict";
import { isTangibleCatalogProduct } from "../shared/catalog-product-classification.js";

const product = (name, overrides = {}) => ({
  code: overrides.code || "TEST-001",
  supplierCode: overrides.supplierCode || "TEST-001",
  manufacturer: overrides.manufacturer || "Test Brand",
  name,
  description: overrides.description || name,
  leaderCategory: overrides.leaderCategory || "",
  category: overrides.category || "",
  subcategory: overrides.subcategory || "",
});

test("keeps physical products whose titles contain generic service-like words", () => {
  assert.equal(isTangibleCatalogProduct(product("Canon Extra Large Ink Tank")), true);
  assert.equal(isTangibleCatalogProduct(product("Fujifilm Extra High Yield Toner Cartridge")), true);
  assert.equal(isTangibleCatalogProduct(product("Fujitsu Post Imprinter")), true);
  assert.equal(isTangibleCatalogProduct(product("Yealink SIP-T54W Prime Business IP Phone")), true);
  assert.equal(isTangibleCatalogProduct(product("Ecosys P4060DN Mono Laser Printer 3YRS Onsite WTY")), true);
  assert.equal(isTangibleCatalogProduct(product("Epson SureColour SC-P906 Photo Printer 5YR CoverPlus Bundle")), true);
});

test("removes warranty, support, licence and software-only offers", () => {
  assert.equal(isTangibleCatalogProduct(product("FI-8250 3 YR Next Business Day Exchange")), false);
  assert.equal(isTangibleCatalogProduct(product("Epson 2YR CoverPlus Return To Base")), false);
  assert.equal(isTangibleCatalogProduct(product("Microsoft 365 Business Standard Licence")), false);
  assert.equal(isTangibleCatalogProduct(product("3 Year Onsite Support Plan")), false);
  assert.equal(isTangibleCatalogProduct(product("FI-8250 3 YR ASAP Exchange")), false);
  assert.equal(isTangibleCatalogProduct(product("HP 3Y NBD DesignJet T230 HWS")), false);
  assert.equal(isTangibleCatalogProduct(product("Lexmark Upgrade To Onsite Repair Next Business Day Response")), false);
  assert.equal(isTangibleCatalogProduct(product("1 Year Poly VVX D230 DECT IP Phone Kit Service")), false);
  assert.equal(isTangibleCatalogProduct(product("Lexmark 5 YR ADV EXCH NBD RESPONSE - MX421ADE")), false);
  assert.equal(isTangibleCatalogProduct(product("HP 1YR PW NBD ONSITE HW SUPPOR WITH DMR")), false);
});
