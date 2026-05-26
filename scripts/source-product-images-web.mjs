import fs from "node:fs";
import path from "node:path";

const catalogPath = path.resolve("public/data/catalog-products.json");
const auditPath = path.resolve("reports/product-image-audit.json");
const statePath = path.resolve("reports/product-image-web-source-state.json");

const args = process.argv.slice(2);
const options = {
  limit: Number.POSITIVE_INFINITY,
  concurrency: 4,
  maxResults: 5,
  includeProcessed: false,
  manufacturer: "",
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
  } else if (arg === "--max-results") {
    options.maxResults = Number.parseInt(args[index + 1] || "", 10);
    index += 1;
  } else if (arg === "--include-processed") {
    options.includeProcessed = true;
  } else if (arg === "--manufacturer") {
    options.manufacturer = String(args[index + 1] || "").trim().toLowerCase();
    index += 1;
  } else if (arg === "--code") {
    options.code = String(args[index + 1] || "").trim().toLowerCase();
    index += 1;
  }
}

if (!Number.isFinite(options.limit) || options.limit <= 0) options.limit = Number.POSITIVE_INFINITY;
if (!Number.isFinite(options.concurrency) || options.concurrency <= 0) options.concurrency = 4;
if (!Number.isFinite(options.maxResults) || options.maxResults <= 0) options.maxResults = 5;

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const decodeHtml = (value) =>
  String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const fetchText = async (url, timeoutMs = 14000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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

const getSearchResults = async (query) => {
  const urls = [];

  try {
    const html = await fetchText(`https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
    for (const match of html.matchAll(/class="result__a"[^>]+href="([^"]+)"/gi)) {
      const href = decodeHtml(match[1]);
      try {
        const parsed = new URL(href, "https://duckduckgo.com");
        const redirect = parsed.searchParams.get("uddg");
        urls.push(redirect || parsed.href);
      } catch {
        // Ignore malformed search result URLs.
      }
    }
  } catch {
    // Search providers are best effort.
  }

  try {
    const html = await fetchText(`https://www.bing.com/search?q=${encodeURIComponent(query)}`);
    for (const match of html.matchAll(/<h2[^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>/gi)) {
      const href = decodeHtml(match[1]);
      try {
        const parsed = new URL(href, "https://www.bing.com");
        if (/^https?:/i.test(parsed.href) && !/bing\.com/i.test(parsed.hostname)) {
          urls.push(parsed.href);
        }
      } catch {
        // Ignore malformed search result URLs.
      }
    }
  } catch {
    // Search providers are best effort.
  }

  return Array.from(new Set(urls)).slice(0, options.maxResults);
};

const collectImageUrls = (value, found = []) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      /^https?:\/\//i.test(trimmed) &&
      (/\.(?:jpe?g|png|webp|gif)(?:[?#].*)?$/i.test(trimmed) || /(?:image|img|gallery|photo|picture|pic)/i.test(trimmed))
    ) {
      found.push(trimmed);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) collectImageUrls(item, found);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectImageUrls(item, found);
  }

  return found;
};

const getIcecatImages = async (product) => {
  const queries = [];
  const brand = String(product.manufacturer || "").trim();
  const codes = [product.supplierCode, product.code].map((value) => String(value || "").trim()).filter(Boolean);

  if (brand) {
    for (const code of codes) {
      queries.push(`brand=${encodeURIComponent(brand)}&mpn=${encodeURIComponent(code)}`);
    }
  }

  for (const code of codes) {
    if (/^\d{8,14}$/.test(code)) {
      queries.push(`ean_upc=${encodeURIComponent(code)}`);
    }
  }

  const images = [];
  for (const query of Array.from(new Set(queries))) {
    const url = `https://live.icecat.biz/api/?shopname=openIcecat-live&lang=en&content=all&${query}`;
    try {
      const text = await fetchText(url);
      const json = JSON.parse(text);
      if (/product\s+not\s+found|no\s+product|error/i.test(text) && collectImageUrls(json).length === 0) continue;
      for (const imageUrl of collectImageUrls(json)) {
        images.push({ imageUrl, pageUrl: url });
      }
    } catch {
      // Ignore products that are not available through Open Icecat.
    }
  }

  return images;
};

const getImageSearchResults = async (query) => {
  const html = await fetchText(`https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=1`);
  const results = [];

  for (const match of html.matchAll(/\bm=["']([^"']+)["']/gi)) {
    try {
      const item = JSON.parse(decodeHtml(match[1]));
      if (item.murl) {
        results.push({
          imageUrl: item.murl,
          pageUrl: item.purl || "",
          title: item.t || "",
          description: item.desc || "",
        });
      }
    } catch {
      // Ignore malformed image-result metadata.
    }
  }

  return results.slice(0, options.maxResults * 3);
};

const pageMatchesProduct = (html, product) => {
  const normalized = normalizeToken(html);
  const codeMatches = [product.code, product.supplierCode]
    .map(normalizeToken)
    .filter((value) => value.length >= 4)
    .some((token) => normalized.includes(token));
  const brand = normalizeToken(product.manufacturer);
  const brandMatches = !brand || normalized.includes(brand);
  return codeMatches && brandMatches;
};

const textMatchesProduct = (value, product) => {
  const normalized = normalizeToken(value);
  const codeMatches = [product.code, product.supplierCode]
    .map(normalizeToken)
    .filter((token) => token.length >= 4)
    .some((token) => normalized.includes(token));
  const brand = normalizeToken(product.manufacturer);
  return codeMatches && (!brand || normalized.includes(brand));
};

const resolveUrl = (value, pageUrl) => {
  const cleaned = decodeHtml(value).trim();
  if (!cleaned || /^data:/i.test(cleaned)) return null;
  try {
    return new URL(cleaned, pageUrl).href;
  } catch {
    return null;
  }
};

const extractPageImages = (html, pageUrl) => {
  const images = [];
  const metaPatterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|image)["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image|image)["'][^>]*>/gi,
  ];

  for (const pattern of metaPatterns) {
    for (const match of html.matchAll(pattern)) {
      const url = resolveUrl(match[1], pageUrl);
      if (url) images.push(url);
    }
  }

  for (const match of html.matchAll(/"image"\s*:\s*(?:"([^"]+)"|\[([^\]]+)\])/gi)) {
    const single = match[1];
    if (single) {
      const url = resolveUrl(single, pageUrl);
      if (url) images.push(url);
    }

    const list = match[2];
    if (list) {
      for (const item of list.matchAll(/"([^"]+)"/g)) {
        const url = resolveUrl(item[1], pageUrl);
        if (url) images.push(url);
      }
    }
  }

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const attrs = [];
    for (const attrName of ["src", "data-src", "data-original", "data-large", "data-zoom-image"]) {
      const attrMatch = tag.match(new RegExp(`${attrName}=["']([^"']+)["']`, "i"));
      if (attrMatch) attrs.push(attrMatch[1]);
    }

    const srcsetMatch = tag.match(/\bsrcset=["']([^"']+)["']/i);
    if (srcsetMatch) {
      for (const part of srcsetMatch[1].split(",")) {
        const candidate = part.trim().split(/\s+/)[0];
        if (candidate) attrs.push(candidate);
      }
    }

    for (const attr of attrs) {
      const url = resolveUrl(attr, pageUrl);
      if (url) images.push(url);
    }
  }

  return Array.from(new Set(images)).filter((url) => !/(logo|sprite|icon|placeholder|blank|loader)/i.test(url));
};

