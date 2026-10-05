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
const { default: handler } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const request = async (url) => {
  let body;
  const response = {
    statusCode: 200,
    setHeader() {},
    end(chunk) { body = JSON.parse(chunk); },
  };
  await handler({ method: "GET", url }, response);
  return { status: response.statusCode, body };
};

test("exact product lookup returns only the current supplier product", async () => {
  const { status, body } = await request("/api/catalog/live?view=product&code=CPGI29M");
  assert.equal(status, 200);
  assert.equal(body.item.code, "CPGI29M");
  assert.ok(Number.isFinite(body.item.price));
  assert.equal(Object.hasOwn(body, "items"), false);
});

test("missing product lookup returns 404 without a catalogue payload", async () => {
  const { status, body } = await request("/api/catalog/live?view=product&code=DOES-NOT-EXIST");
  assert.equal(status, 404);
  assert.equal(body.item, null);
});

test("search returns a bounded ranked page", async () => {
  const { status, body } = await request("/api/catalog/live?view=search&q=CPGI29M&page=1&pageSize=6");
  assert.equal(status, 200);
  assert.ok(body.count >= 1);
  assert.ok(body.items.length <= 6);
  assert.equal(body.items[0].code, "CPGI29M");
});
