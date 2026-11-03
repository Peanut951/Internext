import assert from "node:assert/strict";
import test from "node:test";
import {
  resolvePricedCatalogEquivalent,
  searchCatalogProducts,
} from "../src/lib/catalogSearch.ts";

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

test("replaces an expired 4C quote fallback with the exact priced supplier model", () => {
  const duplicateProducts = [
    {
      code: "4C-UB.USW.ULTRA.60W",
      supplierCode: "UB.USW.ULTRA.60W",
      supplierSource: "4cabling",
      manufacturer: "4Cabling",
      description: "Ubiquiti USW-Ultra-60W compact PoE switch",
      price: null,
      quoteRequired: true,
    },
    {
      code: "NHU-USW-ULTRA-60W",
      supplierCode: "USW-Ultra-60W",
      supplierSource: "leader",
      manufacturer: "Ubiquiti",
      description: "Ubiquiti USW-Ultra-60W compact PoE switch",
      price: 323.4,
      stockQuantity: 100,
      quoteRequired: false,
    },
  ];

  const matches = searchCatalogProducts(duplicateProducts, "USW Ultra 60W");

  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.product.code, "NHU-USW-ULTRA-60W");
  assert.equal(matches[0]?.product.price, 323.4);
});

test("resolves direct quote-only lookups to the exact priced model", () => {
  const quoteProduct = {
    code: "4C-UB.USW.ULTRA.210W",
    supplierCode: "UB.USW.ULTRA.210W",
    supplierSource: "4cabling",
    manufacturer: "4Cabling",
    description: "Ubiquiti USW-Ultra-210W PoE switch",
    price: null,
    quoteRequired: true,
  };
  const pricedProduct = {
    code: "NHU-USW-ULTRA-210W",
    supplierCode: "USW-Ultra-210W",
    supplierSource: "leader",
    manufacturer: "Ubiquiti",
    description: "Ubiquiti USW-Ultra-210W PoE switch",
    price: 456.72,
    quoteRequired: false,
  };

  assert.equal(
    resolvePricedCatalogEquivalent(quoteProduct, [quoteProduct, pricedProduct])?.code,
    "NHU-USW-ULTRA-210W",
  );
});

test("does not merge different model variants", () => {
  const quoteProduct = {
    code: "4C-UB.USW.ULTRA.42W",
    supplierCode: "UB.USW.ULTRA.42W",
    supplierSource: "4cabling",
    manufacturer: "4Cabling",
    description: "Ubiquiti USW-Ultra 42W PoE switch",
    price: null,
    quoteRequired: true,
  };
  const differentVariant = {
    code: "NHU-USW-ULTRA-60W",
    supplierCode: "USW-Ultra-60W",
    supplierSource: "leader",
    manufacturer: "Ubiquiti",
    description: "Ubiquiti USW-Ultra 60W PoE switch",
    price: 323.4,
    quoteRequired: false,
  };

  assert.equal(resolvePricedCatalogEquivalent(quoteProduct, [quoteProduct, differentVariant]), null);
});

test("recognizes the supplier names used for the base 42W and non-PoE models", () => {
  const base42W = {
    code: "4C-UB.USW.ULTRA.42W",
    supplierCode: "UB.USW.ULTRA.42W",
    supplierSource: "4cabling",
    manufacturer: "4Cabling",
    description: "Ubiquiti USW-Ultra 42W PoE switch",
    price: null,
    quoteRequired: true,
  };
  const pricedBase = {
    code: "NHU-USW-ULTRA",
    supplierCode: "USW-Ultra",
    manufacturer: "Ubiquiti",
    description: "Ubiquiti USW-Ultra 42W PoE switch",
    price: 234.96,
    quoteRequired: false,
  };
  const nonPoe48 = {
    code: "4C-UB.USW.PRO.MAX.48N",
    supplierCode: "UB.USW.PRO.MAX.48N",
    supplierSource: "4cabling",
    manufacturer: "Ubiquiti",
    description: "Ubiquiti USW-Pro-Max-48 non-PoE switch",
    price: null,
    quoteRequired: true,
  };
  const pricedNonPoe = {
    code: "NHU-USW-PRO-MAX-48",
    supplierCode: "USW-Pro-Max-48",
    manufacturer: "Ubiquiti",
    description: "Ubiquiti USW-Pro-Max-48 non-PoE switch",
    price: 1481.04,
    quoteRequired: false,
  };

  assert.equal(resolvePricedCatalogEquivalent(base42W, [base42W, pricedBase])?.code, "NHU-USW-ULTRA");
  assert.equal(resolvePricedCatalogEquivalent(nonPoe48, [nonPoe48, pricedNonPoe])?.code, "NHU-USW-PRO-MAX-48");
});
