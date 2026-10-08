import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

process.env.AUTH_SESSION_SECRET = "test-shipping-quote-secret";

const bundle = await build({
  entryPoints: ["api/shipping/_quoteToken.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const quoteTokens = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`
);

const items = [
  { code: "SKU-B", qty: 2 },
  { code: "SKU-A", qty: 1 },
];

test("accepts an untampered quote for the same postcode and cart", () => {
  const token = quoteTokens.createShippingQuoteToken({
    destinationPostcode: "2000",
    items,
    service: { name: "Parcel Post", price: 18.75 },
  });
  assert.deepEqual(
    quoteTokens.verifyShippingQuoteToken({ token, destinationPostcode: "2000", items: items.slice().reverse() }),
    { name: "Parcel Post", price: 18.75 },
  );
});

test("rejects a quote when the postcode or cart changes", () => {
  const token = quoteTokens.createShippingQuoteToken({
    destinationPostcode: "2000",
    items,
    service: { name: "Parcel Post", price: 18.75 },
  });
  assert.equal(
    quoteTokens.verifyShippingQuoteToken({ token, destinationPostcode: "3000", items }),
    null,
  );
  assert.equal(
    quoteTokens.verifyShippingQuoteToken({ token, destinationPostcode: "2000", items: [{ code: "SKU-A", qty: 2 }] }),
    null,
  );
});

test("rejects a tampered quote", () => {
  const token = quoteTokens.createShippingQuoteToken({
    destinationPostcode: "2000",
    items,
    service: { name: "Parcel Post", price: 18.75 },
  });
  const tampered = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
  assert.equal(
    quoteTokens.verifyShippingQuoteToken({ token: tampered, destinationPostcode: "2000", items }),
    null,
  );
});
