import assert from "node:assert/strict";
import test from "node:test";
import {
  isDomainApproved,
  normalizeDataForSeoProductInfo,
  normalizePrice2SpyPayload,
  normalizePrisyncListing,
  resolveExactCatalogMatch,
} from "../shared/competitor-provider-normalization.js";
import {
  buildDataForSeoSearchKeyword,
  classifyDataForSeoTaskPayload,
  collectDataForSeoTaskPayloads,
} from "../shared/dataforseo-task-utils.js";

const catalog = [
  {
    code: "GRP2613W",
    supplierCode: "GR-GRP2613W",
    manufacturer: "Grandstream",
    gtin: "6947273702847",
  },
];

test("normalizes a Prisync listing without trusting its title", () => {
  const listing = normalizePrisyncListing(
    {
      id: 42,
      external_ref: "GR-GRP2613W",
      name: "Untrusted provider title",
      brand: "Grandstream",
      gtin: "6947273702847",
    },
    {
      id: 91,
      url: "https://shop.example.com.au/products/grp2613w",
      price: "219.95",
      shipping_price: "12.00",
      currency: "AUD",
      available: true,
      last_check: "2026-09-01T01:00:00Z",
    },
  );

  assert.equal(listing.sellerDomain, "shop.example.com.au");
  assert.equal(listing.itemPriceIncGst, 219.95);
  assert.equal(listing.shippingPriceIncGst, 12);
  assert.equal(listing.inStock, true);
  assert.equal(resolveExactCatalogMatch(listing, catalog).matchMethod, "gtin");
});

test("normalizes Price2Spy current pricing data", () => {
  const listings = normalizePrice2SpyPayload({
    products: {
      product: [{
        productId: 123,
        productName: "Grandstream GRP2613W",
        productCode: "GR-GRP2613W",
        brandName: "Grandstream",
        urls: {
          url: [{
            urlId: 456,
            url: "https://approved.example.com.au/grp2613w",
            siteHumanName: "Approved Example",
            lastMeasurement: {
              price: { amount: 210, currency: "AUD" },
              available: true,
              dateChecked: "2026-09-01 02:00:00Z",
            },
          }],
        },
      }],
    },
  });

  assert.equal(listings.length, 1);
  assert.equal(listings[0].providerListingId, "456");
  assert.equal(listings[0].sellerDomain, "approved.example.com.au");
  assert.equal(resolveExactCatalogMatch(listings[0], catalog).matchMethod, "manual_verified");
});

test("allows subdomains of an approved seller but not lookalike domains", () => {
  assert.equal(isDomainApproved("deals.store.com.au", ["store.com.au"]), true);
  assert.equal(isDomainApproved("store.com.au.example.net", ["store.com.au"]), false);
});

test("rejects title-only and partial product-code matches", () => {
  const base = {
    provider: "prisync",
    providerProductId: "1",
    providerListingId: "2",
    providerProductCode: "GRP2613",
    gtin: "",
    mpn: "",
    brand: "Grandstream",
    productName: "Grandstream GRP2613W",
    sellerName: "Seller",
    sellerDomain: "seller.example.com.au",
    productUrl: "https://seller.example.com.au/product",
    itemPriceIncGst: 100,
    shippingPriceIncGst: 0,
    currency: "AUD",
    inStock: true,
    observedAt: "2026-09-01T00:00:00.000Z",
    sourceReference: "fixture",
  };

  assert.equal(resolveExactCatalogMatch(base, catalog), null);
});

test("accepts DataForSEO sellers only after exact brand and part-number verification", () => {
  const result = normalizeDataForSeoProductInfo({
    tasks: [{
      data: { tag: "internext:info:fixture" },
      result: [{
        type: "product_info",
        product_id: "google-product-1",
        datetime: "2026-09-03T01:00:00Z",
        items: [{
          type: "product_info_element",
          product_id: "google-product-1",
          title: "Grandstream GRP2613W IP Phone",
          specifications: [
            { specification_name: "Brand", specification_value: "Grandstream" },
            { specification_name: "Part Numbers", specification_value: "GR-GRP2613W" },
          ],
          sellers: [{
            data_docid: "offer-1",
            title: "Example Technology",
            url: "https://shop.example.com.au/grandstream-grp2613w",
            price: { current: 205, regular: 219, currency: "AUD" },
            delivery_info: { delivery_price: { current: 10, currency: "AUD" } },
            product_availability: "in_stock",
          }],
        }],
      }],
    }],
  }, catalog[0], { locationName: "Australia" });

  assert.equal(result.matchVerified, true);
  assert.equal(result.matchMethod, "brand_mpn");
  assert.equal(result.listings.length, 1);
  assert.equal(result.listings[0].shippingPriceIncGst, 10);
  assert.equal(result.listings[0].shippingVerified, true);
  assert.equal(result.listings[0].isNew, true);
});

