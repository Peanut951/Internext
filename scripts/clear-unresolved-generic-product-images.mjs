import fs from "node:fs";
import path from "node:path";

const catalogPath = path.resolve("public/data/catalog-products.json");
const auditPath = path.resolve("reports/product-image-audit.json");
const reportPath = path.resolve("reports/cleared-generic-product-images.json");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const hasSupportedExtension = (value) => {
  try {
    return /\.(jpe?g|png|gif)$/i.test(new URL(value, "https://www.internext.com.au").pathname);
  } catch {
    return false;
  }
};

const isGenericOrTrackingImage = (value) =>
  /alloys(?:%20|_|-|\s)*no(?:%20|_|-|\s)*image|alloys\.jpg|product-placeholder|placeholder|coming|brand-logos|controls\/bit\.gif|\/bit\.gif(?:[?#].*)?$/i.test(
    String(value || ""),
  );

const catalog = readJson(catalogPath);
const audit = readJson(auditPath);
const targetCodes = new Set((audit.results || []).map((result) => String(result.code || result.id || "").trim()));
const updates = [];

for (const product of catalog) {
  if (!targetCodes.has(String(product.code || "").trim())) {
    continue;
  }

  const before = [product.imageUrl, ...(Array.isArray(product.imageUrls) ? product.imageUrls : [])].filter(Boolean);
  const after = before.filter((image) => hasSupportedExtension(image) && !isGenericOrTrackingImage(image));

  if (after.length > 0) {
    product.imageUrl = after[0];
    product.imageUrls = Array.from(new Set(after));
  } else {
    delete product.imageUrl;
    product.imageUrls = [];
  }

  updates.push({
    code: product.code,
    before,
    after: product.imageUrls,
  });
}

fs.writeFileSync(catalogPath, JSON.stringify(catalog));
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
  reportPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), clearedCount: updates.length, updates }, null, 2)}\n`,
);

console.log(JSON.stringify({ clearedCount: updates.length, reportPath }, null, 2));