const getPngSize = (buffer) => {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: "png" };
};

const getGifSize = (buffer) => {
  const signature = buffer.toString("ascii", 0, 6);
  if (buffer.length < 10 || (signature !== "GIF87a" && signature !== "GIF89a")) return null;
  return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8), format: "gif" };
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
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3), format: "webp" };
  }
  return null;
};

const getImageSize = (buffer) => getPngSize(buffer) || getJpegSize(buffer) || getGifSize(buffer) || getWebpSize(buffer);

const fetchImageMeta = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 14000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
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

const candidateScore = (candidate, product) => {
  const pixels = candidate.width * candidate.height;
  const normalizedUrl = normalizeToken(candidate.url);
  const normalizedPage = normalizeToken(candidate.pageUrl);
  const codes = [product.code, product.supplierCode].map(normalizeToken).filter((token) => token.length >= 4);
  const brand = normalizeToken(product.manufacturer);

  let score = pixels + candidate.bytes / 10;
  if (codes.some((code) => normalizedUrl.includes(code))) score += 10_000_000;
  if (brand && normalizedUrl.includes(brand)) score += 2_000_000;
  if (codes.some((code) => normalizedPage.includes(code))) score += 1_000_000;
  if (brand && normalizedPage.includes(brand)) score += 250_000;
  return score;
};

