import fs from "node:fs";
import path from "node:path";

const catalogPath = path.resolve("public/data/catalog-products.json");
const reportPath = path.resolve("reports/product-gallery-myithub-enrichment.json");

const args = process.argv.slice(2);
const options = {
  limit: Number.POSITIVE_INFINITY,
  concurrency: 6,
  maxImages: 8,
  includeMultiple: false,
  code: "",
};

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--limit") {
    options.limit = Number.parseInt(args[index + 1] || "", 10);
    index += 1;
  } else if (arg === "--concurrency") {
    options.concurrency = Number.parseInt(args[index + 1] || "", 10);
    index += 1;
  } else if (arg === "--max-images") {
    options.maxImages = Number.parseInt(args[index + 1] || "", 10);
    index += 1;
  } else if (arg === "--include-multiple") {
    options.includeMultiple = true;
  } else if (arg === "--code") {
    options.code = String(args[index + 1] || "").trim().toLowerCase();
    index += 1;
  }
}

if (!Number.isFinite(options.limit) || options.limit <= 0) options.limit = Number.POSITIVE_INFINITY;
if (!Number.isFinite(options.concurrency) || options.concurrency <= 0) options.concurrency = 6;
if (!Number.isFinite(options.maxImages) || options.maxImages <= 1) options.maxImages = 8;

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

const decodeHtml = (value) =>
  String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const stripSkuPrefix = (value) =>
  String(value || "")
    .trim()
    .replace(/^[A-Z]{1,3}(?=[A-Z]*\d)/, "");

const getMatchTokens = (product) =>
  Array.from(new Set([
    product.code,
    product.supplierCode,
    stripSkuPrefix(product.code),
    stripSkuPrefix(product.supplierCode),
  ].map(normalize).filter((token) => token.length >= 4 && !/^\d{8,14}$/.test(token))));

const hasProductToken = (value, product) => {
  const text = normalize(value);
  return getMatchTokens(product).some((token) => text.includes(token));
};

const fetchText = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
};

const getBingImageResults = async (product) => {
  const code = product.supplierCode || product.code;
  const query = `site:myithub.com.au ${code} ${product.manufacturer || ""} product image`;
  const html = await fetchText(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1`);
  const results = [];

  for (const match of html.matchAll(/\bm=["']([^"']+)["']/gi)) {
    try {
      const metadata = JSON.parse(decodeHtml(match[1]));
      if (!metadata.murl || !metadata.purl) continue;
      const pageUrl = new URL(metadata.purl);
      if (!/(^|\.)myithub\.com\.au$/i.test(pageUrl.hostname)) continue;
      const context = `${metadata.t || ""} ${metadata.desc || ""} ${metadata.purl || ""} ${metadata.murl || ""}`;
      if (!hasProductToken(context, product)) continue;
      results.push({
        imageUrl: metadata.murl,
        pageUrl: metadata.purl,
        title: metadata.t || "",
      });
    } catch {
      // Ignore malformed image metadata.
    }
  }

  return results.slice(0, options.maxImages * 2);
};

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

const getWebpSize = (buffer) => {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3), format: "webp" };
  }
  if (chunk === "VP8 ") {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff, format: "webp" };
  }
  return null;
};

const getImageSize = (buffer) => getPngSize(buffer) || getJpegSize(buffer) || getWebpSize(buffer);

const fetchImageMeta = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") || "";
    if (!/^image\//i.test(contentType)) throw new Error(`Not image: ${contentType}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const size = getImageSize(buffer);
    if (!size) throw new Error("Unknown image dimensions");
    return { url, bytes: buffer.length, ...size };
  } finally {
    clearTimeout(timeout);
  }
};

const sourceImages = async (product) => {
  const valid = [];
  for (const result of await getBingImageResults(product)) {
    try {
      const meta = await fetchImageMeta(result.imageUrl);
      const bigEnough = Math.min(meta.width, meta.height) >= 450 || meta.width * meta.height >= 240_000;
      if (bigEnough) {
        valid.push({ ...meta, pageUrl: result.pageUrl });
      }
    } catch {
      // Ignore images that are no longer reachable or too small to inspect.
    }
  }

  valid.sort((a, b) => b.width * b.height - a.width * a.height || b.bytes - a.bytes);
  return valid.slice(0, options.maxImages).map((item) => item.url);
};

const catalog = readJson(catalogPath, []);
const report = readJson(reportPath, { updates: [], misses: [], processedCodes: [] });
const processed = new Set(report.processedCodes || []);
const targets = catalog
  .filter((product) => options.includeMultiple || !Array.isArray(product.imageUrls) || product.imageUrls.length <= 1)
  .filter((product) => !processed.has(product.code))
  .filter((product) => !options.code || String(product.code || "").toLowerCase() === options.code)
  .slice(0, Math.min(options.limit, catalog.length));

let cursor = 0;
let fixed = 0;

const persist = () => {
  report.processedCodes = Array.from(processed);
  report.updatedAt = new Date().toISOString();
  writeJson(catalogPath, catalog, false);
  writeJson(reportPath, report);
};

const worker = async () => {
  while (cursor < targets.length) {
    const current = cursor;
    cursor += 1;
    const product = targets[current];

    try {
      const sourced = await sourceImages(product);
      const existing = [product.imageUrl, ...(Array.isArray(product.imageUrls) ? product.imageUrls : [])].filter(Boolean);
      const merged = Array.from(new Set([...sourced, ...existing])).slice(0, options.maxImages);
      if (merged.length > existing.length && merged.length > 1) {
        product.imageUrl = merged[0];
        product.imageUrls = merged;
        fixed += 1;
        report.updates.push({
          code: product.code,
          manufacturer: product.manufacturer || "",
          supplierCode: product.supplierCode || "",
          beforeCount: existing.length,
          afterCount: merged.length,
          imageUrls: merged,
        });
      } else {
        report.misses.push(product.code);
      }
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
