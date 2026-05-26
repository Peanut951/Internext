import fs from "node:fs";
import path from "node:path";

const catalogPath = path.resolve("public/data/catalog-products.json");
const reportPath = path.resolve("reports/product-gallery-alloys-variant-enrichment.json");

const args = process.argv.slice(2);
const options = {
  limit: Number.POSITIVE_INFINITY,
  concurrency: 12,
  maxIndex: 12,
};

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--limit") {
    options.limit = Number.parseInt(args[index + 1] || "", 10);
    index += 1;
  } else if (arg === "--concurrency") {
    options.concurrency = Number.parseInt(args[index + 1] || "", 10);
    index += 1;
  } else if (arg === "--max-index") {
    options.maxIndex = Number.parseInt(args[index + 1] || "", 10);
    index += 1;
  }
}

if (!Number.isFinite(options.limit) || options.limit <= 0) options.limit = Number.POSITIVE_INFINITY;
if (!Number.isFinite(options.concurrency) || options.concurrency <= 0) options.concurrency = 12;
if (!Number.isFinite(options.maxIndex) || options.maxIndex <= 0) options.maxIndex = 12;

const readJson = (filePath, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
};

const writeJson = (filePath, value, pretty = true) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, pretty ? 2 : 0));
};

const normalizeFilenameToken = (value) =>
  String(value || "")
    .trim()
    .replace(/^[A-Z]{1,3}(?=[A-Z]*\d)/, "")
    .replace(/[^A-Za-z0-9._-]/g, "");

const directories = [
  "https://www.alloys.com.au/Images/ProductImages/Original",
  "https://www.alloys.com.au/Images/ProductImages/Large",
  "https://www.alloys.com.au/Images/ProductImages",
  "https://www.alloys.com.au/images/ProductImages",
];

const extensions = [".jpg", ".JPG", ".jpeg", ".JPEG", ".png", ".PNG", ".webp"];

const tokenVariants = (token) => {
  const base = String(token || "").trim();
  const variants = [base];
  for (let index = 1; index <= options.maxIndex; index += 1) {
    variants.push(`${base}_${index}`, `${base}-${index}`, `${base} ${index}`, `${base}_${String(index).padStart(2, "0")}`);
  }
  return variants.filter(Boolean);
};

const getTokens = (product) =>
  Array.from(new Set([
    product.code,
    product.supplierCode,
    normalizeFilenameToken(product.code),
    normalizeFilenameToken(product.supplierCode),
  ].filter((value) => typeof value === "string" && value.trim().length >= 4 && !/^\d{8,14}$/.test(value.trim()))));

const getPngSize = (buffer) => {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: "png" };
};

const getJpegSize = (buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = buffer.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), format: "jpeg" };
    }
    offset += 2 + length;
  }
  return null;
};

const getImageSize = (buffer) => getPngSize(buffer) || getJpegSize(buffer);

const fetchImageMeta = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    if (!/^image\//i.test(contentType)) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const size = getImageSize(buffer);
    if (!size) return null;
    if (buffer.length < 8_000) return null;
    return { url, bytes: buffer.length, ...size };
  } finally {
    clearTimeout(timeout);
  }
};

const qualityScore = (url) => {
  if (/\/ProductImages\/Original\//i.test(url)) return 4;
  if (/\/ProductImages\/Large\//i.test(url)) return 3;
  return 2;
};

const buildCandidates = (product) => {
  const urls = [];
  for (const token of getTokens(product)) {
    for (const variant of tokenVariants(token)) {
      for (const directory of directories) {
        for (const extension of extensions) {
          urls.push(`${directory}/${encodeURIComponent(variant)}${extension}`);
        }
      }
    }
  }
  return Array.from(new Set(urls));
};

const catalog = readJson(catalogPath, []);
const report = readJson(reportPath, { updates: [], misses: [], processedCodes: [] });
const processed = new Set(report.processedCodes || []);
const targets = catalog
  .filter((product) => !Array.isArray(product.imageUrls) || product.imageUrls.length <= 1)
  .filter((product) => !processed.has(product.code))
  .slice(0, Math.min(options.limit, catalog.length));

let cursor = 0;
let fixed = 0;

const persist = () => {
  report.processedCodes = Array.from(processed);
  report.updatedAt = new Date().toISOString();
  writeJson(catalogPath, catalog, false);
  writeJson(reportPath, report);
};

const processProduct = async (product) => {
  const existing = [product.imageUrl, ...(Array.isArray(product.imageUrls) ? product.imageUrls : [])].filter(Boolean);
  const found = [];
  for (const url of buildCandidates(product)) {
    const meta = await fetchImageMeta(url);
    if (meta) found.push(meta);
  }

  found.sort((a, b) => qualityScore(b.url) - qualityScore(a.url) || b.width * b.height - a.width * a.height || b.bytes - a.bytes);
  const merged = Array.from(new Set([...found.map((item) => item.url), ...existing])).slice(0, 8);
  if (merged.length > existing.length && merged.length > 1) {
    product.imageUrl = merged[0];
    product.imageUrls = merged;
    fixed += 1;
    report.updates.push({
      code: product.code,
      supplierCode: product.supplierCode || "",
      manufacturer: product.manufacturer || "",
      beforeCount: existing.length,
      afterCount: merged.length,
      imageUrls: merged,
    });
  } else {
    report.misses.push(product.code);
  }
};

const worker = async () => {
  while (cursor < targets.length) {
    const current = cursor;
    cursor += 1;
    const product = targets[current];
    try {
      await processProduct(product);
    } catch {
      report.misses.push(product.code);
    } finally {
      processed.add(product.code);
      if ((current + 1) % 25 === 0) {
        persist();
        console.log(`checked ${current + 1}/${targets.length} fixed=${fixed}`);
      }
    }
  }
};

await Promise.all(Array.from({ length: Math.min(options.concurrency, targets.length || 1) }, () => worker()));
persist();

console.log(JSON.stringify({
  checked: targets.length,
  fixed,
  totalUpdates: report.updates.length,
  totalMisses: report.misses.length,
  reportPath,
}, null, 2));
