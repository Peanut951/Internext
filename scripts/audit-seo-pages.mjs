import fs from "node:fs";
import path from "node:path";
import {
  getIndexableRoutes,
  NOINDEX_ROUTES,
  SITE_URL,
} from "./lib/seo-routes.mjs";

const distDir = path.resolve("dist");
const sitemapPath = path.resolve("public", "sitemap.xml");
const errors = [];

const read = (filePath) => {
  if (!fs.existsSync(filePath)) {
    errors.push(`Missing file: ${path.relative(process.cwd(), filePath)}`);
    return "";
  }
  return fs.readFileSync(filePath, "utf8");
};

const routeFile = (routePath) =>
  routePath === "/"
    ? path.join(distDir, "index.html")
    : path.join(distDir, ...routePath.slice(1).split("/"), "index.html");

const getMatches = (html, pattern) => Array.from(html.matchAll(pattern));
const getCanonical = (html) =>
  getMatches(html, /<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?\s*>/gi).map(
    (match) => match[1],
  );
const getRobots = (html) =>
  getMatches(html, /<meta\s+name="robots"\s+content="([^"]+)"\s*\/?\s*>/gi).map(
    (match) => match[1].toLowerCase(),
  );

for (const route of getIndexableRoutes()) {
  const html = read(routeFile(route.path));
  const expectedCanonical = `${SITE_URL}${route.path === "/" ? "/" : route.path}`;
  const canonicals = getCanonical(html);
  const robots = getRobots(html);

  if (canonicals.length !== 1 || canonicals[0] !== expectedCanonical) {
    errors.push(`${route.path}: expected one canonical ${expectedCanonical}, found ${canonicals.join(", ") || "none"}`);
  }
  if (robots.length !== 1 || robots[0] !== "index, follow") {
    errors.push(`${route.path}: expected one index, follow robots tag`);
  }
  if (!html.includes(`<title>${route.title}</title>`)) {
    errors.push(`${route.path}: generated title does not match route registry`);
  }
  if (!html.includes("data-static-seo-content")) {
    errors.push(`${route.path}: missing static fallback content for search crawlers`);
  }
}

for (const routePath of NOINDEX_ROUTES) {
  const html = read(routeFile(routePath));
  if (getCanonical(html).length > 0) {
    errors.push(`${routePath}: noindex route must not declare a canonical`);
  }
  if (!getRobots(html).includes("noindex, nofollow")) {
    errors.push(`${routePath}: missing noindex, nofollow robots tag`);
  }
}

const notFoundHtml = read(path.join(distDir, "404.html"));
if (!getRobots(notFoundHtml).includes("noindex, nofollow")) {
  errors.push("404.html: missing noindex, nofollow robots tag");
}
if (getCanonical(notFoundHtml).length > 0) {
  errors.push("404.html: must not declare a canonical");
}

const sitemap = read(sitemapPath);
if (/<(?:lastmod|changefreq|priority)>/i.test(sitemap)) {
  errors.push("sitemap.xml: contains unreliable or ignored lastmod/changefreq/priority signals");
}

const sitemapUrls = getMatches(sitemap, /<loc>([^<]+)<\/loc>/g).map((match) => match[1]);
const uniqueSitemapUrls = new Set(sitemapUrls);
if (uniqueSitemapUrls.size !== sitemapUrls.length) {
  errors.push(`sitemap.xml: contains ${sitemapUrls.length - uniqueSitemapUrls.size} duplicate URLs`);
}
for (const sitemapUrl of sitemapUrls) {
  const url = new URL(sitemapUrl);
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    errors.push(`${url.pathname}: sitemap URL must not end with a trailing slash`);
  }
}

let productPageCount = 0;
const productCodesByTitle = new Map();
for (const sitemapUrl of sitemapUrls) {
  const url = new URL(sitemapUrl);
  if (!url.pathname.startsWith("/products/item/")) {
    continue;
  }

  const encodedCode = url.pathname.slice("/products/item/".length);
  const productFile = path.join(distDir, "products", "item", encodedCode, "index.html");
  const html = read(productFile);
  const canonicals = getCanonical(html);
  if (canonicals.length !== 1 || canonicals[0] !== sitemapUrl) {
    errors.push(`${url.pathname}: product canonical does not match its sitemap URL`);
  }
  if (!getRobots(html).includes("index, follow")) {
    errors.push(`${url.pathname}: product page is not index, follow`);
  }
  if (!/<h1>[^<]+<\/h1>/i.test(html)) {
    errors.push(`${url.pathname}: product page is missing static heading content`);
  }
  if (/"merchantReturnDays"\s*:\s*30/i.test(html)) {
    errors.push(`${url.pathname}: product schema contains the obsolete 30-day return policy`);
  }
  if (/"shippingRate"\s*:\s*\{[\s\S]*?"value"\s*:\s*"35\.00"/i.test(html)) {
    errors.push(`${url.pathname}: product schema contains the obsolete flat $35 shipping rate`);
  }

  const title = getMatches(html, /<title>([\s\S]*?)<\/title>/gi)[0]?.[1]
    ?.replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (title) {
    const codes = productCodesByTitle.get(title) || [];
    codes.push(decodeURIComponent(encodedCode));
    productCodesByTitle.set(title, codes);
  }
  productPageCount += 1;
}

const duplicateProductTitles = Array.from(productCodesByTitle.entries())
  .filter(([, codes]) => codes.length > 1)
  .sort((a, b) => b[1].length - a[1].length);
if (duplicateProductTitles.length > 0) {
  const duplicatePageCount = duplicateProductTitles.reduce((total, [, codes]) => total + codes.length, 0);
  errors.push(
    `${duplicatePageCount} product pages share an exact title across ${duplicateProductTitles.length} title groups`,
  );
  for (const [title, codes] of duplicateProductTitles.slice(0, 10)) {
    errors.push(`duplicate product title for ${codes.join(", ")}: ${title}`);
  }
}

const vercelConfig = JSON.parse(read(path.resolve("vercel.json")) || "{}");
if (vercelConfig.trailingSlash !== false) {
  errors.push("vercel.json: trailingSlash must be false so slash variants redirect to canonical URLs");
}
const fallbackRewrite = (vercelConfig.rewrites || []).find(
  (rewrite) => rewrite.destination === "/index.html" && /\.\*/.test(rewrite.source),
);
if (fallbackRewrite) {
  errors.push("vercel.json: catch-all SPA rewrite would turn unknown URLs into soft 404 responses");
}

const homeHtml = read(routeFile("/"));
if (!homeHtml.includes('"merchantReturnLink": "https://www.internext.com.au/support/returns"')) {
  errors.push("homepage: missing the canonical merchant return-policy link in organization schema");
}

if (errors.length > 0) {
  console.error(`SEO audit failed with ${errors.length} issue(s):`);
  for (const error of errors.slice(0, 100)) {
    console.error(`- ${error}`);
  }
  if (errors.length > 100) {
    console.error(`- ...and ${errors.length - 100} more`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `SEO audit passed: ${getIndexableRoutes().length} route pages, ${productPageCount} product pages, ${NOINDEX_ROUTES.length} noindex pages, and one true 404 template.`,
  );
}
