import fs from "node:fs";
import path from "node:path";

const catalogPath = path.resolve("public/data/catalog-products.json");
const reportPath = path.resolve("reports/product-image-audit.json");
const csvPath = path.resolve("reports/product-image-audit.csv");

const args = process.argv.slice(2);
const options = {
  concurrency: 8,
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
  options.concurrency = 8;
}
if (!Number.isFinite(options.limit) || options.limit <= 0) {
  options.limit = Number.POSITIVE_INFINITY;
}

const INVALID_IMAGE_PATTERNS = [/\/controls\/bit\.gif(?:\?.*)?$/i, /\/bit\.gif(?:\?.*)?$/i];

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
};

const writeCsv = (filePath, rows) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const escapeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  fs.writeFileSync(
    filePath,
    rows.map((row) => row.map(escapeCell).join(",")).join("\n"),
  );
};

const sanitizeProductImageUrl = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || INVALID_IMAGE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return null;
  }

  try {
    return encodeURI(trimmed);
  } catch {
    return trimmed;
  }
};

const normalizeImageToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getImageComparableText = (value) => {
  try {
    const url = new URL(value);
    return normalizeImageToken(decodeURIComponent(url.pathname));
  } catch {
    return normalizeImageToken(value);
  }
};

const isExactProductImage = (url, product) => {
  const tokens = [product.code, product.supplierCode]
    .map((value) => normalizeImageToken(value))
    .filter((value) => value.length >= 3);

  if (tokens.length === 0) {
    return false;
  }

  const comparable = getImageComparableText(url);
  return tokens.some((token) => comparable.includes(token));
};

