import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isTangibleCatalogProduct, loadMergedCatalogProducts } from "../catalog/live.js";
import { getGoogleShippingDimension, getGoogleShippingWeight } from "../shipping/_estimates.js";

const SITE_URL = "https://www.internext.com.au";
const DEFAULT_GOOGLE_SHIPPING_PRICE_AUD = 35;
const GOOGLE_IMAGE_FEED_VERSION = "20260604-2";
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

const stripInvalidXmlChars = (value: unknown) =>
  String(value ?? "").replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD]/g, "");

const escapeXml = (value: unknown) =>
  stripInvalidXmlChars(value)
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
    .replace(/^\s*\d{8,14}\s+/, "")
    .replace(/\s*Product code:\s*[^.;]+[.;]?/gi, "")
    .replace(/\s*supplier reference:\s*[^.;]+[.;]?/gi, "")
    .replace(/\s*;?\s*supplier reference\s+[^.;]+[.;]?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeToken = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeGtin = (value: unknown) => {
  const digits = String(value || "").replace(/\D/g, "");
  return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits) ? digits : "";
};

const getProductGtin = (product: {
  gtin?: unknown;
  ean?: unknown;
  upc?: unknown;
  barcode?: unknown;
}) => normalizeGtin(product.gtin) || normalizeGtin(product.ean) || normalizeGtin(product.upc) || normalizeGtin(product.barcode);

const isBarcodeLikeCode = (value: string) => /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value.trim());

const stripInternalCodePrefix = (code: string, brand: string) => {
  const cleanCode = stripHtml(code);
  const cleanBrand = normalizeToken(brand);
  const prefix =
    cleanBrand === "akuvox" ? /^AK[-_]+/i
    : cleanBrand === "grandstream" ? /^GR[-_]+/i
    : cleanBrand === "yealink" ? /^IPY[-_]+/i
    : null;

  if (!prefix || !prefix.test(cleanCode)) {
    return cleanCode;
  }

  const stripped = cleanCode.replace(prefix, "").trim();
  return /[a-z]/i.test(stripped) && /\d/.test(stripped) ? stripped : cleanCode;
};

const getDisplayModelCode = (code: string, brand: string) => {
  const cleanBrand = normalizeToken(brand);
  const normalizedCode = normalizeToken(code);

  if (cleanBrand === "akuvox" && normalizedCode.startsWith("it88")) {
    return "IT88";
  }

  return code;
};

const getProductMpn = (product: {
  code?: string | null;
  supplierCode?: string | null;
  manufacturer?: string | null;
}) => {
  const supplierCode = String(product.supplierCode || "").trim();
  const brand = String(product.manufacturer || "").trim();
  const code = getDisplayModelCode(stripInternalCodePrefix(String(product.code || "").trim(), brand), brand);
  const cleanSupplierCode = getDisplayModelCode(stripInternalCodePrefix(supplierCode, brand), brand);

  if (
    cleanSupplierCode.length >= 3 &&
    !isBarcodeLikeCode(cleanSupplierCode) &&
    normalizeToken(cleanSupplierCode) !== normalizeToken(code)
  ) {
    return cleanSupplierCode;
  }

  return code;
};

const getProductText = (product: {
  manufacturer?: string | null;
  name?: string | null;
  description?: string | null;
  longDescription?: string | null;
}) =>
  `${product.manufacturer || ""} ${product.name || ""} ${product.description || ""} ${product.longDescription || ""}`.toLowerCase();

