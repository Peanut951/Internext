import fs from "node:fs";
import path from "node:path";

const catalogPath = path.resolve("public/data/catalog-products.json");
const reportPath = path.resolve("reports/product-image-gallery-cleanup.json");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const writeJson = (filePath, value, pretty = true) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, pretty ? 2 : 0));
};

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const comparableUrl = (value) => {
  try {
    const parsed = new URL(value);
    return normalize(decodeURIComponent(parsed.pathname));
  } catch {
    return normalize(value);
  }
};

const productTokens = (product) =>
  [product.code, product.supplierCode]
    .map(normalize)
    .filter((token) => token.length >= 4 && !/^\d{8,14}$/.test(token));

const isExactImage = (url, product) => {
  const text = comparableUrl(url);
  return productTokens(product).some((token) => text.includes(token));
};

const imageScore = (url) => {
  if (/\/ProductImages\/Original\//i.test(url)) return 5;
  if (/\/ProductImages\/Large\//i.test(url)) return 4;
  if (/\/ProductImages\/Medium\//i.test(url)) return 3;
  if (/\/ProductImages\/Small\//i.test(url)) return 2;
  return 1;
};

const catalog = readJson(catalogPath);
const updates = [];

for (const product of catalog) {
  const before = [product.imageUrl, ...(Array.isArray(product.imageUrls) ? product.imageUrls : [])]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim());
  const uniqueBefore = Array.from(new Set(before));

  if (uniqueBefore.length === 0) continue;

  const exact = uniqueBefore.filter((url) => isExactImage(url, product));
  const replacement = exact.length > 0 ? exact : uniqueBefore.slice(0, 1);
  replacement.sort((a, b) => imageScore(b) - imageScore(a));

  const changed =
    product.imageUrl !== replacement[0] ||
    JSON.stringify(product.imageUrls || []) !== JSON.stringify(replacement);

  if (!changed) continue;

  product.imageUrl = replacement[0];
  product.imageUrls = replacement;
  updates.push({
    code: product.code,
    supplierCode: product.supplierCode || "",
    beforeCount: uniqueBefore.length,
    afterCount: replacement.length,
    usedExactMatch: exact.length > 0,
    selected: replacement[0],
  });
}

writeJson(catalogPath, catalog, false);
writeJson(reportPath, {
  cleanedAt: new Date().toISOString(),
  updatedCount: updates.length,
  exactMatchUpdates: updates.filter((item) => item.usedExactMatch).length,
  primaryOnlyUpdates: updates.filter((item) => !item.usedExactMatch).length,
  updates,
});

console.log(JSON.stringify({
  updatedCount: updates.length,
  exactMatchUpdates: updates.filter((item) => item.usedExactMatch).length,
  primaryOnlyUpdates: updates.filter((item) => !item.usedExactMatch).length,
  reportPath,
  sample: updates.slice(0, 25),
}, null, 2));
