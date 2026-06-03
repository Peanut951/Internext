import fs from "node:fs";
import path from "node:path";

const SITE_URL = "https://www.internext.com.au";
const publicDir = path.resolve("public");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const staticProducts = readJson(path.join(publicDir, "data", "catalog-products.json"));
const leaderProducts = readJson(path.join(publicDir, "data", "leader-products.json"));
const productCodes = Array.from(
  new Set(
    [...staticProducts, ...leaderProducts]
      .map((product) => String(product.code || "").trim())
      .filter(Boolean),
  ),
).sort((a, b) => a.localeCompare(b));

const urls = [
  { loc: `${SITE_URL}/`, changefreq: "weekly", priority: "1.0" },
  { loc: `${SITE_URL}/products`, changefreq: "daily", priority: "0.9" },
  ...productCodes.map((code) => ({
    loc: `${SITE_URL}/products/item/${encodeURIComponent(code)}`,
    changefreq: "weekly",
    priority: "0.8",
  })),
];

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(
    (url) =>
      `  <url><loc>${escapeXml(url.loc)}</loc><changefreq>${url.changefreq}</changefreq><priority>${url.priority}</priority></url>`,
  ),
  "</urlset>",
  "",
].join("\n");

const robots = [
  "User-agent: *",
  "Allow: /",
  `Sitemap: ${SITE_URL}/sitemap.xml`,
  "",
].join("\n");

fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(publicDir, "robots.txt"), robots);

console.log(`Generated ${urls.length} sitemap URLs.`);
