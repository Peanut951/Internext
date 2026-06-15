import fs from "node:fs";
import path from "node:path";
import { loadLeaderFeedProducts } from "./lib/leader-feed.mjs";

const SITE_URL = "https://www.internext.com.au";
const publicDir = path.resolve("public");
const dataDir = path.join(publicDir, "data");
const outputPath = path.join(publicDir, "google-products.xml");
const DEFAULT_GOOGLE_SHIPPING_PRICE_AUD = 35;
const GOOGLE_IMAGE_FEED_VERSION = "20260609-1";

const BLOCKED_IMAGE_CODES = new Set([
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

const readJson = (filePath, fallback = []) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
};

const stripInvalidXmlChars = (value) =>
  String(value ?? "").replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD]/g, "");

const escapeXml = (value) =>
  stripInvalidXmlChars(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const stripHtml = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (value, maxLength) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}...` : value;

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

const removeSupplierReferences = (value) =>
  stripHtml(value)
    .replace(/\s*Product code:\s*[^.;]+[.;]?/gi, "")
    .replace(/\s*supplier reference:\s*[^.;]+[.;]?/gi, "")
    .replace(/\s*;?\s*supplier reference\s+[^.;]+[.;]?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const absoluteUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw, SITE_URL).href;
  } catch {
    return "";
  }
};

const isPlaceholderImage = (value) => /product-placeholder\.(svg|png)/i.test(String(value || ""));
const isTrackingImage = (value) => /\/controls\/bit\.gif$/i.test(String(value || "").trim());

const hasSupportedImageExtension = (url) => {
  try {
    return /\.(jpe?g|png|gif)$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

const getSupportedImageFormatCandidates = (value) => {
  const image = absoluteUrl(value);
  if (!image) return [];
  if (hasSupportedImageExtension(image)) return [image];

  try {
    const parsed = new URL(image);
    if (!/\/productimages\//i.test(parsed.pathname)) {
      return [];
    }

    return [".jpg", ".png", ".gif"].map((extension) => {
      const next = new URL(parsed.href);
      next.pathname = /\.[a-z0-9]+$/i.test(next.pathname)
        ? next.pathname.replace(/\.[a-z0-9]+$/i, extension)
        : `${next.pathname.replace(/\/$/, "")}${extension}`;
      return next.href;
    });
  } catch {
    return [];
  }
};

const getProductImageCandidates = (product) => {
  const gallery = Array.isArray(product.imageUrls) ? product.imageUrls : [];
  const candidates = [product.imageUrl, ...gallery]
    .flatMap(getSupportedImageFormatCandidates)
    .filter(Boolean)
    .filter((value) => !isPlaceholderImage(value) && !isTrackingImage(value));

  return Array.from(new Set(candidates)).sort((a, b) => {
    const aPreferred = /\/(original|large)\//i.test(a) ? 0 : 1;
    const bPreferred = /\/(original|large)\//i.test(b) ? 0 : 1;
    return aPreferred - bPreferred;
  });
};

const getFreshImageUrl = (value) => {
  const image = absoluteUrl(value);
  if (!image) return "";

  try {
    const parsed = new URL(image);
    parsed.searchParams.set("internext_google_image_v", GOOGLE_IMAGE_FEED_VERSION);
    return parsed.href;
  } catch {
    return image;
  }
};

const getGoogleImage = (product, excludedCodes) => {
  const code = String(product.code || "").trim().toUpperCase();
  if (excludedCodes.has(code)) return "";

  const image = getProductImageCandidates(product).find((value) => hasSupportedImageExtension(value)) || "";
  return image ? getFreshImageUrl(image) : "";
};

const getGoogleImages = (product, excludedCodes) => {
  const code = String(product.code || "").trim().toUpperCase();
  if (excludedCodes.has(code)) return [];

  return getProductImageCandidates(product)
    .filter((value) => hasSupportedImageExtension(value))
    .map(getFreshImageUrl)
    .filter(Boolean)
    .slice(0, 11);
};

const getProductText = (product) =>
  `${product.manufacturer || ""} ${product.name || ""} ${product.description || ""} ${product.longDescription || ""}`.toLowerCase();

const getProductType = (product) => {
  const text = getProductText(product);

  if (/\b(toner|cartridge|drum|ink|ribbon|printhead)\b/.test(text)) return "Print > Printer consumables";
  if (/\b(paper|roll|media|film|vinyl|label)\b/.test(text)) return "Print > Print media";
  if (/\b(printer|multifunction|mfp|copier|plotter|large format)\b/.test(text)) return "Print > Printers and multifunction devices";
  if (/\b(scanner|document scanner)\b/.test(text)) return "Print > Scanners";
  if (/\b(laptop|notebook|chromebook)\b/.test(text)) return "Computers > Laptops";
  if (/\b(tablet)\b/.test(text)) return "Computers > Tablets";
  if (/\b(desktop|workstation|pc\b|server)\b/.test(text)) return "Computers > Desktop computers and servers";
  if (/\b(monitor|display|screen|signage|panel)\b/.test(text)) return "Displays and AV > Displays";
  if (/\b(projector)\b/.test(text)) return "Displays and AV > Projectors";
  if (/\b(camera|cctv|nvr|dvr|surveillance)\b/.test(text)) return "Security > Surveillance";
  if (/\b(intercom|access control|rfid|door station)\b/.test(text)) return "Security > Access control";
  if (/\b(router|switch|access point|network|nas|storage|firewall|wifi|wi-fi)\b/.test(text)) return "Networking > Network hardware";
  if (/\b(phone|handset|headset|speakerphone|conference|voip|sip)\b/.test(text)) return "Unified communications > Phones and headsets";
  if (/\b(ups|battery|power supply|powerboard|pdu)\b/.test(text)) return "Power > UPS and power accessories";
  if (/\b(warranty|licen[cs]e|subscription|software|support|onsite|installation|service|renewal)\b/.test(text)) return "Services and software";

  return "Technology products";
};

const getGoogleProductCategory = (product) => {
  const type = getProductType(product);

  if (type.includes("Printer consumables")) return "Office Supplies > Office Instruments > Printer & Copier Accessories > Printer Consumables";
  if (type.includes("Print media")) return "Office Supplies > Office Paper Products";
  if (type.includes("Printers")) return "Electronics > Print, Copy, Scan & Fax > Printers, Copiers & Fax Machines";
  if (type.includes("Scanners")) return "Electronics > Print, Copy, Scan & Fax > Scanners";
  if (type.includes("Laptops")) return "Electronics > Computers > Laptops";
  if (type.includes("Tablets")) return "Electronics > Computers > Tablet Computers";
  if (type.includes("Desktop")) return "Electronics > Computers > Desktop Computers";
  if (type.includes("Displays")) return "Electronics > Video > Computer Monitors";
  if (type.includes("Projectors")) return "Electronics > Video > Projectors";
  if (type.includes("Surveillance")) return "Cameras & Optics > Cameras > Security Cameras";
  if (type.includes("Access control")) return "Hardware > Security & Locks";
  if (type.includes("Networking")) return "Electronics > Networking";
  if (type.includes("Unified communications")) return "Electronics > Communications > Telephony";
  if (type.includes("Power")) return "Electronics > Power";
  if (type === "Services and software") return "Software";

  return "Electronics";
};

const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const round = (value, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

const estimateShippingProfile = (product) => {
  const text = getProductText(product);

  const categoryEstimate = (() => {
    if (/\b(warranty|licen[cs]e|subscription|support|onsite|software|service|renewal)\b/.test(text)) return { weightKg: 0.1, lengthCm: 1, widthCm: 1, heightCm: 1 };
    if (/\b(ink|toner|cartridge|drum|ribbon|printhead)\b/.test(text)) return { weightKg: 0.8, lengthCm: 35, widthCm: 15, heightCm: 15 };
    if (/\b(cable|cord|lead|adapter|remote|mouse|keyboard|bracket|mount)\b/.test(text)) return { weightKg: 0.5, lengthCm: 25, widthCm: 18, heightCm: 8 };
    if (/\b(paper|roll|media|film|vinyl|label)\b/.test(text)) return { weightKg: 5, lengthCm: 65, widthCm: 25, heightCm: 25 };
    if (/\b(laptop|notebook|chromebook)\b/.test(text)) return { weightKg: 3, lengthCm: 45, widthCm: 35, heightCm: 12 };
    if (/\b(tablet)\b/.test(text)) return { weightKg: 1.2, lengthCm: 32, widthCm: 24, heightCm: 8 };
    if (/\b(monitor|display|screen|tv|signage|panel)\b/.test(text)) return { weightKg: 8, lengthCm: 80, widthCm: 55, heightCm: 20 };
    if (/\b(projector|speaker|soundbar|conference)\b/.test(text)) return { weightKg: 5, lengthCm: 45, widthCm: 35, heightCm: 20 };
    if (/\b(printer|multifunction|mfp|copier|scanner|plotter|large format)\b/.test(text)) return { weightKg: 25, lengthCm: 80, widthCm: 60, heightCm: 50 };
    if (/\b(server|workstation|desktop|pc\b|ups|battery)\b/.test(text)) return { weightKg: 12, lengthCm: 60, widthCm: 50, heightCm: 30 };
    if (/\b(camera|nvr|dvr|switch|router|phone|handset|headset|access point|ap\b|intercom)\b/.test(text)) return { weightKg: 2, lengthCm: 30, widthCm: 20, heightCm: 15 };
    return { weightKg: 1, lengthCm: 30, widthCm: 20, heightCm: 10 };
  })();

  return {
    weightKg: Math.max(0.1, round(toPositiveNumber(product.weightKg) ?? categoryEstimate.weightKg)),
    lengthCm: Math.max(1, round(toPositiveNumber(product.depthCm) ?? categoryEstimate.lengthCm, 1)),
    widthCm: Math.max(1, round(toPositiveNumber(product.widthCm) ?? categoryEstimate.widthCm, 1)),
    heightCm: Math.max(1, round(toPositiveNumber(product.heightCm) ?? categoryEstimate.heightCm, 1)),
  };
};

const getGoogleShippingWeight = (product) => `${estimateShippingProfile(product).weightKg.toFixed(2)} kg`;
const getGoogleShippingDimension = (product, dimension) =>
  `${Math.min(estimateShippingProfile(product)[dimension], 100).toFixed(1)} cm`;

const buildShoppingTitle = (product) => {
  const brand = stripHtml(product.manufacturer || "");
  const base = removeSupplierReferences(product.description || product.name || product.code);
  const mpn = getProductMpn(product);
  const normalizedBase = normalizeToken(base);
  const parts = [
    brand && !normalizedBase.startsWith(normalizeToken(brand)) ? brand : "",
    base,
    mpn && !normalizedBase.includes(normalizeToken(mpn)) ? mpn : "",
  ].filter(Boolean);

  return truncate(parts.join(" "), 150);
};

const getPrice = (value) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? `${value.toFixed(2)} AUD` : "";

const getAvailability = (product) => {
  if (product.price === null || product.price === undefined) return "out_of_stock";
  if (typeof product.stockQuantity === "number" && product.stockQuantity <= 0 && getAvailabilityDate(product)) return "backorder";
  if (/available to order|in stock/i.test(product.availabilityText || "")) return "in_stock";
  return typeof product.stockQuantity === "number" && product.stockQuantity <= 0 ? "out_of_stock" : "in_stock";
};

const optionalTag = (name, value) => (value ? `      <${name}>${escapeXml(value)}</${name}>` : null);

const getAvailabilityDate = (product) => {
  const raw = String(product.etaDate || "").trim();
  const dmy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00+1000`;
  }

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00+1000`;
  }

  return "";
};

const getProductKeys = (product) =>
  [product.code, product.supplierCode]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

const chooseHigherPricedProduct = (current, next) => {
  const currentPrice = Number(current?.resellerPrice ?? current?.price ?? current?.leaderDealerBuyEx ?? 0);
  const nextPrice = Number(next?.resellerPrice ?? next?.price ?? next?.leaderDealerBuyEx ?? 0);
  return nextPrice > currentPrice ? next : current;
};

const mergeProducts = (products) => {
  const merged = [];
  const indexByKey = new Map();

  for (const product of products) {
    const keys = getProductKeys(product);
    if (keys.length === 0) continue;

    const existingIndex = keys.map((key) => indexByKey.get(key)).find((index) => typeof index === "number");
    if (typeof existingIndex !== "number") {
      const nextIndex = merged.length;
      merged.push(product);
      keys.forEach((key) => indexByKey.set(key, nextIndex));
      continue;
    }

    const selected = chooseHigherPricedProduct(merged[existingIndex], product);
    merged[existingIndex] = selected;
    [...getProductKeys(product), ...getProductKeys(selected)].forEach((key) => indexByKey.set(key, existingIndex));
  }

  return merged;
};

let leaderFeedProducts = [];

try {
  leaderFeedProducts = await loadLeaderFeedProducts();
} catch (error) {
  console.warn(`Leader feed unavailable for Google product feed: ${error.message}`);
}

const exclusions = readJson(path.join(dataDir, "google-feed-exclusions.json"), { codes: [] });
const excludedCodes = new Set([
  ...BLOCKED_IMAGE_CODES,
  ...(Array.isArray(exclusions.codes) ? exclusions.codes : []).map((code) => String(code).trim().toUpperCase()).filter(Boolean),
]);

const products = mergeProducts([
  ...readJson(path.join(dataDir, "catalog-products.json")),
  ...readJson(path.join(dataDir, "leader-products.json")),
  ...leaderFeedProducts,
])
  .filter((product) => typeof product.price === "number" && product.price > 0)
  .filter((product) => Boolean(getGoogleImage(product, excludedCodes)))
  .slice(0, 50000);

const items = products.map((product) => {
  const images = getGoogleImages(product, excludedCodes);
  const image = images[0] || getGoogleImage(product, excludedCodes);
  const additionalImages = images.slice(1, 11);
  const mpn = getProductMpn(product);
  const gtin = getProductGtin(product);
  const availability = getAvailability(product);
  const availabilityDate = availability === "backorder" ? getAvailabilityDate(product) : "";
  const productType = getProductType(product);
  const shippingTags = [
    "      <g:shipping>",
    "        <g:country>AU</g:country>",
    "        <g:service>Australia Post Standard</g:service>",
    `        <g:price>${DEFAULT_GOOGLE_SHIPPING_PRICE_AUD.toFixed(2)} AUD</g:price>`,
    "      </g:shipping>",
    optionalTag("g:shipping_weight", getGoogleShippingWeight(product)),
    optionalTag("g:shipping_length", getGoogleShippingDimension(product, "lengthCm")),
    optionalTag("g:shipping_width", getGoogleShippingDimension(product, "widthCm")),
    optionalTag("g:shipping_height", getGoogleShippingDimension(product, "heightCm")),
  ].filter(Boolean);

  return [
    "    <item>",
    `      <g:id>${escapeXml(product.code)}</g:id>`,
    `      <g:title>${escapeXml(buildShoppingTitle(product))}</g:title>`,
    `      <g:description>${escapeXml(truncate(removeSupplierReferences(product.longDescription || product.description || product.name), 5000))}</g:description>`,
    `      <g:link>${escapeXml(`${SITE_URL}/products/item/${encodeURIComponent(String(product.code))}`)}</g:link>`,
    `      <g:image_link>${escapeXml(image)}</g:image_link>`,
    ...additionalImages.map((additionalImage) => `      <g:additional_image_link>${escapeXml(additionalImage)}</g:additional_image_link>`),
    `      <g:availability>${availability}</g:availability>`,
    optionalTag("g:availability_date", availabilityDate) || "",
    `      <g:price>${escapeXml(getPrice(product.price))}</g:price>`,
    "      <g:condition>new</g:condition>",
    `      <g:brand>${escapeXml(product.manufacturer || "Internext")}</g:brand>`,
    gtin ? `      <g:gtin>${escapeXml(gtin)}</g:gtin>` : "",
    `      <g:mpn>${escapeXml(mpn)}</g:mpn>`,
    `      <g:identifier_exists>${gtin || mpn ? "yes" : "no"}</g:identifier_exists>`,
    `      <g:product_type>${escapeXml(productType)}</g:product_type>`,
    `      <g:google_product_category>${escapeXml(getGoogleProductCategory(product))}</g:google_product_category>`,
    optionalTag("g:custom_label_0", productType.split(" > ")[0]) || "",
    optionalTag("g:custom_label_1", product.manufacturer || "Internext") || "",
    optionalTag("g:custom_label_2", availability) || "",
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
  "",
].join("\n");

fs.writeFileSync(outputPath, xml);
console.log(`Generated ${products.length} Google product feed items.`);