const getShoppingTitleProductType = (product: {
  manufacturer?: string | null;
  name?: string | null;
  description?: string | null;
  longDescription?: string | null;
}) => {
  const text = getProductText(product);

  if (/\btoner\b/.test(text)) return "Toner Cartridge";
  if (/\bink\b/.test(text)) return "Ink Cartridge";
  if (/\bdrum\b/.test(text)) return "Drum Unit";
  if (/\bribbon\b/.test(text)) return "Printer Ribbon";
  if (/\bprinthead\b/.test(text)) return "Printhead";
  if (/\b(paper|roll|media|film|vinyl|label)\b/.test(text)) return "Print Media";
  if (/\b(printer|multifunction|mfp|copier|plotter|large format)\b/.test(text)) return "Printer";
  if (/\b(scanner|document scanner)\b/.test(text)) return "Scanner";
  if (/\b(laptop|notebook|chromebook)\b/.test(text)) return "Laptop";
  if (/\btablet\b/.test(text)) return "Tablet";
  if (/\bserver\b/.test(text)) return "Server";
  if (/\b(desktop|workstation|pc\b)\b/.test(text)) return "Computer";
  if (/\bheadset\b/.test(text)) return "Headset";
  if (/\b(phone|handset|speakerphone|conference|voip|sip)\b/.test(text)) return "Business Phone";
  if (/\b(monitor|display|screen|signage|panel)\b/.test(text)) return "Display";
  if (/\bprojector\b/.test(text)) return "Projector";
  if (/\b(nvr|dvr)\b/.test(text)) return "Video Recorder";
  if (/\b(camera|cctv|surveillance)\b/.test(text)) return "Security Camera";
  if (/\b(intercom|access control|rfid|door station)\b/.test(text)) return "Access Control";
  if (/\b(access point|wifi|wi-fi|ap\b)\b/.test(text)) return "Wireless Access Point";
  if (/\bswitch\b/.test(text)) return "Network Switch";
  if (/\brouter\b/.test(text)) return "Router";
  if (/\b(nas|storage)\b/.test(text)) return "Network Storage";
  if (/\bfirewall\b/.test(text)) return "Firewall";
  if (/\bups\b/.test(text)) return "UPS";
  if (/\b(battery|power supply|powerboard|pdu)\b/.test(text)) return "Power Accessory";
  if (/\b(relay|controller|control module|interface)\b/.test(text)) return "Control Module";
  if (/\b(adapter|adaptor|converter|interface)\b/.test(text)) return "Adapter";
  if (/\b(cable|cord|lead)\b/.test(text)) return "Cable";
  if (/\b(mount|bracket|stand)\b/.test(text)) return "Mount";

  return "";
};

const removeLeadingBrandFromTitle = (title: string, brand: string) => {
  const cleanBrand = stripHtml(brand || "");
  const cleanTitle = stripHtml(title || "");
  if (!cleanBrand) return cleanTitle;

  const escapedBrand = cleanBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return cleanTitle.replace(new RegExp(`^${escapedBrand}\\s+`, "i"), "").trim();
};

