import fs from "node:fs";
import path from "node:path";

const catalogPath = path.resolve("public/data/catalog-products.json");
const auditPath = path.resolve("reports/product-image-audit.json");
const reportPath = path.resolve("reports/product-image-direct-fix.json");

const args = process.argv.slice(2);
const options = {
  concurrency: 16,
  limit: Number.POSITIVE_INFINITY,
};

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--concurrency") {
    options.concurrency = Number.parseInt(args[index + 1] || "", 10);
    index += 1;
  } else if (arg === "--limit") {
    options.limit = Number.parseInt(args[index + 1] || "", 10);
    index += 1;
  }
}

if (!Number.isFinite(options.concurrency) || options.concurrency <= 0) {
  options.concurrency = 16;
}
if (!Number.isFinite(options.limit) || options.limit <= 0) {
  options.limit = Number.POSITIVE_INFINITY;
}

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
};

const writeCompactJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value));
};

const normalizeToken = (value) =>
  String(value || "")
    .trim()
    .replace(/^[A-Z]{1,3}(?=[A-Z]*\d)/, "")
    .replace(/[^A-Za-z0-9._-]/g, "");

const getTokens = (product) =>
  Array.from(new Set([
    product.code,
    product.supplierCode,
    normalizeToken(product.code),
    normalizeToken(product.supplierCode),
  ].filter((value) => typeof value === "string" && value.trim().length >= 3)));

const directories = [
  "https://www.alloys.com.au/Images/ProductImages/Original",
  "https://www.alloys.com.au/Images/ProductImages/Large",
  "https://www.alloys.com.au/Images/ProductImages",
  "https://www.alloys.com.au/images/ProductImages",
  "https://www.alloys.com.au/Images/ProductImages/Small",
];

const extensions = [".jpg", ".JPG", ".jpeg", ".JPEG", ".png", ".PNG", ".gif", ".GIF", ""];

const buildCandidates = (product) => {
  const candidates = [];
  for (const token of getTokens(product)) {
    for (const directory of directories) {
      for (const extension of extensions) {
        candidates.push(`${directory}/${encodeURIComponent(token)}${extension}`);
      }
    }
  }
  return Array.from(new Set(candidates));
};

const fetchImageProbe = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!/^image\//i.test(contentType)) {
      return null;
    }

    const bytes = Number(response.headers.get("content-length") || 0);
    return { url, contentType, bytes };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const qualityScore = (url) => {
  if (/\/ProductImages\/Original\//i.test(url)) return 5;
  if (/\/ProductImages\/Large\//i.test(url)) return 4;
  if (/\/ProductImages\/Small\//i.test(url)) return 1;
  return 3;
};

const catalog = readJson(catalogPath);
const audit = readJson(auditPath);
const productByCode = new Map(catalog.map((product) => [product.code, product]));
const severeCodes = new Set(
  audit.results
    .filter((result) =>
      result.issues.some((issue) =>
        [
          "no_image",
          "broken_image",
          "unknown_dimensions",
          "generic_image",
          "unsupported_image_type",
        ].includes(issue),
      ),
    )
    .map((result) => result.code),
);
const targets = [...severeCodes]
  .map((code) => productByCode.get(code))
  .filter(Boolean)
  .slice(0, options.limit);

const updates = [];
const misses = [];
let cursor = 0;

const processProduct = async (product) => {
  const found = [];
  for (const candidate of buildCandidates(product)) {
    const probe = await fetchImageProbe(candidate);
    if (probe) {
      found.push(probe);
    }
  }

  if (found.length === 0) {
    misses.push(product.code);
    return;
  }

  found.sort((a, b) => qualityScore(b.url) - qualityScore(a.url) || (b.bytes || 0) - (a.bytes || 0));
  const urls = found.map((item) => item.url);
  product.imageUrl = urls[0];
  product.imageUrls = urls;
  updates.push({
    code: product.code,
    supplierCode: product.supplierCode || "",
    selected: urls[0],
    count: urls.length,
  });
};

const worker = async () => {
  while (cursor < targets.length) {
    const index = cursor;
    cursor += 1;
    await processProduct(targets[index]);
    if ((index + 1) % 50 === 0) {
      console.log(`checked ${index + 1}/${targets.length} fixed=${updates.length}`);
    }
  }
};

await Promise.all(Array.from({ length: Math.min(options.concurrency, targets.length || 1) }, () => worker()));

writeCompactJson(catalogPath, catalog);
writeJson(reportPath, {
  fixedAt: new Date().toISOString(),
  targetCount: targets.length,
  fixedCount: updates.length,
  missCount: misses.length,
  updates,
  misses,
});

console.log(JSON.stringify({
  targetCount: targets.length,
  fixedCount: updates.length,
  missCount: misses.length,
  reportPath,
  sample: updates.slice(0, 30),
}, null, 2));