test("does not verify DataForSEO title-only matches", () => {
  const result = normalizeDataForSeoProductInfo({
    tasks: [{
      result: [{
        items: [{
          type: "google_shopping_product_info",
          product_id: "wrong-product",
          title: "Grandstream GRP2613W IP Phone",
          specifications: [
            { specification_name: "Brand", specification_value: "Grandstream" },
            { specification_name: "Part Numbers", specification_value: "GRP2613P" },
          ],
          sellers: [],
        }],
      }],
    }],
  }, catalog[0]);

  assert.equal(result.matchVerified, false);
  assert.equal(result.matchMethod, null);
  assert.equal(result.listings.length, 0);
});

test("keeps unverified DataForSEO sellers in review without creating an exact match", () => {
  const result = normalizeDataForSeoProductInfo({
    tasks: [{
      result: [{
        items: [{
          type: "product_info_element",
          product_id: "unverified-google-product",
          title: "Similar Grandstream phone",
          specifications: [],
          sellers: [{
            data_docid: "unverified-offer",
            title: "Example seller",
            url: "https://seller.example.com.au/similar-phone",
            price: { current: 199, currency: "AUD" },
            delivery_info: { delivery_price: { current: 10, currency: "AUD" } },
            product_availability: "in_stock",
          }],
        }],
      }],
    }],
  }, catalog[0]);

  assert.equal(result.matchVerified, false);
  assert.equal(result.matchMethod, null);
  assert.equal(result.listings.length, 1);
  assert.equal(result.listings[0].requestedProductCode, "GRP2613W");
  assert.equal(resolveExactCatalogMatch(result.listings[0], catalog), null);
});

test("does not redirect a DataForSEO result to a different catalogue product", () => {
  const listing = {
    provider: "dataforseo",
    providerProductId: "wrong-google-product",
    providerListingId: "wrong-offer",
    providerProductCode: "",
    requestedProductCode: "GRP2613W",
    gtin: "9312345678901",
    mpn: "OTHER-MODEL",
    brand: "Other Brand",
    productName: "Other Brand Other Model",
    sellerName: "Example seller",
    sellerDomain: "seller.example.com.au",
    productUrl: "https://seller.example.com.au/other-model",
    itemPriceIncGst: 99,
    shippingPriceIncGst: 10,
    currency: "AUD",
    inStock: true,
    observedAt: "2026-09-10T00:00:00.000Z",
    sourceReference: "dataforseo:wrong-google-product:wrong-offer:Australia",
  };
  const otherProduct = {
    code: "OTHER-MODEL",
    supplierCode: "OTHER-MODEL",
    manufacturer: "Other Brand",
    gtin: "9312345678901",
  };

  assert.equal(resolveExactCatalogMatch(listing, [...catalog, otherProduct]), null);
});

test("treats DataForSEO no-results tasks as an empty product result", () => {
  assert.deepEqual(classifyDataForSeoTaskPayload({
    tasks: [{ status_code: 40102, status_message: "No Search Results." }],
  }), {
    outcome: "no_results",
    statusCode: 40102,
    statusMessage: "No Search Results.",
  });
});

test("still identifies real DataForSEO task failures", () => {
  assert.equal(classifyDataForSeoTaskPayload({
    tasks: [{ status_code: 40210, status_message: "Insufficient Funds." }],
  }).outcome, "failed");
});

test("a no-results task does not discard successful tasks from the same batch", async () => {
  const results = await collectDataForSeoTaskPayloads([
    { id: "empty", tag: "first" },
    { id: "valid", tag: "second" },
  ], async ({ id }) => id === "empty"
    ? { tasks: [{ status_code: 40102, status_message: "No Search Results." }] }
    : { tasks: [{ status_code: 20000, result: [{ product_id: "product-1" }] }] });

  assert.equal(results[0].outcome, "no_results");
  assert.equal(results[1].outcome, "success");
  assert.equal(results[1].payload.tasks[0].result[0].product_id, "product-1");
});

test("searches Google Shopping by brand and model instead of an overly narrow GTIN", () => {
  assert.equal(buildDataForSeoSearchKeyword(catalog[0]), "Grandstream GR-GRP2613W");
});

test("marks used DataForSEO offers as ineligible", () => {
  const result = normalizeDataForSeoProductInfo({
    tasks: [{
      result: [{
        items: [{
          type: "google_shopping_product_info",
          product_id: "google-product-2",
          specifications: [
            { specification_name: "GTIN", specification_value: "6947273702847" },
          ],
          sellers: [{
            seller_url: "https://used.example.com.au/product",
            base_price: 99,
            currency: "AUD",
            product_availability: "In stock",
            product_condition: "Refurbished",
          }],
        }],
      }],
    }],
  }, catalog[0]);

  assert.equal(result.matchMethod, "gtin");
  assert.equal(result.listings[0].isNew, false);
});
