import fs from "node:fs";
import path from "node:path";

const SITE_URL = "https://www.internext.com.au";
const distDir = path.resolve("dist");
const dataDir = path.resolve("public", "data");

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const stripHtml = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const removeSupplierReferences = (value) =>
  stripHtml(value)
    .replace(/\s*Product code:\s*[^.;]+[.;]?/gi, "")
    .replace(/\s*supplier reference:\s*[^.;]+[.;]?/gi, "")
    .replace(/\s*;?\s*supplier reference\s+[^.;]+[.;]?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value, maxLength) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}...` : value;

const formatAud = (value) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("en-AU", { style: "currency", currency: "AUD" })
    : "";

const getProductUrl = (code) => `${SITE_URL}/products/item/${encodeURIComponent(code)}`;

const isPlaceholderImage = (value) => /product-placeholder\.(svg|png)/i.test(String(value || ""));
const isTrackingImage = (value) => /\/controls\/bit\.gif$/i.test(String(value || ""));

const getImage = (product) => {
  const candidates = [product.imageUrl, ...(Array.isArray(product.imageUrls) ? product.imageUrls : [])]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => !isPlaceholderImage(value) && !isTrackingImage(value))
    .filter((value) => /\.(jpe?g|png|gif)(?:\?.*)?$/i.test(value));

  const selected = candidates.find((value) => /\/(Original|Large)\//i.test(value)) || candidates[0] || "";
  if (!selected) return "";

  try {
    return new URL(selected, SITE_URL).href;
  } catch {
    return "";
  }
};

const buildDescription = (product) => {
  const title = stripHtml(product.description || product.name || product.code);
  const longDescription = removeSupplierReferences(product.longDescription || "");
  const price = formatAud(product.price);
  const parts = [
    `Buy ${title} from Internext Australia.`,
    price ? `${price} Inc GST.` : "",
    longDescription || title,
  ].filter(Boolean);

  return truncate(parts.join(" "), 155);
};

const buildStructuredData = (product, url, image) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  sku: product.code,
  mpn: product.code,
  name: stripHtml(product.description || product.name || product.code),
  description: removeSupplierReferences(product.longDescription || product.description || product.name || product.code),
  brand: {
    "@type": "Brand",
    name: product.manufacturer || "Internext",
  },
  ...(image ? { image: [image] } : {}),
  ...(typeof product.price === "number" && product.price > 0
    ? {
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: "AUD",
          price: product.price.toFixed(2),
          availability:
            typeof product.stockQuantity === "number" && product.stockQuantity <= 0
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
          itemCondition: "https://schema.org/NewCondition",
        },
      }
    : {}),
});

const removeExistingHeadTags = (html) =>
  html
    .replace(/\s*<title>[\s\S]*?<\/title>/i, "")
    .replace(/\s*<meta\s+name="description"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+property="og:title"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+property="og:description"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+property="og:type"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+property="og:url"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+property="og:image"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+name="twitter:title"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+name="twitter:description"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+name="twitter:image"[\s\S]*?>/gi, "")
    .replace(/\s*<link\s+rel="canonical"[\s\S]*?>/gi, "");

const createProductHtml = (template, product) => {
  const titleText = stripHtml(product.description || product.name || product.code);
  const title = truncate(`${titleText} | Internext`, 60);
  const url = getProductUrl(product.code);
  const description = buildDescription(product);
  const image = getImage(product);
  const structuredData = buildStructuredData(product, url, image);
  const headTags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="product" />`,
    `<meta property="og:url" content="${escapeHtml(url)}" />`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : "",
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : "",
    `<script type="application/ld+json">${JSON.stringify(structuredData).replace(/</g, "\\u003c")}</script>`,
  ]
    .filter(Boolean)
    .join("\n    ");
  const staticContent = [
    `<main style="max-width:960px;margin:40px auto;padding:0 20px;font-family:Arial,sans-serif;line-height:1.5;color:#111827">`,
    `<p style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#2d79a8">${escapeHtml(product.manufacturer || "Internext")}</p>`,
    `<h1>${escapeHtml(titleText)}</h1>`,
    image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(titleText)}" style="max-width:480px;width:100%;height:auto;object-fit:contain" />` : "",
    product.price ? `<p><strong>${escapeHtml(formatAud(product.price))} Inc GST</strong></p>` : "",
    `<p>${escapeHtml(removeSupplierReferences(product.longDescription || product.description || ""))}</p>`,
    `<p>Product code: ${escapeHtml(product.code)}</p>`,
    `</main>`,
  ]
    .filter(Boolean)
    .join("\n");

  return removeExistingHeadTags(template)
    .replace("</head>", `    ${headTags}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${staticContent}</div>`);
};

const templatePath = path.join(distDir, "index.html");
if (!fs.existsSync(templatePath)) {
  throw new Error("Run vite build before generating static product pages.");
}

const template = fs.readFileSync(templatePath, "utf8");
const products = [
  ...readJson(path.join(dataDir, "catalog-products.json")),
  ...readJson(path.join(dataDir, "leader-products.json")),
];
const uniqueProducts = new Map();

for (const product of products) {
  const code = String(product.code || "").trim();
  if (code && !uniqueProducts.has(code)) {
    uniqueProducts.set(code, { ...product, code });
  }
}

for (const product of uniqueProducts.values()) {
  const pageDir = path.join(distDir, "products", "item", encodeURIComponent(product.code));
  fs.mkdirSync(pageDir, { recursive: true });
  fs.writeFileSync(path.join(pageDir, "index.html"), createProductHtml(template, product));
}

console.log(`Generated ${uniqueProducts.size} static product pages.`);