const getHigherResolutionVariants = (url) =>
  Array.from(new Set([
    url.replace(/\/Images\/ProductImages\/Small\//i, "/Images/ProductImages/Original/"),
    url.replace(/\/Images\/ProductImages\/Small\//i, "/Images/ProductImages/Large/"),
    url.replace(/\/images\/ProductImages\/Small\//i, "/images/ProductImages/Original/"),
    url.replace(/\/images\/ProductImages\/Small\//i, "/images/ProductImages/Large/"),
    url,
  ]));

const getImageQualityScore = (url) => {
  if (/\/ProductImages\/Original\//i.test(url)) return 4;
  if (/\/ProductImages\/Large\//i.test(url)) return 3;
  if (/\/ProductImages\/Medium\//i.test(url)) return 2;
  if (/\/ProductImages\/Small\//i.test(url)) return 1;
  return 2.5;
};

const sortByImageQuality = (images) =>
  [...images].sort((a, b) => getImageQualityScore(b) - getImageQualityScore(a));

const getProductImageCandidates = (product) => {
  const sanitized = [...(product.imageUrls ?? []), product.imageUrl ?? ""]
    .map((value) => sanitizeProductImageUrl(value))
    .filter(Boolean);
  const uniqueImages = Array.from(new Set(sanitized.flatMap((value) => getHigherResolutionVariants(value))));
  const exactMatches = uniqueImages.filter((value) => isExactProductImage(value, product));

  if (exactMatches.length > 0) {
    return sortByImageQuality(exactMatches);
  }

  const primary = sanitizeProductImageUrl(product.imageUrl);
  return primary ? sortByImageQuality(getHigherResolutionVariants(primary)) : uniqueImages.slice(0, 1);
};

const readUint16 = (buffer, offset, littleEndian = false) =>
  littleEndian ? buffer.readUInt16LE(offset) : buffer.readUInt16BE(offset);

const readUint32 = (buffer, offset, littleEndian = false) =>
  littleEndian ? buffer.readUInt32LE(offset) : buffer.readUInt32BE(offset);

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
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;

    const length = buffer.readUInt16BE(offset + 2);
    if (
      [
        0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
      ].includes(marker)
    ) {
      return {
        width: buffer.readUInt16BE(offset + 7),
        height: buffer.readUInt16BE(offset + 5),
        format: "jpeg",
      };
    }

    offset += 2 + length;
  }

  return null;
};

const getWebpSize = (buffer) => {
  if (
    buffer.length < 30 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return null;
  }

  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
      format: "webp",
    };
  }
  if (chunk === "VP8 ") {
    return {
      width: readUint16(buffer, 26, true) & 0x3fff,
      height: readUint16(buffer, 28, true) & 0x3fff,
      format: "webp",
    };
  }
  if (chunk === "VP8L") {
    const bits = readUint32(buffer, 21, true);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
      format: "webp",
    };
  }

  return null;
};

const getImageSize = (buffer) =>
  getPngSize(buffer) || getJpegSize(buffer) || getGifSize(buffer) || getWebpSize(buffer);

const fetchImageMeta = async (url, attempt = 1) => {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    if (attempt < 2 && [408, 429, 500, 502, 503, 504].includes(response.status)) {
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      return fetchImageMeta(url, attempt + 1);
    }
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const buffer = Buffer.from(await response.arrayBuffer());
  const dimensions = getImageSize(buffer);

  return {
    url,
    bytes: buffer.length,
    contentType,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    format: dimensions?.format ?? contentType.split("/").pop() ?? "unknown",
  };
};

const getIssueList = (product, candidates, meta, error) => {
  const issues = [];
  const selectedUrl = candidates[0] || "";

  if (error) issues.push("broken_image");
  if (candidates.length === 0) issues.push("no_image");
  if (selectedUrl && !isExactProductImage(selectedUrl, product)) issues.push("not_exact_code_match");
  if (/\/ProductImages\/Small\//i.test(selectedUrl)) issues.push("small_path_selected");
  if (meta?.width && meta?.height) {
    if (Math.min(meta.width, meta.height) < 500) issues.push("low_resolution");
    if (meta.width * meta.height < 300_000) issues.push("low_pixel_count");
  } else if (!error) {
    issues.push("unknown_dimensions");
  }
  if (meta?.bytes && meta.bytes < 20_000) issues.push("very_small_file");

  return issues;
};

const products = readJson(catalogPath).slice(0, options.limit);
const results = [];
let cursor = 0;

const auditProduct = async (product) => {
  const candidates = getProductImageCandidates(product);
  let meta = null;
  let error = "";

  for (const candidate of candidates) {
    try {
      meta = await fetchImageMeta(candidate);
      break;
    } catch (candidateError) {
      error = String(candidateError?.message || candidateError);
    }
  }

  const issues = getIssueList(product, candidates, meta, meta ? "" : error);
  return {
    code: product.code,
    supplierCode: product.supplierCode || "",
    manufacturer: product.manufacturer || "",
    description: product.description || "",
    selectedUrl: meta?.url || candidates[0] || "",
    candidateCount: candidates.length,
    width: meta?.width ?? null,
    height: meta?.height ?? null,
    bytes: meta?.bytes ?? null,
    format: meta?.format ?? "",
    issues,
    error: meta ? "" : error,
  };
};

const worker = async () => {
  while (cursor < products.length) {
    const current = cursor;
    cursor += 1;
    const product = products[current];
    const result = await auditProduct(product);
    results[current] = result;

    if ((current + 1) % 100 === 0) {
      console.log(`audited ${current + 1}/${products.length}`);
    }
  }
};

await Promise.all(Array.from({ length: Math.min(options.concurrency, products.length || 1) }, () => worker()));

const issueCounts = results.reduce((counts, result) => {
  for (const issue of result.issues) {
    counts[issue] = (counts[issue] || 0) + 1;
  }
  return counts;
}, {});

const report = {
  auditedAt: new Date().toISOString(),
  totalProducts: products.length,
  issueCounts,
  cleanCount: results.filter((result) => result.issues.length === 0).length,
  flaggedCount: results.filter((result) => result.issues.length > 0).length,
  results,
};

writeJson(reportPath, report);
writeCsv(csvPath, [
  [
    "code",
    "supplierCode",
    "manufacturer",
    "description",
    "selectedUrl",
    "width",
    "height",
    "bytes",
    "format",
    "issues",
    "error",
  ],
  ...results.map((result) => [
    result.code,
    result.supplierCode,
    result.manufacturer,
    result.description,
    result.selectedUrl,
    result.width,
    result.height,
    result.bytes,
    result.format,
    result.issues.join(";"),
    result.error,
  ]),
]);

console.log(JSON.stringify({
  totalProducts: report.totalProducts,
  cleanCount: report.cleanCount,
  flaggedCount: report.flaggedCount,
  issueCounts: report.issueCounts,
  reportPath,
  csvPath,
}, null, 2));
