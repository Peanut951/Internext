import fs from "node:fs";

const products = JSON.parse(fs.readFileSync("public/data/4c-products.json", "utf8"));
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.slice(8)) : products.length;
if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit must be a positive integer.");
const selected = products.slice(0, limit);
const results = new Array(selected.length);
let next = 0;

const probe = async (product) => {
  const url = product.imageUrl;
  if (!url || !/^https:\/\//i.test(url)) return { code: product.code, status: "missing_url" };
  try {
    let response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(12000) });
    if (!response.ok || !String(response.headers.get("content-type") || "").toLowerCase().startsWith("image/")) {
      response = await fetch(url, { headers: { Range: "bytes=0-0" }, signal: AbortSignal.timeout(12000) });
      await response.body?.cancel();
    }
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const status = response.headers.get("cf-mitigated") === "challenge"
      ? "blocked_by_host"
      : response.ok && contentType.startsWith("image/") ? "ok" : "invalid_image";
    return { code: product.code, status, httpStatus: response.status, contentType };
  } catch (error) {
    return { code: product.code, status: "request_failed", error: error instanceof Error ? error.message : String(error) };
  }
};

await Promise.all(Array.from({ length: Math.min(12, selected.length) }, async () => {
  while (next < selected.length) {
    const index = next++;
    results[index] = await probe(selected[index]);
  }
}));

const blocked = results.filter((result) => result.status === "blocked_by_host");
const failures = results.filter((result) => result.status !== "ok" && result.status !== "blocked_by_host");
const report = {
  generatedAt: new Date().toISOString(),
  checked: results.length,
  passed: results.length - failures.length - blocked.length,
  blockedByHost: blocked.length,
  failed: failures.length,
  blockedSample: blocked.slice(0, 20),
  failures,
};
fs.mkdirSync("reports", { recursive: true });
fs.writeFileSync("reports/4c-image-audit.json", `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ checked: report.checked, passed: report.passed, blockedByHost: report.blockedByHost, failed: report.failed, report: "reports/4c-image-audit.json" }, null, 2));
if (failures.length) process.exitCode = 1;
