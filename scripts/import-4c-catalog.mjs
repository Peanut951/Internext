import fs from "node:fs";
import path from "node:path";
import { isTangibleCatalogProduct } from "./lib/product-classification.mjs";

const CUSTOMER_MARKUP_RATE = 0.2;
const GST_RATE = 0.1;
const DEFAULT_OUTPUT_PATH = path.resolve("public", "data", "4c-products.json");

const refreshIfConfigured = process.argv[2] === "--refresh-if-configured";
const inputSource = refreshIfConfigured ? String(process.env.FOUR_C_CATALOG_CSV_URL || "").trim() : String(process.argv[2] || "");
if (refreshIfConfigured && !inputSource) {
  console.log("4C catalogue refresh skipped: FOUR_C_CATALOG_CSV_URL is not configured.");
  process.exit(0);
}
const isRemoteSource = /^https:\/\//i.test(inputSource);
const inputPath = isRemoteSource ? "" : inputSource ? path.resolve(inputSource) : "";
const outputPath = process.argv[3] ? path.resolve(process.argv[3]) : DEFAULT_OUTPUT_PATH;

if ((!inputPath || !fs.existsSync(inputPath)) && !isRemoteSource) {
  throw new Error("Usage: node scripts/import-4c-catalog.mjs <4C CSV path or HTTPS URL> [output JSON path]");
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

let sourceText;
let sourceUpdatedAt;
if (isRemoteSource) {
  const authorization = String(process.env.FOUR_C_CATALOG_CSV_AUTHORIZATION || "").trim();
  const response = await fetch(inputSource, {
    headers: authorization ? { Authorization: authorization } : {},
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`4C feed returned HTTP ${response.status}.`);
  sourceText = (await response.text()).replace(/^\uFEFF/, "");
  sourceUpdatedAt = new Date().toISOString();
} else {
  sourceText = fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
  sourceUpdatedAt = fs.statSync(inputPath).mtime.toISOString();
}
const [rawHeaders = [], ...records] = parseCsvRecords(sourceText);
const headers = rawHeaders.map(normalizeHeader);
for (const requiredHeader of ["SKU", "Product_Name", "Price_Ex", "Stock"]) {
  if (!headers.includes(requiredHeader)) throw new Error(`4C feed is missing required column ${requiredHeader}.`);
}
if (records.length === 0) throw new Error("4C feed is empty.");
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
  const rrp = suppliedRrpInc !== null && suppliedRrpInc > publicPrice
    ? roundMoney(suppliedRrpInc)
    : null;
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
    rrpText: rrp === null ? "" : formatAud(rrp),
    rrpExGst: rrp === null ? null : roundMoney(rrp / (1 + GST_RATE)),
    taxRate: 10,
    availabilityText: stockQuantity > 0 ? "In Stock" : "Check availability",
    etaDate: "",
    etaStatus: "",
    stockQuantity,
    stockByWarehouse: { adl: 0, bne: 0, mel: 0, syd: 0, wa: 0 },
    stockRecordUpdated: sourceUpdatedAt,
    supplierCatalogUpdatedAt: sourceUpdatedAt,
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
if (fs.existsSync(outputPath)) {
  const previous = JSON.parse(fs.readFileSync(outputPath, "utf8"));
  if (Array.isArray(previous) && previous.length >= 100 && products.length < previous.length * 0.8) {
    throw new Error(`4C feed has only ${products.length} products versus ${previous.length} previously; review before replacing the snapshot.`);
  }
}
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(products)}\n`);

const reasonCounts = Object.fromEntries(
  Array.from(new Set(skipped.map((item) => item.reason))).map((reason) => [
    reason,
    skipped.filter((item) => item.reason === reason).length,
  ]),
);
console.log(JSON.stringify({
  source: isRemoteSource ? new URL(inputSource).origin : inputPath,
  output: outputPath,
  rowsRead: records.length,
  productsWritten: products.length,
  inStockProducts: products.filter((product) => product.stockQuantity > 0).length,
  skipped: skipped.length,
  skippedByReason: reasonCounts,
}, null, 2));
