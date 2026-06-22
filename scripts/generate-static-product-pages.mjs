import fs from "node:fs";
import path from "node:path";
import { loadLeaderFeedProducts } from "./lib/leader-feed.mjs";
import { loadAlloysLiveCatalogItems, mergeAlloysLivePricing } from "./lib/alloys-live-feed.mjs";

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

const normalizeToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeGtin = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits) ? digits : "";
};

const getProductGtin = (product) =>
  normalizeGtin(product.gtin) || normalizeGtin(product.ean) || normalizeGtin(product.upc) || normalizeGtin(product.barcode);

const getProductMpn = (product) => {
  const supplierCode = String(product.supplierCode || "").trim();
  const code = String(product.code || "").trim();

  if (supplierCode.length >= 3 && normalizeToken(supplierCode) !== normalizeToken(code)) {
    return supplierCode;
  }

  return code;
};

const getProductText = (product) =>
  `${product.manufacturer || ""} ${product.name || ""} ${product.description || ""} ${product.longDescription || ""}`.toLowerCase();

const getSeoProductType = (product) => {
  const text = getProductText(product);

  if (/\btoner\b/.test(text)) return "Toner Cartridge";
  if (/\bink\b/.test(text)) return "Ink Cartridge";
  if (/\bdrum\b/.test(text)) return "Drum Unit";
  if (/\bribbon\b/.test(text)) return "Printer Ribbon";
  if (/\bprinthead\b/.test(text)) return "Printhead";
  if (/\b(toner|cartridge|drum|ink|ribbon|printhead)\b/.test(text)) return "Printer consumable";
  if (/\b(paper|roll|media|film|vinyl|label)\b/.test(text)) return "Print media";
  if (/\b(printer|multifunction|mfp|copier|plotter|large format)\b/.test(text)) return "Printer";
  if (/\b(scanner|document scanner)\b/.test(text)) return "Scanner";
  if (/\b(laptop|notebook|chromebook)\b/.test(text)) return "Laptop";
  if (/\b(tablet)\b/.test(text)) return "Tablet";
  if (/\b(desktop|workstation|pc\b|server)\b/.test(text)) return "Computer system";
  if (/\b(monitor|display|screen|signage|panel)\b/.test(text)) return "Commercial display";
  if (/\b(projector)\b/.test(text)) return "Projector";
  if (/\b(camera|cctv|nvr|dvr|surveillance)\b/.test(text)) return "Security camera";
  if (/\b(intercom|access control|rfid|door station)\b/.test(text)) return "Access control device";
  if (/\b(router|switch|access point|network|nas|storage|firewall|wifi|wi-fi)\b/.test(text)) return "Network hardware";
  if (/\b(phone|handset|headset|speakerphone|conference|voip|sip)\b/.test(text)) return "Business communication device";
  if (/\b(ups|battery|power supply|powerboard|pdu)\b/.test(text)) return "Power accessory";
  if (/\b(relay|controller|control module|interface)\b/.test(text)) return "Control module";
  if (/\b(adapter|adaptor|converter|interface)\b/.test(text)) return "Adapter";
  if (/\b(cable|cord|lead)\b/.test(text)) return "Cable";
  if (/\b(mount|bracket|stand)\b/.test(text)) return "Mount";

  return "";
};

const removeLeadingBrandFromTitle = (title, brand) => {
  const cleanBrand = stripHtml(brand || "");
  const cleanTitle = stripHtml(title || "");
  if (!cleanBrand) return cleanTitle;

  const escapedBrand = cleanBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return cleanTitle.replace(new RegExp(`^${escapedBrand}\\s+`, "i"), "").trim();
};

const buildSearchTitleText = (product) => {
  const brand = stripHtml(product.manufacturer || "");
  const base = removeLeadingBrandFromTitle(
    removeSupplierReferences(product.description || product.name || product.code),
    brand,
  );
  const mpn = getProductMpn(product);
  const productType = getSeoProductType(product);
  const normalizedBase = normalizeToken(base);
  const normalizedType = normalizeToken(productType);
  const parts = [
    brand && !normalizedBase.startsWith(normalizeToken(brand)) ? brand : "",
    productType && normalizedType && !normalizedBase.includes(normalizedType) ? productType : "",
    base,
    mpn && !normalizedBase.includes(normalizeToken(mpn)) ? mpn : "",
  ].filter(Boolean);

  return parts.join(" ");
};

const getProductUrl = (code) => `${SITE_URL}/products/item/${encodeURIComponent(code)}`;

const isPlaceholderImage = (value) => /product-placeholder\.(svg|png)/i.test(String(value || ""));
const isTrackingImage = (value) => /\/controls\/bit\.gif$/i.test(String(value || ""));

