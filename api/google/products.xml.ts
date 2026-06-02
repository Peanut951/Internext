import { loadMergedCatalogProducts } from "../catalog/live.js";

const SITE_URL = "https://www.internext.com.au";
const DEFAULT_GOOGLE_SHIPPING_PRICE_AUD = 35;

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

const isPlaceholderImage = (value: unknown) => String(value || "").includes("product-placeholder.svg");

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
  return centimetres ? `${centimetres.toFixed(1)} cm` : null;
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

  const catalog = await loadMergedCatalogProducts();
  const products = catalog.items
    .filter((product) => typeof product.price === "number" && product.price > 0)
    .filter((product) => Boolean(absoluteUrl(product.imageUrl)))
    .filter((product) => !isPlaceholderImage(product.imageUrl))
    .slice(0, 50000);

  const items = products.map((product) => {
    const title = truncate(stripHtml(product.description || product.name || product.code), 150);
    const description = truncate(stripHtml(product.longDescription || product.description || product.name), 5000);
    const link = `${SITE_URL}/products/item/${encodeURIComponent(String(product.code))}`;
    const image = absoluteUrl(product.imageUrl);
    const price = getPrice(product.price);
    const mpn = product.supplierCode || product.code;
    const shippingTags = [
      "      <g:shipping>",
      "        <g:country>AU</g:country>",
      "        <g:service>Australia Post Standard</g:service>",
      `        <g:price>${DEFAULT_GOOGLE_SHIPPING_PRICE_AUD.toFixed(2)} AUD</g:price>`,
      "      </g:shipping>",
      optionalTag("g:shipping_weight", getRequiredShippingWeight(product)),
      optionalTag("g:shipping_length", getShippingDimension(product.depthCm)),
      optionalTag("g:shipping_width", getShippingDimension(product.widthCm)),
      optionalTag("g:shipping_height", getShippingDimension(product.heightCm)),
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