const addCandidate = async (candidates, imageUrl, pageUrl, product) => {
  const meta = await fetchImageMeta(imageUrl);
  const bigEnough = Math.min(meta.width, meta.height) >= 500 || meta.width * meta.height >= 300_000;
  if (bigEnough) candidates.push({ ...meta, pageUrl });
};

const sourceProduct = async (product) => {
  const query = `${product.manufacturer} ${product.supplierCode || product.code} ${product.code} product image`;
  const resultUrls = await getSearchResults(query);
  const candidates = [];

  for (const result of await getIcecatImages(product)) {
    try {
      await addCandidate(candidates, result.imageUrl, result.pageUrl, product);
    } catch {
      // Ignore bad Icecat candidate images.
    }
  }

  for (const pageUrl of resultUrls) {
    try {
      const html = await fetchText(pageUrl);
      if (!pageMatchesProduct(html, product)) continue;
      for (const imageUrl of extractPageImages(html, pageUrl).slice(0, 20)) {
        try {
          await addCandidate(candidates, imageUrl, pageUrl, product);
        } catch {
          // Ignore bad candidate images.
        }
      }
    } catch {
      // Ignore unreachable candidate pages.
    }
  }

  try {
    for (const result of await getImageSearchResults(query)) {
      const context = `${result.title} ${result.description} ${result.pageUrl} ${result.imageUrl}`;
      if (!textMatchesProduct(context, product)) continue;
      try {
        await addCandidate(candidates, result.imageUrl, result.pageUrl, product);
      } catch {
        // Ignore bad image-result candidates.
      }
    }
  } catch {
    // Image search is a best-effort fallback.
  }

  candidates.sort((a, b) => candidateScore(b, product) - candidateScore(a, product));
  return candidates[0] || null;
};

const catalog = readJson(catalogPath, []);
const audit = readJson(auditPath, { results: [] });
const state = readJson(statePath, { processedCodes: [], updates: [], misses: [] });
const processed = new Set(state.processedCodes || []);
const productByCode = new Map(catalog.map((product) => [product.code, product]));
const targets = audit.results
  .filter((result) => result.issues.length > 0 && (options.includeProcessed || !processed.has(result.code)))
  .sort((a, b) => b.issues.length - a.issues.length)
  .map((result) => productByCode.get(result.code))
  .filter(Boolean)
  .filter((product) => !options.manufacturer || String(product.manufacturer || "").toLowerCase() === options.manufacturer)
  .filter((product) => !options.code || String(product.code || "").toLowerCase() === options.code)
  .slice(0, Math.min(options.limit, catalog.length));

let cursor = 0;
let fixed = 0;

const persist = () => {
  writeJson(catalogPath, catalog, false);
  writeJson(statePath, state);
};

const worker = async () => {
  while (cursor < targets.length) {
    const index = cursor;
    cursor += 1;
    const product = targets[index];

    try {
      const sourced = await sourceProduct(product);
      if (sourced) {
        const existing = [product.imageUrl, ...(Array.isArray(product.imageUrls) ? product.imageUrls : [])].filter(Boolean);
        product.imageUrl = sourced.url;
        product.imageUrls = Array.from(new Set([sourced.url, ...existing]));
        fixed += 1;
        state.updates.push({
          code: product.code,
          supplierCode: product.supplierCode || "",
          manufacturer: product.manufacturer || "",
          imageUrl: sourced.url,
          width: sourced.width,
          height: sourced.height,
          pageUrl: sourced.pageUrl,
        });
      } else {
        state.misses.push(product.code);
      }
    } catch (error) {
      state.misses.push(product.code);
    } finally {
      processed.add(product.code);
      state.processedCodes = Array.from(processed);
      if ((index + 1) % 10 === 0) {
        persist();
        console.log(`checked ${index + 1}/${targets.length} fixed=${fixed}`);
        await sleep(500);
      }
    }
  }
};

await Promise.all(Array.from({ length: Math.min(options.concurrency, targets.length || 1) }, () => worker()));
persist();

console.log(JSON.stringify({
  checked: targets.length,
  fixed,
  totalUpdates: state.updates.length,
  totalMisses: state.misses.length,
  statePath,
}, null, 2));
