import { loadMergedCatalogProducts } from "../catalog/live.js";

const SITE_URL = "https://www.internext.com.au";

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