const getImages = (product) => {
  const candidates = [product.imageUrl, ...(Array.isArray(product.imageUrls) ? product.imageUrls : [])]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => !isPlaceholderImage(value) && !isTrackingImage(value))
    .filter((value) => /\.(jpe?g|png|gif)(?:\?.*)?$/i.test(value));

  return Array.from(new Set(candidates))
    .sort((a, b) => {
      const aPreferred = /\/(Original|Large)\//i.test(a) ? 0 : 1;
      const bPreferred = /\/(Original|Large)\//i.test(b) ? 0 : 1;
      return aPreferred - bPreferred;
    })
    .map((value) => {
      try {
        return new URL(value, SITE_URL).href;
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .slice(0, 11);
};

const getImage = (product) => getImages(product)[0] || "";

const buildDescription = (product) => {
  const title = buildSearchTitleText(product);
  const longDescription = removeSupplierReferences(product.longDescription || "");
  const price = formatAud(product.price);
  const mpn = getProductMpn(product);
  const gtin = getProductGtin(product);
  const productType = getSeoProductType(product);
  const availability =
    typeof product.stockQuantity === "number" && product.stockQuantity <= 0
      ? "out of stock"
      : "in stock or available to order";
  const parts = [
    `Shop ${title} at Internext Australia.`,
    productType ? `${productType} for Australian business and home customers.` : "",
    mpn ? `MPN ${mpn}.` : "",
    gtin ? `GTIN ${gtin}.` : "",
    price ? `${price} Inc GST.` : "",
    availability ? `${availability}.` : "",
    longDescription || title,
  ].filter(Boolean);

  return truncate(parts.join(" "), 155);
};

const buildStructuredDescription = (product) => {
  const title = buildSearchTitleText(product);
  const productType = getSeoProductType(product);
  const mpn = getProductMpn(product);
  const gtin = getProductGtin(product);
  const sourceDescription = removeSupplierReferences(product.longDescription || product.description || product.name || "");
  const parts = [
    `${title} from Internext Australia.`,
    productType ? `Product type: ${productType}.` : "",
    mpn ? `MPN: ${mpn}.` : "",
    gtin ? `GTIN: ${gtin}.` : "",
    sourceDescription && normalizeToken(sourceDescription) !== normalizeToken(title) ? sourceDescription : "",
    "Includes secure checkout, Australian delivery options, and Internext customer support.",
  ].filter(Boolean);

  return parts.join(" ");
};

const buildStructuredData = (product, url, images) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  sku: product.code,
  mpn: getProductMpn(product),
  ...(getProductGtin(product) ? { gtin: getProductGtin(product) } : {}),
  name: buildSearchTitleText(product),
  description: buildStructuredDescription(product),
  brand: {
    "@type": "Brand",
    name: product.manufacturer || "Internext",
  },
  ...(images.length > 0 ? { image: images } : {}),
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
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: {
              "@type": "MonetaryAmount",
              value: "35.00",
              currency: "AUD",
            },
            shippingDestination: {
              "@type": "DefinedRegion",
              addressCountry: "AU",
            },
          },
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "AU",
            returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: 30,
            returnMethod: "https://schema.org/ReturnByMail",
            returnFees: "https://schema.org/ReturnShippingFees",
          },
        },
      }
    : {}),
});

const removeExistingHeadTags = (html) =>
  html
    .replace(/\s*<title>[\s\S]*?<\/title>/i, "")
    .replace(/\s*<meta\s+name="description"[\s\S]*?>/gi, "")
    .replace(/\s*<meta\s+name="robots"[\s\S]*?>/gi, "")
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
  const titleText = buildSearchTitleText(product);
  const title = truncate(`${titleText} | Internext Australia`, 90);
  const url = getProductUrl(product.code);
  const description = buildDescription(product);
  const images = getImages(product);
  const image = images[0] || "";
  const structuredData = buildStructuredData(product, url, images);
  const headTags = [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="index, follow" />`,
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
    `<p>${escapeHtml(buildStructuredDescription(product))}</p>`,
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
let leaderFeedProducts = [];
let alloysLiveItems = [];

try {
  leaderFeedProducts = await loadLeaderFeedProducts();
} catch (error) {
  console.warn(`Leader feed unavailable for static product pages: ${error.message}`);
}

try {
  alloysLiveItems = await loadAlloysLiveCatalogItems();
} catch (error) {
  console.warn(`Alloys live feed unavailable for static product pages: ${error.message}`);
}

const products = mergeAlloysLivePricing([
  ...readJson(path.join(dataDir, "catalog-products.json")),
  ...readJson(path.join(dataDir, "leader-products.json")),
  ...leaderFeedProducts,
], alloysLiveItems);
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
