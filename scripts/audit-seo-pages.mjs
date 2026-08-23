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

let productPageCount = 0;
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
  productPageCount += 1;
}

const vercelConfig = JSON.parse(read(path.resolve("vercel.json")) || "{}");
const fallbackRewrite = (vercelConfig.rewrites || []).find(
  (rewrite) => rewrite.destination === "/index.html" && /\.\*/.test(rewrite.source),
);
if (fallbackRewrite) {
  errors.push("vercel.json: catch-all SPA rewrite would turn unknown URLs into soft 404 responses");
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
