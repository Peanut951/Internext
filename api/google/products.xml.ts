import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadMergedCatalogProducts } from "../catalog/live.js";

const SITE_URL = "https://www.internext.com.au";
const DEFAULT_GOOGLE_SHIPPING_PRICE_AUD = 35;
const MAX_GOOGLE_SHIPPING_DIMENSION_CM = 100;
const GOOGLE_IMAGE_FEED_VERSION = "20260604";
const GOOGLE_BLOCKED_IMAGE_PRODUCT_CODES = new Set([
  "AK-NK-2",
  "AK-R20K-BK-L-KIT",
  "AK-S562CCLIP",
  "AK-S567-GREY",
  "AK-VP-R49G",
  "AL-1199",
  "AL-8199",
  "AV3250",
  "CDRG2090",
  "CDRG2110",
  "CDRG2140",
  "CIPFTM-250ST",
  "CLBP243DWII",
  "CMF754CDWII",
  "CPFI-5100C",
  "CPFI-5100CO",
  "CPFI-5100GY",
  "CPFI-5100MBK",
  "CPFI-5100PBK",
  "CPFI-5100PC",
  "CPFI-5100PM",
  "CPFI-5100R",
  "EB-2250U",
  "ES-AR135DHD3",
  "ES-AR135WH2",
  "ES-AR100WH2",
  "ES-AR150DHD3",
  "ES-SK150XHW-E12",
  "EPB11B255508",
  "EPC11CH40031",
  "EPC11CH45501",
  "EPC11CH72501",
  "EPC11CJ20501",
  "EPC11CK46501",
  "EPC13T200292",
  "EPDS-790WN",
  "GR-GCC6010",
  "GR-GDS3705",
  "GR-GDS37X0-IN",
  "GR-GWN7615",
  "GR-GWN7670",
  "GR-GWN7670WM",
  "GR-GWN7711",
  "GR-GWN7711P",
  "GR-GWN7816P",
  "GR-GXP2200EXT",
  "HP2Y9H0A",
  "HP2Y9H1A",
  "HP2Y9H3A",
  "HP2Y9H3A_PROMO",
  "HP698G7A",
  "HP698G8A",
  "IV2477X",
  "IV2477X-BLK",
  "KYMA4000FX",
  "KYMA4000WIFX",
  "KYP4060DN",
  "KYPA2600CWX",
  "KYPA2600CX",
  "KYPA6000X",
  "KYTK-1264",
  "KYTK-1274",
  "LG-AM-ST21BA",
  "LG-AM-ST21BC",
  "LM29S0034",
  "LM40N9575",
  "LM47C9667",
  "LMMX532ADWE",
  "LMMX632ADWE",
  "NB-FP3SHELF",
  "NB-T70",
  "R842167",
  "SH-SHELLYPROSHUT",
  "ST-RX265-5A",
  "ST-RX275-5A",
  "ST-RX286-5A",
  "VO-PPC-1540",
]);

const escapeXml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const absoluteUrl = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw, SITE_URL).href;
  } catch {
    return "";
  }
};

