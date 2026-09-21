import fs from "node:fs";
import path from "node:path";
import { isTangibleCatalogProduct } from "./lib/product-classification.mjs";

const CUSTOMER_MARKUP_RATE = 0.2;
const GST_RATE = 0.1;
const MIN_RRP_MULTIPLIER = 1.1;
const DEFAULT_OUTPUT_PATH = path.resolve("public", "data", "4c-products.json");

const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : "";
const outputPath = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_OUTPUT_PATH;

if (!inputPath || !fs.existsSync(inputPath)) {
  throw new Error("Usage: node scripts/import-4c-catalog.mjs <4C CSV path> [output JSON path]");
}

const parseCsvRecords = (text) => {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (character === "," && !quoted) {
      record.push(field);
      field = "";
      continue;
    }
    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      record.push(field);
      if (record.some((value) => value !== "")) records.push(record);
      record = [];
      field = "";
      continue;
    }
    field += character;
  }

  if (field || record.length > 0) {
    record.push(field);
    if (record.some((value) => value !== "")) records.push(record);
  }
  return records;
};

const normalizeHeader = (value) => String(value || "").replace(/^\uFEFF/, "").trim();
const parseNumber = (value) => {
  const normalized = String(value ?? "").replace(/[^0-9.-]/g, "").trim();
  if (!normalized || normalized === "-" || normalized === "." || normalized === "-.") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};
const roundMoney = (value) => Math.round(value * 100) / 100;
const formatAud = (value) => value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });
const decodeEntities = (value) => String(value || "")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;|&#34;/gi, '"')
  .replace(/&apos;|&#39;/gi, "'")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">");
const cleanText = (value) => decodeEntities(value)
  .replace(/#html-body\s*\[[^\]]+\]\s*\{[^}]*\}/gi, " ")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]*>/g, " ")
  .replace(/\u00c2(?=\s|$)/g, "")
  .replace(/\s+/g, " ")
  .trim();
const createProductCode = (sku) => {
  const safeSku = sku
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "");
  return safeSku ? `4C-${safeSku}` : "";
};

const sourceText = fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
const [rawHeaders = [], ...records] = parseCsvRecords(sourceText);
const headers = rawHeaders.map(normalizeHeader);
const sourceUpdatedAt = fs.statSync(inputPath).mtime.toISOString();
const products = [];
const skipped = [];
const seenCodes = new Set();

for (const record of records) {
  const row = Object.fromEntries(headers.map((header, index) => [header, record[index] || ""]));
  const sku = cleanText(row.SKU);
  const productName = cleanText(row.Product_Name);
  const costExGst = parseNumber(row.Price_Ex);
  const code = createProductCode(sku);

  if (!sku || !productName || costExGst === null || costExGst <= 0 || !code) {
    skipped.push({ sku, productName, reason: costExGst === null || costExGst <= 0 ? "invalid_price" : "invalid_identity" });
    continue;
  }
  if (seenCodes.has(code.toLowerCase())) {
    throw new Error(`Duplicate generated 4C product code: ${code}`);
  }
  seenCodes.add(code.toLowerCase());

  const publicPrice = roundMoney(costExGst * (1 + CUSTOMER_MARKUP_RATE) * (1 + GST_RATE));
  const resellerPrice = roundMoney(costExGst * (1 + CUSTOMER_MARKUP_RATE));
  const suppliedRrpInc = parseNumber(row.RRP_Inc);
  const minimumRrp = roundMoney(publicPrice * MIN_RRP_MULTIPLIER);
  const rrp = suppliedRrpInc !== null && suppliedRrpInc >= minimumRrp
    ? roundMoney(suppliedRrpInc)
    : minimumRrp;
  const stockValue = parseNumber(row.Stock);
  const stockQuantity = Math.max(0, Math.floor(stockValue ?? 0));
  const manufacturer = cleanText(row.Manufacturer) || "4Cabling";
  const category = cleanText(row.Category);
  const longDescription = cleanText(row.Product_Description);
  const imageUrl = String(row.Image_URL || "").trim();
  const validImageUrl = /^https:\/\//i.test(imageUrl) ? imageUrl : "";

  const product = {
    code,
    supplierCode: sku,
    supplierSource: "4cabling",
    manufacturer,
    name: productName,
    description: productName,
    longDescription: longDescription || undefined,
    category: category || undefined,
    imageUrl: validImageUrl || undefined,
    imageUrls: validImageUrl ? [validImageUrl] : [],
    price: publicPrice,
    priceText: `${formatAud(publicPrice)} Inc GST`,
    resellerPrice,
    resellerPriceText: `${formatAud(resellerPrice)} Ex GST`,
    rrp,
    rrpText: formatAud(rrp),
    rrpExGst: roundMoney(rrp / (1 + GST_RATE)),
    taxRate: 10,
    availabilityText: stockQuantity > 0 ? "In Stock" : "Check availability",
    etaDate: "",
    etaStatus: "",
    stockQuantity,
    stockByWarehouse: { adl: 0, bne: 0, mel: 0, syd: 0, wa: 0 },
    stockRecordUpdated: sourceUpdatedAt,
    weightKg: null,
    heightCm: null,
    widthCm: null,
    depthCm: null,
    gtin: "",
    liveUpdatedAt: sourceUpdatedAt,
  };

  if (isTangibleCatalogProduct(product)) products.push(product);
  else skipped.push({ sku, productName, reason: "non_physical_product" });
}

products.sort((left, right) => left.code.localeCompare(right.code));
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(products)}\n`);

const reasonCounts = Object.fromEntries(
  Array.from(new Set(skipped.map((item) => item.reason))).map((reason) => [
    reason,
    skipped.filter((item) => item.reason === reason).length,
  ]),
);
console.log(JSON.stringify({
  source: inputPath,
  output: outputPath,
  rowsRead: records.length,
  productsWritten: products.length,
  inStockProducts: products.filter((product) => product.stockQuantity > 0).length,
  skipped: skipped.length,
  skippedByReason: reasonCounts,
}, null, 2));
