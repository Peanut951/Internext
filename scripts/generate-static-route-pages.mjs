import fs from "node:fs";
import path from "node:path";
import {
  getIndexableRoutes,
  NOINDEX_ROUTES,
  SITE_URL,
} from "./lib/seo-routes.mjs";

const distDir = path.resolve("dist");
const templatePath = path.join(distDir, "index.html");

if (!fs.existsSync(templatePath)) {
  throw new Error("Run vite build before generating static route pages.");
}

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const removeSeoTags = (html) =>
  html
    .replace(/\s*<title>[\s\S]*?<\/title>/i, "")
    .replace(/\s*<meta\s+name="description"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+name="robots"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+property="og:title"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+property="og:description"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+property="og:type"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+property="og:url"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+name="twitter:title"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+name="twitter:description"[\s\S]*?>/gi, "")
    .replace(/\s*<link\s+rel="canonical"[\s\S]*?>/gi, "");

const createHtml = (template, { path: routePath, title, description, index }) => {
  const canonicalUrl = `${SITE_URL}${routePath === "/" ? "/" : routePath}`;
  const tags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="${index ? "index, follow" : "noindex, nofollow"}" />`,
    index ? `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />` : "",
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="website" />`,
    index ? `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />` : "",
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
  ]
    .filter(Boolean)
    .join("\n    ");

  const html = removeSeoTags(template).replace("</head>", `    ${tags}\n  </head>`);
  if (!index) {
    return html;
  }

  const heading = title.split(" | ")[0];
  const staticContent = [
    '<main data-static-seo-content style="max-width:960px;margin:48px auto;padding:0 24px;font-family:Arial,sans-serif;line-height:1.6;color:#111827">',
    `<h1>${escapeHtml(heading)}</h1>`,
    `<p>${escapeHtml(description)}</p>`,
    "</main>",
  ].join("");

  return html.replace('<div id="root"></div>', `<div id="root">${staticContent}</div>`);
};

const writeRoute = (template, route) => {
  if (route.path === "/") {
    fs.writeFileSync(templatePath, createHtml(template, route));
    return;
  }

  const pageDir = path.join(distDir, ...route.path.slice(1).split("/"));
  fs.mkdirSync(pageDir, { recursive: true });
  fs.writeFileSync(path.join(pageDir, "index.html"), createHtml(template, route));
};

const template = fs.readFileSync(templatePath, "utf8");
const indexableRoutes = getIndexableRoutes().map((route) => ({ ...route, index: true }));
const noindexRoutes = NOINDEX_ROUTES.map((routePath) => ({
  path: routePath,
  title: "Internext",
  description: "Internext account and ordering page.",
  index: false,
}));

for (const route of [...indexableRoutes.filter((item) => item.path !== "/"), ...noindexRoutes]) {
  writeRoute(template, route);
}

writeRoute(template, indexableRoutes.find((route) => route.path === "/"));

const notFoundHtml = createHtml(template, {
  path: "/404",
  title: "Page Not Found | Internext",
  description: "The requested Internext page could not be found.",
  index: false,
}).replace(
  '<div id="root"></div>',
  '<div id="root"><main style="max-width:760px;margin:64px auto;padding:0 24px;font-family:Arial,sans-serif"><h1>Page not found</h1><p>The requested page is unavailable.</p><p><a href="/products">Browse products</a></p></main></div>',
);
fs.writeFileSync(path.join(distDir, "404.html"), notFoundHtml);

console.log(
  `Generated ${indexableRoutes.length} indexable route pages, ${noindexRoutes.length} noindex pages, and a 404 page.`,
);
