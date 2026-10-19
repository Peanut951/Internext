const DEFAULT_SITE_URL = "https://www.internext.com.au";
const DEFAULT_LIMIT = 100;
const CONCURRENCY = 10;
const REQUEST_TIMEOUT_MS = 15_000;

const args = new Map(
  process.argv.slice(2).map((argument) => {
    const [key, ...valueParts] = argument.replace(/^--/, "").split("=");
    return [key, valueParts.join("=")];
  }),
);
const siteUrl = String(args.get("site") || process.env.SEO_AUDIT_SITE_URL || DEFAULT_SITE_URL)
  .replace(/\/$/, "");
const requestedLimit = Number(args.get("limit") || process.env.SEO_AUDIT_LIMIT || DEFAULT_LIMIT);

const decodeHtml = (value) => String(value || "")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

const getAttribute = (html, elementPattern, attribute) => {
  const element = html.match(elementPattern)?.[0] || "";
  return decodeHtml(element.match(new RegExp(`${attribute}=["']([^"']+)["']`, "i"))?.[1] || "");
};

const getCanonical = (html) => getAttribute(
  html,
  /<link\b[^>]*\brel=["']canonical["'][^>]*>/i,
  "href",
);
const getMetaRobots = (html) => getAttribute(
  html,
  /<meta\b[^>]*\bname=["']robots["'][^>]*>/i,
  "content",
).toLowerCase();

const fetchPage = async (url) => {
  const response = await fetch(url, {
    headers: { "user-agent": "InternextIndexabilityAudit/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return { response, html: await response.text() };
};

const selectUrls = (urls) => {
  if (!Number.isFinite(requestedLimit) || requestedLimit <= 0 || requestedLimit >= urls.length) {
    return urls;
  }

  const routeUrls = urls.filter((url) => !new URL(url).pathname.startsWith("/products/item/"));
  const productUrls = urls.filter((url) => new URL(url).pathname.startsWith("/products/item/"));
  const remaining = Math.max(0, requestedLimit - routeUrls.length);
  const sampledProducts = Array.from({ length: Math.min(remaining, productUrls.length) }, (_, index) => {
    const position = Math.floor(index * productUrls.length / Math.max(1, remaining));
    return productUrls[position];
  });
  return Array.from(new Set([...routeUrls, ...sampledProducts]));
};

const sitemapUrl = `${siteUrl}/sitemap.xml`;
const { response: sitemapResponse, html: sitemapXml } = await fetchPage(sitemapUrl);
if (!sitemapResponse.ok) {
  throw new Error(`Sitemap returned HTTP ${sitemapResponse.status}: ${sitemapUrl}`);
}

const sitemapUrls = Array.from(sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/gi))
  .map((match) => decodeHtml(match[1]).trim())
  .filter(Boolean);
const errors = [];
if (new Set(sitemapUrls).size !== sitemapUrls.length) {
  errors.push("Sitemap contains duplicate URLs.");
}

const urls = selectUrls(sitemapUrls);
let cursor = 0;
const results = [];
const worker = async () => {
  while (cursor < urls.length) {
    const index = cursor;
    cursor += 1;
    const url = urls[index];
    try {
      const { response, html } = await fetchPage(url);
      const canonical = getCanonical(html);
      const metaRobots = getMetaRobots(html);
      const xRobots = String(response.headers.get("x-robots-tag") || "").toLowerCase();
      const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
      const heading = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.replace(/<[^>]+>/g, " ").trim() || "";
      const issues = [];
      if (response.status !== 200) issues.push(`HTTP ${response.status}`);
      if (response.url !== url) issues.push(`redirected to ${response.url}`);
      if (canonical !== url) issues.push(`canonical is ${canonical || "missing"}`);
      if (metaRobots.includes("noindex") || xRobots.includes("noindex")) issues.push("is noindex");
      if (!title) issues.push("missing title");
      if (!heading) issues.push("missing H1");
      results[index] = { url, issues };
    } catch (error) {
      results[index] = { url, issues: [error instanceof Error ? error.message : String(error)] };
    }
  }
};

await Promise.all(Array.from({ length: Math.min(CONCURRENCY, urls.length) }, () => worker()));
for (const result of results) {
  for (const issue of result.issues) errors.push(`${result.url}: ${issue}`);
}

const missingUrl = `${siteUrl}/__indexability-audit-missing-page`;
try {
  const { response, html } = await fetchPage(missingUrl);
  if (response.status !== 404 && response.status !== 410) {
    errors.push(`${missingUrl}: expected 404 or 410, received ${response.status}`);
  }
  if (getCanonical(html)) errors.push(`${missingUrl}: missing page must not declare a canonical`);
  const robots = `${getMetaRobots(html)},${response.headers.get("x-robots-tag") || ""}`.toLowerCase();
  if (!robots.includes("noindex")) errors.push(`${missingUrl}: missing page must be noindex`);
} catch (error) {
  errors.push(`${missingUrl}: ${error instanceof Error ? error.message : String(error)}`);
}

if (errors.length > 0) {
  console.error(`Live indexability audit failed with ${errors.length} issue(s):`);
  for (const error of errors.slice(0, 100)) console.error(`- ${error}`);
  if (errors.length > 100) console.error(`- ...and ${errors.length - 100} more`);
  process.exitCode = 1;
} else {
  console.log(
    `Live indexability audit passed for ${urls.length} of ${sitemapUrls.length} sitemap URLs plus a missing-page check.`,
  );
}