const normalizeBaseTitleForProduct = (
  base: string,
  product: {
    code?: string | null;
    manufacturer?: string | null;
  },
  mpn: string,
) => {
  const brand = normalizeToken(product.manufacturer);
  const normalizedMpn = normalizeToken(mpn);

  if (brand === "akuvox" && normalizedMpn.startsWith("it88") && /\bindoor unit\b/i.test(base)) {
    const size = /\b10\s*(?:"|inch|in\b)?/i.test(base) ? `10" ` : "";
    const code = stripHtml(product.code);
    const mounting = /inwall|in-wall/i.test(code) ? " - In-Wall" : /onwall|on-wall/i.test(code) ? " - On-Wall" : "";
    const version = /\(([^)]+)\)/.exec(base)?.[0] || (/android/i.test(base) ? "(Android Version)" : "");
    return `${size}Smart Indoor Monitor${mounting} ${version}`.replace(/\s+/g, " ").trim();
  }

  return base;
};

const buildShoppingTitle = (product: {
  code?: string | null;
  supplierCode?: string | null;
  manufacturer?: string | null;
  name?: string | null;
  description?: string | null;
  longDescription?: string | null;
}) => {
  const brand = stripHtml(product.manufacturer || "");
  const rawBase = removeLeadingBrandFromTitle(
    removeSupplierReferences(product.description || product.name || product.code),
    brand,
  ).replace(/^\s*\d{8,14}\s+/, "");
  const mpn = getProductMpn(product);
  const base = normalizeBaseTitleForProduct(rawBase, product, mpn);
  const productType = getShoppingTitleProductType(product);
  const normalizedBase = normalizeToken(base);
  const normalizedType = normalizeToken(productType);
  const normalizedMpn = normalizeToken(mpn);
  const skipProductType =
    normalizeToken(brand) === "akuvox" &&
    normalizedMpn.startsWith("it88") &&
    /indoor monitor/i.test(base);
  const parts = [
    brand && !normalizedBase.startsWith(normalizeToken(brand)) ? brand : "",
    mpn && normalizedMpn && !normalizedBase.includes(normalizedMpn) ? mpn : "",
    productType &&
    !skipProductType &&
    normalizedType &&
    !normalizedBase.includes(normalizedType)
      ? productType
      : "",
    base,
  ].filter(Boolean);

  return truncate(parts.join(" "), 150);
};

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
      next.pathname = /\.[a-z0-9]+$/i.test(next.pathname)
        ? next.pathname.replace(/\.[a-z0-9]+$/i, extension)
        : `${next.pathname.replace(/\/$/, "")}${extension}`;
      return next.href;
    });
  } catch {
    return [image];
  }
};

const getProductImageCandidates = (product: {
  imageUrl?: string | null;
  imageUrls?: unknown;
  googleImageOverrides?: unknown;
}) => {
  const gallery = Array.isArray(product.imageUrls) ? product.imageUrls : [];
  const overrideGallery = Array.isArray(product.googleImageOverrides) ? product.googleImageOverrides : [];
  const sourceImages = overrideGallery.length ? overrideGallery : [product.imageUrl, ...gallery];
  const candidates = sourceImages
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
  googleImageOverrides?: unknown;
}, excludedCodes = GOOGLE_BLOCKED_IMAGE_PRODUCT_CODES) => {
  const code = String(product.code || "").trim().toUpperCase();
  if (excludedCodes.has(code)) {
    return "";
  }

  const image = getProductImageCandidates(product).find(isSupportedGoogleImageUrl) || "";
  return image ? getFreshGoogleImageUrl(image) : "";
};

const getGoogleImages = (product: {
  code?: string | null;
  imageUrl?: string | null;
  imageUrls?: unknown;
  googleImageOverrides?: unknown;
}, excludedCodes = GOOGLE_BLOCKED_IMAGE_PRODUCT_CODES) => {
  const code = String(product.code || "").trim().toUpperCase();
  if (excludedCodes.has(code)) {
    return [];
  }

  return getProductImageCandidates(product)
    .filter(isSupportedGoogleImageUrl)
    .map(getFreshGoogleImageUrl)
    .filter(Boolean)
    .slice(0, 11);
};

const loadGoogleFeedExclusions = async () => {
  const codes = new Set<string>();

  for (const fileName of ["google-feed-exclusions.json", "google-feed-invalid-image-codes.json"]) {
    try {
      const raw = await readFile(join(process.cwd(), "public", "data", fileName), "utf8");
      const parsed = JSON.parse(raw) as { codes?: unknown[] };
      for (const code of parsed.codes || []) {
        const normalized = String(code || "").trim().toUpperCase();
        if (normalized) codes.add(normalized);
      }
    } catch {
      // Missing exclusion files should not prevent feed generation.
    }
  }

  return codes;
};

const loadGoogleImageOverrides = async () => {
  try {
    const raw = await readFile(join(process.cwd(), "public", "data", "google-image-overrides.json"), "utf8");
    const parsed = JSON.parse(raw) as { images?: Record<string, unknown> };
    const entries = Object.entries(parsed.images || {}).map(([code, images]) => [
      code.trim().toUpperCase(),
      Array.isArray(images) ? images.filter(Boolean) : [],
    ] as const);

    return new Map(entries);
  } catch {
    return new Map<string, unknown[]>();
  }
};

const getAvailability = (product: {
  stockQuantity?: number | null;
  price?: number | null;
  availabilityText?: string | null;
  etaDate?: string | null;
}) => {
  if (product.price === null || product.price === undefined) {
    return "out_of_stock";
  }

  if (typeof product.stockQuantity === "number" && product.stockQuantity <= 0 && getAvailabilityDate(product)) {
    return "backorder";
  }

  if (/available to order|in stock/i.test(product.availabilityText || "")) {
    return "in_stock";
  }

  return (product.stockQuantity || 0) > 0 ? "in_stock" : "out_of_stock";
};

const buildShoppingDescription = (product: {
  code?: string | null;
  supplierCode?: string | null;
  manufacturer?: string | null;
  name?: string | null;
  description?: string | null;
  longDescription?: string | null;
  gtin?: unknown;
  ean?: unknown;
  upc?: unknown;
  barcode?: unknown;
  price?: number | null;
  stockQuantity?: number | null;
  availabilityText?: string | null;
  etaDate?: string | null;
}) => {
  const title = buildShoppingTitle(product);
  const brand = stripHtml(product.manufacturer || "");
  const mpn = getProductMpn(product);
  const gtin = getProductGtin(product);
  const productType = getProductType(product);
  const sourceDescription = removeSupplierReferences(product.longDescription || product.description || product.name || "");
  const availability = getAvailability(product).replace(/_/g, " ");
  const price = getPrice(product.price);
  const parts = [
    `${title} available from Internext Australia.`,
    brand ? `Brand: ${brand}.` : "",
    mpn ? `MPN: ${mpn}.` : "",
    gtin ? `GTIN: ${gtin}.` : "",
    productType && productType !== "Technology products" ? `Product type: ${productType}.` : "",
    price ? `Online price: ${price}.` : "",
    availability ? `Availability: ${availability}.` : "",
    sourceDescription && normalizeToken(sourceDescription) !== normalizeToken(title) ? sourceDescription : "",
    "Includes secure checkout, Australian delivery options, stock information where supplied, and customer support from Internext.",
  ].filter(Boolean);

  return truncate(parts.join(" "), 5000);
};

const getProductListingText = (product: {
  code?: string | null;
  supplierCode?: string | null;
  manufacturer?: string | null;
  name?: string | null;
  description?: string | null;
}) =>
  `${product.code || ""} ${product.supplierCode || ""} ${product.manufacturer || ""} ${product.name || ""} ${product.description || ""}`.toLowerCase();

const getProductType = (product: {
  manufacturer?: string | null;
  name?: string | null;
  description?: string | null;
  longDescription?: string | null;
}) => {
  const text = getProductText(product);

  if (/\b(toner|cartridge|drum|ink|ribbon|printhead)\b/.test(text)) return "Print > Printer consumables";
  if (/\b(paper|roll|media|film|vinyl|label)\b/.test(text)) return "Print > Print media";
  if (/\b(printer|multifunction|mfp|copier|plotter|large format)\b/.test(text)) return "Print > Printers and multifunction devices";
  if (/\b(scanner|document scanner)\b/.test(text)) return "Print > Scanners";
  if (/\b(laptop|notebook|chromebook)\b/.test(text)) return "Computers > Laptops";
  if (/\b(tablet)\b/.test(text)) return "Computers > Tablets";
  if (/\b(desktop|workstation|pc\b|server)\b/.test(text)) return "Computers > Desktop computers and servers";
  if (/\b(phone|handset|headset|speakerphone|conference|voip|sip)\b/.test(text)) return "Unified communications > Phones and headsets";
  if (/\b(monitor|display|screen|signage|panel)\b/.test(text)) return "Displays and AV > Displays";
  if (/\b(projector)\b/.test(text)) return "Displays and AV > Projectors";
  if (/\b(camera|cctv|nvr|dvr|surveillance)\b/.test(text)) return "Security > Surveillance";
  if (/\b(intercom|access control|rfid|door station)\b/.test(text)) return "Security > Access control";
  if (/\b(router|switch|access point|network|nas|storage|firewall|wifi|wi-fi)\b/.test(text)) return "Networking > Network hardware";
  if (/\b(ups|battery|power supply|powerboard|pdu)\b/.test(text)) return "Power > UPS and power accessories";
  if (/\b(relay|controller|control module|interface)\b/.test(text)) return "Technology accessories > Control modules";
  if (/\b(adapter|adaptor|converter)\b/.test(text)) return "Technology accessories > Adapters and converters";
  if (/\b(cable|cord|lead)\b/.test(text)) return "Technology accessories > Cables";
  if (/\b(mount|bracket|stand)\b/.test(text)) return "Technology accessories > Mounts and stands";
  if (/\b(warranty|licen[cs]e|subscription|software|support|onsite|install(?:ation|ations)?|instal|service|renewal|postscript|pdf\s+upgrade)\b/.test(text)) return "Services and software";

  return "Technology products";
};

const isGoogleMerchantPhysicalProduct = (product: {
  code?: string | null;
  supplierCode?: string | null;
  manufacturer?: string | null;
  name?: string | null;
  description?: string | null;
  longDescription?: string | null;
}) => {
  return isTangibleCatalogProduct(product as Record<string, unknown>);
};

const isLeaderLiveFeedImage = (product: { imageUrl?: string | null; imageUrls?: unknown }) => {
  const images = [product.imageUrl, ...(Array.isArray(product.imageUrls) ? product.imageUrls : [])];
  return images.some((image) => /https?:\/\/www\.leadersystems\.com\.au\/Images\//i.test(String(image || "")));
};

const getGoogleProductCategory = (product: {
  manufacturer?: string | null;
  name?: string | null;
  description?: string | null;
  longDescription?: string | null;
}) => {
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
  if (type.includes("Technology accessories")) return "Electronics";
  if (type === "Services and software") return "Software";

  return "Electronics";
};

const getPrice = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? `${value.toFixed(2)} AUD`
    : "";

const optionalTag = (name: string, value: string | null) =>
  value ? `      <${name}>${escapeXml(value)}</${name}>` : null;

const getAvailabilityDate = (product: { etaDate?: string | null }) => {
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

  try {
    const staticXml = await readFile(join(process.cwd(), "public", "google-products.xml"), "utf8");
    if (staticXml.trim()) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
      res.end(staticXml);
      return;
    }
  } catch {
    // Fall back to the dynamic catalog path when the build-time feed is unavailable.
  }

  const catalog = await loadMergedCatalogProducts();
  const excludedCodes = await loadGoogleFeedExclusions();
  const imageOverrides = await loadGoogleImageOverrides();
  const products = catalog.items
    .map((product) => {
      const overrideImages = imageOverrides.get(String(product.code || "").trim().toUpperCase());
      return overrideImages?.length ? { ...product, googleImageOverrides: overrideImages } : product;
    })
    .filter((product) => typeof product.price === "number" && product.price > 0)
    .filter((product) => !isLeaderLiveFeedImage(product))
    .filter(isGoogleMerchantPhysicalProduct)
    .filter((product) => Boolean(getGoogleImage(product, excludedCodes)))
    .slice(0, 50000);

  const items = products.map((product) => {
    const title = buildShoppingTitle(product);
    const description = buildShoppingDescription(product);
    const link = `${SITE_URL}/products/item/${encodeURIComponent(String(product.code))}`;
    const images = getGoogleImages(product, excludedCodes);
    const image = images[0] || getGoogleImage(product, excludedCodes);
    const additionalImages = images.slice(1, 11);
    const price = getPrice(product.price);
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
    ].filter((tag): tag is string => Boolean(tag));

    return [
      "    <item>",
      `      <g:id>${escapeXml(product.code)}</g:id>`,
      `      <g:title>${escapeXml(title)}</g:title>`,
      `      <g:description>${escapeXml(description)}</g:description>`,
      `      <g:link>${escapeXml(link)}</g:link>`,
      `      <g:image_link>${escapeXml(image)}</g:image_link>`,
      ...additionalImages.map((additionalImage) => `      <g:additional_image_link>${escapeXml(additionalImage)}</g:additional_image_link>`),
      `      <g:availability>${availability}</g:availability>`,
      optionalTag("g:availability_date", availabilityDate) || "",
      `      <g:price>${escapeXml(price)}</g:price>`,
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
  ].join("\n");

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
  res.end(xml);
}
