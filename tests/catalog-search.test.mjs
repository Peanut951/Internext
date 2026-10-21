import assert from "node:assert/strict";
import test from "node:test";
import { searchCatalogProducts } from "../src/lib/catalogSearch.ts";

const products = [
  {
    code: "GR-GRP2613W",
    supplierCode: "GRP2613W",
    manufacturer: "Grandstream",
    description: "GRP2613W 6-Line IP Phone with Wi-Fi",
    category: "VoIP Phones",
  },
  {
    code: "GR-GRP2613",
    supplierCode: "GRP2613",
    manufacturer: "Grandstream",
    description: "GRP2613 6-Line IP Phone",
    category: "VoIP Phones",
  },
  {
    code: "DL-LATITUDE-5450",
    supplierCode: "LAT5450",
    manufacturer: "Dell",
    description: "Latitude 5450 Business Notebook Computer",
    category: "Laptops",
  },
  {
    code: "HP-MFP-4301",
    supplierCode: "4301FDW",
    manufacturer: "HP",
    description: "Colour Laser Multifunction Printer",
    category: "Printers",
  },
  {
    code: "CTX-2200MFP",
    supplierCode: "TX2200MFP",
    manufacturer: "Canon",
    description: "5 Colour Technical Scanner Package",
    category: "Large Format Equipment",
  },
  {
    code: "UB-U7-PRO",
    supplierCode: "U7-PRO",
    manufacturer: "Ubiquiti",
    description: "WiFi 7 Wireless Access Point",
    category: "Wireless Networking",
  },
];

test("keeps an exact model number ahead of partial model matches", () => {
  const matches = searchCatalogProducts(products, "GRP2613W");

  assert.equal(matches[0]?.product.code, "GR-GRP2613W");
});

test("matches model numbers despite spaces and punctuation", () => {
  const matches = searchCatalogProducts(products, "grp 2613 w");

  assert.equal(matches[0]?.product.code, "GR-GRP2613W");
});

test("uses related product terms and ignores natural-language filler", () => {
  const phoneMatches = searchCatalogProducts(products, "wireless office telephone");
  const laptopMatches = searchCatalogProducts(products, "business laptop");

  assert.equal(phoneMatches[0]?.product.code, "GR-GRP2613W");
  assert.equal(laptopMatches[0]?.product.code, "DL-LATITUDE-5450");
  assert.equal(phoneMatches.some((match) => match.product.code === "UB-U7-PRO"), false);
});

test("tolerates a controlled product-word typo", () => {
  const matches = searchCatalogProducts(products, "laptp");

  assert.equal(matches[0]?.product.code, "DL-LATITUDE-5450");
});

test("allows one missing qualifier in a longer descriptive search", () => {
  const matches = searchCatalogProducts(products, "colour laser printer duplex");

  assert.equal(matches[0]?.product.code, "HP-MFP-4301");
});

test("ranks literal customer wording above synonym-only matches", () => {
  const matches = searchCatalogProducts(products, "multifunction colour printer");

  assert.equal(matches[0]?.product.code, "HP-MFP-4301");
});