const stripHtml = (value: unknown) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}...` : value;

const removeSupplierReferences = (value: unknown) =>
  stripHtml(value)
    .replace(/\s*Product code:\s*[^.;]+[.;]?/gi, "")
    .replace(/\s*supplier reference:\s*[^.;]+[.;]?/gi, "")
    .replace(/\s*;?\s*supplier reference\s+[^.;]+[.;]?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const isPlaceholderImage = (value: unknown) => /product-placeholder\.(svg|png)/i.test(String(value || ""));
const isKnownTinyOrTrackingImage = (value: unknown) => /\/controls\/bit\.gif$/i.test(String(value || "").trim());

const isSupportedGoogleImageUrl = (value: unknown) => {
  const image = absoluteUrl(value);
  if (!image || isPlaceholderImage(image) || isKnownTinyOrTrackingImage(image)) {
    return false;
  }

  try {
    const parsed = new URL(image);
    return ["http:", "https:"].includes(parsed.protocol) && /\.(jpe?g|png|gif)$/i.test(parsed.pathname);
  } catch {
    return false;
  }
};

const hasSupportedGoogleImageExtension = (url: string) => {
  try {
    return /\.(jpe?g|png|gif)$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

const getSupportedImageFormatCandidates = (value: unknown) => {
  const image = absoluteUrl(value);
  if (!image) {
    return [];
  }

  if (hasSupportedGoogleImageExtension(image)) {
    return [image];
  }

  try {
    const parsed = new URL(image);
    if (!/\/productimages\//i.test(parsed.pathname)) {
      return [image];
    }

    return [".jpg", ".png", ".gif"].map((extension) => {
      const next = new URL(parsed.href);
      next.pathname = `${next.pathname.replace(/\/$/, "")}${extension}`;
      return next.href;
    });
  } catch {
    return [image];
  }
};

const getProductImageCandidates = (product: {
  imageUrl?: string | null;
  imageUrls?: unknown;
}) => {
  const gallery = Array.isArray(product.imageUrls) ? product.imageUrls : [];
  const candidates = [product.imageUrl, ...gallery]
    .flatMap(getSupportedImageFormatCandidates)
    .filter(Boolean);

  return Array.from(new Set(candidates)).sort((a, b) => {
    const aPreferred = /\/(original|large)\//i.test(a) ? 0 : 1;
    const bPreferred = /\/(original|large)\//i.test(b) ? 0 : 1;
    return aPreferred - bPreferred;
  });
};

const getFreshGoogleImageUrl = (value: string) => {
  const image = absoluteUrl(value);
  if (!image) {
    return "";
  }

  try {
    const parsed = new URL(image);
    parsed.searchParams.set("internext_google_image_v", GOOGLE_IMAGE_FEED_VERSION);
    return parsed.href;
  } catch {
    return image;
  }
};

const getGoogleImage = (product: {
  code?: string | null;
  imageUrl?: string | null;
  imageUrls?: unknown;
}, excludedCodes = GOOGLE_BLOCKED_IMAGE_PRODUCT_CODES) => {
  const code = String(product.code || "").trim().toUpperCase();
  if (excludedCodes.has(code)) {
    return "";
  }

  const image = getProductImageCandidates(product).find(isSupportedGoogleImageUrl) || "";
  return image ? getFreshGoogleImageUrl(image) : "";
};

const loadGoogleFeedExclusions = async () => {
  try {
    const raw = await readFile(join(process.cwd(), "public", "data", "google-feed-exclusions.json"), "utf8");
    const parsed = JSON.parse(raw) as { codes?: unknown };
    const codes = Array.isArray(parsed.codes) ? parsed.codes : [];

    return new Set([
      ...GOOGLE_BLOCKED_IMAGE_PRODUCT_CODES,
      ...codes.map((code) => String(code).trim().toUpperCase()).filter(Boolean),
    ]);
  } catch {
    return GOOGLE_BLOCKED_IMAGE_PRODUCT_CODES;
  }
};

const getAvailability = (product: {
  stockQuantity?: number | null;
  price?: number | null;
  availabilityText?: string | null;
}) => {
  if (product.price === null || product.price === undefined) {
    return "out_of_stock";
  }

  if (/available to order|in stock/i.test(product.availabilityText || "")) {
    return "in_stock";
  }

  return (product.stockQuantity || 0) > 0 ? "in_stock" : "out_of_stock";
};

const getProductText = (product: {
  manufacturer?: string | null;
  name?: string | null;
  description?: string | null;
  longDescription?: string | null;
}) =>
  `${product.manufacturer || ""} ${product.name || ""} ${product.description || ""} ${product.longDescription || ""}`.toLowerCase();

const getProductType = (product: {
  manufacturer?: string | null;
  name?: string | null;
  description?: string | null;
  longDescription?: string | null;
}) => {
  const text = getProductText(product);

  if (/\b(toner|cartridge|drum|ink|ribbon|printhead)\b/.test(text)) return "Printer consumables";
  if (/\b(paper|roll|media|film|vinyl)\b/.test(text)) return "Print media";
  if (/\b(printer|multifunction|mfp|copier|scanner|plotter)\b/.test(text)) return "Printers and scanners";
  if (/\b(laptop|notebook|chromebook|tablet|desktop|workstation|pc\b)\b/.test(text)) return "Computers";
  if (/\b(monitor|display|screen|projector|signage|panel)\b/.test(text)) return "Displays and AV";
  if (/\b(camera|cctv|nvr|dvr|surveillance|intercom|access control|rfid)\b/.test(text)) return "Security and access control";
  if (/\b(router|switch|access point|network|nas|storage|firewall|wifi|wi-fi)\b/.test(text)) return "Networking";
  if (/\b(phone|handset|headset|speakerphone|conference|voip|sip)\b/.test(text)) return "Unified communications";
  if (/\b(ups|battery|power supply|powerboard|pdu)\b/.test(text)) return "Power";
  if (/\b(warranty|licen[cs]e|subscription|software|support|onsite|installation|service|renewal)\b/.test(text)) return "Services and software";

  return "Technology products";
};

const getGoogleProductCategory = (product: {
  manufacturer?: string | null;
  name?: string | null;
  description?: string | null;
  longDescription?: string | null;
}) => {
  const type = getProductType(product);

  if (type === "Printer consumables" || type === "Print media") return "Office Supplies";
  if (type === "Services and software") return "Software";

  return "Electronics";
};

const getPrice = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? `${value.toFixed(2)} AUD`
    : "";

const getPositiveNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const optionalTag = (name: string, value: string | null) =>
  value ? `      <${name}>${escapeXml(value)}</${name}>` : null;

const getShippingWeight = (value: unknown) => {
  const weightKg = getPositiveNumber(value);
  return weightKg ? `${weightKg.toFixed(2)} kg` : null;
};

const estimateShippingWeightKg = (product: {
  description?: string | null;
  name?: string | null;
  manufacturer?: string | null;
}) => {
  const text = `${product.manufacturer || ""} ${product.name || ""} ${product.description || ""}`.toLowerCase();

  if (/\b(warranty|licen[cs]e|subscription|support|onsite|software)\b/.test(text)) {
    return 0.1;
  }

  if (/\b(ink|toner|cartridge|ribbon|remote|adapter|cable|cord|lead|mouse|keyboard)\b/.test(text)) {
    return 0.5;
  }

  if (/\b(paper|roll|media)\b/.test(text)) {
    return 5;
  }

  if (/\b(laptop|notebook|chromebook|tablet)\b/.test(text)) {
    return 3;
  }

  if (/\b(monitor|display|screen|tv)\b/.test(text)) {
    return 8;
  }

  if (/\b(printer|multifunction|mfp|copier|scanner|plotter)\b/.test(text)) {
    return 25;
  }

  if (/\b(server|workstation|desktop|pc\b|ups|battery)\b/.test(text)) {
    return 12;
  }

  if (/\b(camera|nvr|switch|router|phone|handset|headset|access point|ap\b)\b/.test(text)) {
    return 2;
  }

  return 1;
};

const getRequiredShippingWeight = (product: {
  weightKg?: number | null;
  description?: string | null;
  name?: string | null;
  manufacturer?: string | null;
}) => getShippingWeight(product.weightKg) || `${estimateShippingWeightKg(product).toFixed(2)} kg`;

const getShippingDimension = (value: unknown) => {
  const centimetres = getPositiveNumber(value);
  return centimetres
    ? `${Math.min(centimetres, MAX_GOOGLE_SHIPPING_DIMENSION_CM).toFixed(1)} cm`
    : null;
};

const estimateShippingDimensionsCm = (product: {
  description?: string | null;
  name?: string | null;
  manufacturer?: string | null;
}) => {
  const text = `${product.manufacturer || ""} ${product.name || ""} ${product.description || ""}`.toLowerCase();

  if (/\b(warranty|licen[cs]e|subscription|support|onsite|software)\b/.test(text)) {
    return { length: 1, width: 1, height: 1 };
  }

  if (/\b(ink|toner|cartridge|ribbon|remote|adapter|cable|cord|lead|mouse|keyboard)\b/.test(text)) {
    return { length: 20, width: 15, height: 10 };
  }

  if (/\b(paper|roll|media)\b/.test(text)) {
    return { length: 65, width: 25, height: 25 };
  }

  if (/\b(laptop|notebook|chromebook|tablet)\b/.test(text)) {
    return { length: 45, width: 35, height: 12 };
  }

  if (/\b(monitor|display|screen|tv)\b/.test(text)) {
    return { length: 80, width: 55, height: 20 };
  }

  if (/\b(printer|multifunction|mfp|copier|scanner|plotter)\b/.test(text)) {
    return { length: 80, width: 60, height: 50 };
  }

  if (/\b(server|workstation|desktop|pc\b|ups|battery)\b/.test(text)) {
    return { length: 60, width: 50, height: 30 };
  }

  if (/\b(camera|nvr|switch|router|phone|handset|headset|access point|ap\b)\b/.test(text)) {
    return { length: 30, width: 20, height: 15 };
  }

  return { length: 30, width: 20, height: 10 };
};

const getRequiredShippingDimension = (
  product: {
    description?: string | null;
    name?: string | null;
    manufacturer?: string | null;
  },
  value: unknown,
  dimension: "length" | "width" | "height",
) => getShippingDimension(value) || `${estimateShippingDimensionsCm(product)[dimension].toFixed(1)} cm`;

export default async function handler(
  req: {
    method?: string;
  },
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "text/plain");
    res.end("Method not allowed");
    return;
  }

  const catalog = await loadMergedCatalogProducts();
  const excludedCodes = await loadGoogleFeedExclusions();
  const products = catalog.items
    .filter((product) => typeof product.price === "number" && product.price > 0)
    .filter((product) => Boolean(getGoogleImage(product, excludedCodes)))
    .slice(0, 50000);

  const items = products.map((product) => {
    const title = truncate(stripHtml(product.description || product.name || product.code), 150);
    const description = truncate(removeSupplierReferences(product.longDescription || product.description || product.name), 5000);
    const link = `${SITE_URL}/products/item/${encodeURIComponent(String(product.code))}`;
    const image = getGoogleImage(product, excludedCodes);
    const price = getPrice(product.price);
    const mpn = product.code;
    const shippingTags = [
      "      <g:shipping>",
      "        <g:country>AU</g:country>",
      "        <g:service>Australia Post Standard</g:service>",
      `        <g:price>${DEFAULT_GOOGLE_SHIPPING_PRICE_AUD.toFixed(2)} AUD</g:price>`,
      "      </g:shipping>",
      optionalTag("g:shipping_weight", getRequiredShippingWeight(product)),
      optionalTag("g:shipping_length", getRequiredShippingDimension(product, product.depthCm, "length")),
      optionalTag("g:shipping_width", getRequiredShippingDimension(product, product.widthCm, "width")),
      optionalTag("g:shipping_height", getRequiredShippingDimension(product, product.heightCm, "height")),
    ].filter((tag): tag is string => Boolean(tag));

    return [
      "    <item>",
      `      <g:id>${escapeXml(product.code)}</g:id>`,
      `      <g:title>${escapeXml(title)}</g:title>`,
      `      <g:description>${escapeXml(description)}</g:description>`,
      `      <g:link>${escapeXml(link)}</g:link>`,
      `      <g:image_link>${escapeXml(image)}</g:image_link>`,
      `      <g:availability>${getAvailability(product)}</g:availability>`,
      `      <g:price>${escapeXml(price)}</g:price>`,
      "      <g:condition>new</g:condition>",
      `      <g:brand>${escapeXml(product.manufacturer || "Internext")}</g:brand>`,
      `      <g:mpn>${escapeXml(mpn)}</g:mpn>`,
      `      <g:identifier_exists>yes</g:identifier_exists>`,
      `      <g:product_type>${escapeXml(getProductType(product))}</g:product_type>`,
      `      <g:google_product_category>${escapeXml(getGoogleProductCategory(product))}</g:google_product_category>`,
      ...shippingTags,
      "    </item>",
    ].join("\n");
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "  <channel>",
    "    <title>Internext Products</title>",
    `    <link>${SITE_URL}</link>`,
    "    <description>Internext product catalogue</description>",
    ...items,
    "  </channel>",
    "</rss>",
  ].join("\n");

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
  res.end(xml);
}
