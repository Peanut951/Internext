import fs from "node:fs";
import path from "node:path";
import { normalizeProductTitleToken } from "../shared/product-title-policy.js";

const productRoot = path.resolve("dist", "products", "item");
const failures = [];
let productsChecked = 0;
let titlesAtLimit = 0;

const decodeHtml = (value) =>
  String(value || "")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const readAttribute = (html, name, value, attribute) => {
  const tag = html.match(new RegExp(`<meta\\s+[^>]*${name}=["']${value}["'][^>]*>`, "i"))?.[0] || "";
  return decodeHtml(tag.match(new RegExp(`${attribute}=["']([^"']*)["']`, "i"))?.[1] || "");
};

if (!fs.existsSync(productRoot)) {
  console.error("Product SEO content audit failed: static product pages have not been generated.");
  process.exit(1);
}

for (const entry of fs.readdirSync(productRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const filePath = path.join(productRoot, entry.name, "index.html");
  if (!fs.existsSync(filePath)) continue;

  const html = fs.readFileSync(filePath, "utf8");
  const schemas = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)]
    .map((match) => {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const productSchema = schemas.find((schema) => schema?.["@type"] === "Product");
  const code = String(productSchema?.sku || decodeURIComponent(entry.name));
  const reasons = [];

  if (!productSchema) {
    failures.push({ code, reasons: ["missing valid Product structured data"] });
    continue;
  }

  const name = String(productSchema.name || "").trim();
  const brand = typeof productSchema.brand === "string"
    ? productSchema.brand
    : String(productSchema.brand?.name || "").trim();
  const mpn = String(productSchema.mpn || "").trim();
  const documentTitle = decodeHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]);
  const heading = decodeHtml(html.match(/<h1>([\s\S]*?)<\/h1>/i)?.[1]);
  const metaDescription = readAttribute(html, "name", "description", "content");
  const normalizedName = normalizeProductTitleToken(name);

  if (name.length < 15) reasons.push(`product title is too short (${name.length})`);
  if (name.length > 150) reasons.push(`product title exceeds 150 characters (${name.length})`);
  if (name.length >= 145) titlesAtLimit += 1;
  if (brand && !normalizedName.includes(normalizeProductTitleToken(brand))) reasons.push("product title is missing brand");
  if (mpn && !normalizedName.includes(normalizeProductTitleToken(mpn))) reasons.push("product title is missing MPN");
  if (heading !== name) reasons.push("static H1 does not match structured product name");
  if (!documentTitle || documentTitle.length > 120) reasons.push(`document title length is invalid (${documentTitle.length})`);
  if (metaDescription.length < 70 || metaDescription.length > 160) {
    reasons.push(`meta description length is invalid (${metaDescription.length})`);
  }
  if (/\uFFFD|(?:Ã|Â|â)[^\s]/.test(`${name} ${documentTitle}`)) reasons.push("title contains encoding corruption");
  if (/\b(?:undefined|null)\b$/i.test(name)) reasons.push("title contains an invalid placeholder");

  if (reasons.length) failures.push({ code, name, reasons });
  productsChecked += 1;
}

console.log(JSON.stringify({ productsChecked, invalidProducts: failures.length, titlesAtLimit }, null, 2));

if (productsChecked < 10_000 || failures.length > 0) {
  console.error("Product SEO content audit failures:");
  console.error(JSON.stringify(failures.slice(0, 50), null, 2));
  process.exitCode = 1;
}
