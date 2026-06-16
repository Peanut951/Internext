import fs from "node:fs";
import path from "node:path";

const catalogPath = path.resolve("public/data/catalog-products.json");
const reportPath = path.resolve("reports/product-image-audit.json");
const csvPath = path.resolve("reports/product-image-audit.csv");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const writeCsv = (filePath, rows) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n"),
  );
};

const isDigitalOrServiceProduct = (product) =>
  /\b(care\s*pack|cover\s*plus|coverplus|service\s*pack|support\s*pack|post\s*warranty|warranty|extended\s*warranty|hardware\s+support|onsite\s+support|subscription|renewal|licen[cs]e|software|training|install(?:ation|ations)?|instal|professional\s+service|bootcamp|managed\s+service|digital\s+download|postscript|pdf\s+upgrade|poly\+.*service)\b/i.test(
    [product.manufacturer, product.name, product.description, product.longDescription].filter(Boolean).join(" "),
  );

const getImages = (product) =>
  [product.imageUrl, ...(Array.isArray(product.imageUrls) ? product.imageUrls : [])]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

const hasSupportedExtension = (value) => {
  try {
    return /\.(jpe?g|png|gif)$/i.test(new URL(value, "https://www.internext.com.au").pathname);
  } catch {
    return false;
  }
};

const isGenericOrTrackingImage = (value) =>
  /alloys(?:%20|_|-|\s)*no(?:%20|_|-|\s)*image|alloys\.jpg|product-placeholder|placeholder|coming|brand-logos|controls\/bit\.gif|\/bit\.gif(?:[?#].*)?$/i.test(
    value,
  );

const catalog = readJson(catalogPath);
const results = [];

for (const product of catalog) {
  if (typeof product.price !== "number" || product.price <= 0 || isDigitalOrServiceProduct(product)) {
    continue;
  }

  const images = getImages(product);
  const issues = [];

  if (images.length === 0) {
    issues.push("no_image");
  }

  const usableImages = images.filter((image) => hasSupportedExtension(image) && !isGenericOrTrackingImage(image));

  if (!images.some(hasSupportedExtension)) {
    issues.push("unsupported_image_type");
  }

  if (usableImages.length === 0) {
    issues.push("generic_image");
  }

  if (issues.length > 0) {
    results.push({
      id: product.code,
      code: product.code,
      supplierCode: product.supplierCode || "",
      manufacturer: product.manufacturer || "",
      description: product.description || "",
      imageUrl: product.imageUrl || "",
      issues,
    });
  }
}

writeJson(reportPath, {
  generatedAt: new Date().toISOString(),
  catalogPath,
  resultCount: results.length,
  results,
});

writeCsv(csvPath, [
  ["code", "supplierCode", "manufacturer", "description", "imageUrl", "issues"],
  ...results.map((result) => [
    result.code,
    result.supplierCode,
    result.manufacturer,
    result.description,
    result.imageUrl,
    result.issues.join(";"),
  ]),
]);

console.log(JSON.stringify({
  resultCount: results.length,
  issueCounts: results.reduce((counts, result) => {
    for (const issue of result.issues) {
      counts[issue] = (counts[issue] || 0) + 1;
    }
    return counts;
  }, {}),
  reportPath,
  csvPath,
}, null, 2));
