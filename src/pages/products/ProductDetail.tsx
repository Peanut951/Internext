import { type SyntheticEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2, Headphones, Minus, Plus, ShieldCheck, Truck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getProductImageCandidates,
  handleProductImageError,
  PRODUCT_IMAGE_PLACEHOLDER,
} from "@/lib/productImages";
import { loadCatalogProducts, loadCatalogProductsFast } from "@/lib/liveCatalog";
import { extractProductSpecHighlights } from "@/lib/productSpecs";
import { useAuthSession } from "@/hooks/use-auth-session";
import { formatAud, getCartPricedProduct, getDisplayPrice } from "@/lib/pricing";
import { trackAddToCart } from "@/lib/analytics";
import { getCartItems, saveCartItems, toCartProduct, type CartItem } from "@/lib/orderManagement";
import { useToast } from "@/hooks/use-toast";
import { buildProductDisplayTitle } from "@/lib/productTitles";

type CatalogProduct = {
  code: string;
  manufacturer: string;
  description: string;
  longDescription?: string;
  category?: string;
  subcategory?: string;
  leaderCategory?: string;
  price: number | null;
  priceText?: string;
  resellerPrice?: number | null;
  resellerPriceText?: string;
  rrp: number | null;
  rrpText?: string;
  imageUrl?: string;
  imageUrls?: string[];
  supplierCode?: string;
  gtin?: string;
  ean?: string;
  upc?: string;
  barcode?: string;
  availabilityText?: string;
  etaDate?: string;
  etaStatus?: string;
  liveCatalogError?: string;
  stockQuantity?: number;
  stockByWarehouse?: {
    adl: number;
    bne: number;
    mel: number;
    syd: number;
    wa: number;
    internext?: number;
    adminAdjustment?: number;
    adminLocation?: string;
  };
  stockRecordUpdated?: string;
  weightKg?: number | null;
  heightCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
  liveUpdatedAt?: string;
};

type AdminStockFormState = {
  stockQuantity: string;
  stockLocation: string;
  note: string;
};

type AdminStockMessage = {
  tone: "success" | "error";
  text: string;
};

const SITE_URL = "https://www.internext.com.au";
const DEFAULT_PUBLIC_SHIPPING_PRICE = 35;
const DEFAULT_DOCUMENT_TITLE = "Internext";
const STOCK_OVERRIDE_LOCATIONS = [
  { value: "internext", label: "Internext Warehouse" },
  { value: "adl", label: "Adelaide Warehouse" },
  { value: "bne", label: "Brisbane Warehouse" },
  { value: "mel", label: "Melbourne Warehouse" },
  { value: "syd", label: "Sydney Warehouse" },
  { value: "wa", label: "WA Warehouse" },
];

const getStockLocationLabel = (value: unknown) =>
  STOCK_OVERRIDE_LOCATIONS.find((location) => location.value === safeText(value).toLowerCase())?.label ||
  "Internext Warehouse";

const isProductInStoredCart = (productCode: string) =>
  getCartItems().some((item) => item.code === productCode);

const safeText = (value: unknown) => {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
};

const normalizeProductLookupKey = (value: unknown) =>
  safeText(value).toLowerCase();

const findProductByCode = (products: CatalogProduct[], productCode: string) => {
  const lookupKey = normalizeProductLookupKey(productCode);
  if (!lookupKey) {
    return null;
  }

  return (
    products.find(
      (item) =>
        normalizeProductLookupKey(item.code) === lookupKey ||
        normalizeProductLookupKey(item.supplierCode) === lookupKey,
    ) || null
  );
};

type DescriptionBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] };

const getDescriptionBlocksText = (blocks: DescriptionBlock[]) =>
  blocks
    .flatMap((block) => {
      if (block.type === "list") {
        return block.items;
      }
      return block.text;
    })
    .join(" ");

const descriptionBlocksToParagraphs = (blocks: DescriptionBlock[]) =>
  blocks.flatMap((block) => {
    if (block.type === "heading") {
      return [];
    }
    if (block.type === "list") {
      return block.items;
    }
    return block.text;
  });

const SUPPLIER_BULLET_PATTERN = /[•·●▪◦]/g;

const splitSupplierDescriptionBlocks = (value: unknown): DescriptionBlock[] => {
  const normalized = safeText(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|div|li|h[1-6]|ul|ol)>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&bull;|&#8226;|&#x2022;/gi, "•")
    .replace(/\u00a0/g, " ")
    .replace(/\s+(Features)\s*(?=[•·●▪◦-])/gi, "\n$1:\n")
    .replace(/\s+(Features:)\s*/gi, "\n$1\n")
    .replace(SUPPLIER_BULLET_PATTERN, "\n- ")
    .replace(/\s+(Typical applications include|Internext supplies this item|Buyers can use|This model is positioned|It is mainly intended|It is aimed at|Admin reference:)/g, "\n\n$1")
    .replace(/\s+-\s+/g, "\n- ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const blocks: DescriptionBlock[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", items: listItems });
      listItems = [];
    }
  };

  normalized.forEach((line) => {
    const bullet = line.match(/^[-*]\s*(.+)$/);
    if (bullet) {
      listItems.push(bullet[1].trim());
      return;
    }

    flushList();

    if (/^(features|key specifications|specifications|overview|admin reference):$/i.test(line) || (line.endsWith(":") && line.length <= 70)) {
      blocks.push({ type: "heading", text: line.replace(/:$/, "") });
      return;
    }

    blocks.push({ type: "paragraph", text: line });
  });

  flushList();
  return blocks;
};

const getPlainProductName = (product: CatalogProduct) => {
  const description = safeText(product.description) || safeText(product.code) || "Product";
  const manufacturer = safeText(product.manufacturer);

  if (!manufacturer) {
    return description;
  }

  const escapedManufacturer = manufacturer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return description.replace(new RegExp(`^${escapedManufacturer}\\s+`, "i"), "").trim();
};

const joinHighlights = (highlights: string[], limit = 3) => {
  const items = highlights.slice(0, limit);
  if (items.length === 0) {
    return "";
  }
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
};

const buildProductIntro = (product: CatalogProduct, highlights: string[]) => {
  const source = `${safeText(product.description)} ${safeText(product.longDescription)}`;
  const plainName = getPlainProductName(product);
  const leadHighlights = joinHighlights(highlights, 3);
  const withHighlights = leadHighlights ? ` Notable details include ${leadHighlights}.` : "";

  if (/(intercom|monitor|door station|access control|rfid|sip)/i.test(source)) {
    return `${plainName} is suited to intercom, access, and controlled-entry environments where clear communication and dependable day-to-day use matter.${withHighlights}`;
  }
  if (/(printer|scanner|mfp|document)/i.test(source)) {
    return `${plainName} is a practical fit for document-heavy environments where reliability, workflow fit, and throughput are important.${withHighlights}`;
  }
  if (/(router|switch|access point|network|vpn|storage|nas)/i.test(source)) {
    return `${plainName} is aimed at business networking and infrastructure rollouts where stable performance and straightforward deployment matter.${withHighlights}`;
  }
  if (/(display|panel|projector|signage|interactive)/i.test(source)) {
    return `${plainName} is well suited to commercial AV and visual communication spaces where screen performance and deployment context both matter.${withHighlights}`;
  }

  return `${plainName} is positioned as a practical option for professional and commercial deployment.${withHighlights}`;
};

const buildFullDescriptionBlocks = (product: CatalogProduct, highlights: string[]): DescriptionBlock[] => {
  const supplierBlocks = splitSupplierDescriptionBlocks(product.longDescription);
  if (supplierBlocks.length > 0) {
    return supplierBlocks;
  }

  const source = `${safeText(product.description)} ${safeText(product.longDescription)}`;
  const plainName = getPlainProductName(product);
  const paragraphs = [buildProductIntro(product, highlights)];
  const detailLead = joinHighlights(highlights, 4) || "the listed product specification";

  if (/(intercom|monitor|door station|access control|rfid|sip)/i.test(source)) {
    paragraphs.push(`It suits sites that need a practical balance between visitor communication, internal response, and dependable day-to-day operation. It is easiest to position when the customer is comparing indoor monitoring, door interaction, and rollout simplicity around ${detailLead}.`);
  } else if (/(printer|scanner|mfp|document)/i.test(source)) {
    paragraphs.push(`It is best suited to workplaces comparing output speed, workflow fit, and serviceability. It works well where teams want a dependable option built around ${detailLead}.`);
  } else if (/(router|switch|access point|network|vpn|storage|nas)/i.test(source)) {
    paragraphs.push(`It fits network and infrastructure projects where capability, rollout clarity, and ongoing reliability are being weighed together. It is easiest to compare when the shortlist is being narrowed by ${detailLead}.`);
  } else if (/(display|panel|projector|signage|interactive)/i.test(source)) {
    paragraphs.push(`It suits visual communication and presentation projects where screen format, deployment setting, and user experience all matter. It is easiest to position when customers are comparing options around ${detailLead}.`);
  } else {
    paragraphs.push(`It is best positioned as a practical commercial option where customers are evaluating reliability, deployment fit, and value around ${detailLead}.`);
  }

  return paragraphs.map((text) => ({ type: "paragraph", text }));
};

const formatMeasurement = (value: number | null | undefined, unit: string) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return `${value.toLocaleString("en-AU", { maximumFractionDigits: 2 })}${unit}`;
};

const getMeasurementRows = (product: CatalogProduct) => [
  { label: "Weight", value: formatMeasurement(product.weightKg, "kg") },
  { label: "Height", value: formatMeasurement(product.heightCm, "cm") },
  { label: "Width", value: formatMeasurement(product.widthCm, "cm") },
  { label: "Depth", value: formatMeasurement(product.depthCm, "cm") },
].filter((row): row is { label: string; value: string } => Boolean(row.value));

const getInternextStockQuantity = (product?: CatalogProduct | null) =>
  typeof product?.stockByWarehouse?.internext === "number"
    ? product.stockByWarehouse.internext
    : 0;

const getAdminStockAdjustment = (product?: CatalogProduct | null) =>
  typeof product?.stockByWarehouse?.adminAdjustment === "number"
    ? product.stockByWarehouse.adminAdjustment
    : getInternextStockQuantity(product);

const getAdminStockLocation = (product?: CatalogProduct | null) =>
  safeText(product?.stockByWarehouse?.adminLocation) || "internext";

const getSupplierStockQuantity = (product?: CatalogProduct | null) => {
  if (!product || typeof product.stockQuantity !== "number") {
    return 0;
  }

  return Math.max(0, product.stockQuantity - getAdminStockAdjustment(product));
};

const applyAdminStockToProduct = (
  product: CatalogProduct,
  desiredTotalStock: number,
  stockLocation = getAdminStockLocation(product),
): CatalogProduct => {
  const supplierStock = getSupplierStockQuantity(product);
  const adminAdjustment = desiredTotalStock - supplierStock;
  const totalStock = Math.max(0, supplierStock + adminAdjustment);
  const normalizedLocation = STOCK_OVERRIDE_LOCATIONS.some((location) => location.value === stockLocation)
    ? stockLocation
    : "internext";
  const stockByWarehouse = {
    adl: product.stockByWarehouse?.adl ?? 0,
    bne: product.stockByWarehouse?.bne ?? 0,
    mel: product.stockByWarehouse?.mel ?? 0,
    syd: product.stockByWarehouse?.syd ?? 0,
    wa: product.stockByWarehouse?.wa ?? 0,
    internext: product.stockByWarehouse?.internext ?? 0,
    adminAdjustment,
    adminLocation: normalizedLocation,
  };

  if (normalizedLocation === "internext") {
    stockByWarehouse.internext = Math.max(0, stockByWarehouse.internext + adminAdjustment);
  } else {
    stockByWarehouse[normalizedLocation] = Math.max(0, stockByWarehouse[normalizedLocation] + adminAdjustment);
  }

  return {
    ...product,
    availabilityText: totalStock > 0 ? "In Stock" : product.availabilityText,
    stockQuantity: totalStock,
    stockByWarehouse,
    stockRecordUpdated: new Date().toISOString(),
  };
};

const getAdminStockDisplayValue = (product?: CatalogProduct | null) =>
  typeof product?.stockQuantity === "number" ? String(product.stockQuantity) : "";

const getAdminStockAdjustmentSummary = (product?: CatalogProduct | null) => {
  if (!product || typeof product.stockQuantity !== "number") {
    return "";
  }

  const supplierStock = getSupplierStockQuantity(product);
  const adjustment = getAdminStockAdjustment(product);

  if (adjustment === 0) {
    return `Supplier stock currently accounts for all ${supplierStock.toLocaleString("en-AU")} units.`;
  }

  return `Supplier stock ${supplierStock.toLocaleString("en-AU")} ${
    adjustment > 0 ? "+" : "-"
  } ${getStockLocationLabel(getAdminStockLocation(product))} adjustment ${Math.abs(adjustment).toLocaleString("en-AU")} = ${product.stockQuantity.toLocaleString("en-AU")} total.`;
};

const getAvailabilityRows = (product: CatalogProduct) => {
  const availabilityText = safeText(product.availabilityText);
  const etaDate = safeText(product.etaDate);
  const etaStatus = safeText(product.etaStatus);
  const rows = [
    availabilityText
      ? { label: "Status", value: availabilityText }
      : null,
    typeof product.stockQuantity === "number"
      ? { label: "Total Available", value: product.stockQuantity.toLocaleString("en-AU") }
      : null,
    product.stockByWarehouse && product.stockByWarehouse.adl > 0
      ? { label: "Adelaide Warehouse", value: product.stockByWarehouse.adl.toLocaleString("en-AU") }
      : null,
    product.stockByWarehouse && product.stockByWarehouse.bne > 0
      ? { label: "Brisbane Warehouse", value: product.stockByWarehouse.bne.toLocaleString("en-AU") }
      : null,
    product.stockByWarehouse && product.stockByWarehouse.mel > 0
      ? { label: "Melbourne Warehouse", value: product.stockByWarehouse.mel.toLocaleString("en-AU") }
      : null,
    product.stockByWarehouse && product.stockByWarehouse.syd > 0
      ? { label: "Sydney Warehouse", value: product.stockByWarehouse.syd.toLocaleString("en-AU") }
      : null,
    product.stockByWarehouse && product.stockByWarehouse.wa > 0
      ? { label: "WA Warehouse", value: product.stockByWarehouse.wa.toLocaleString("en-AU") }
      : null,
    getInternextStockQuantity(product) > 0
      ? { label: "Internext Warehouse", value: getInternextStockQuantity(product).toLocaleString("en-AU") }
      : null,
    etaDate
      ? { label: "Next ETA", value: etaDate }
      : null,
    etaStatus && etaStatus !== availabilityText && etaStatus !== etaDate
      ? { label: "ETA Status", value: etaStatus }
      : null,
  ];

  return rows.filter((row): row is { label: string; value: string } => Boolean(row));
};

const getStockSummary = (product: CatalogProduct) => {
  const etaDate = safeText(product.etaDate);
  const etaStatus = safeText(product.etaStatus);
  if (typeof product.stockQuantity === "number") {
    if (product.stockQuantity > 0) {
      return `${product.stockQuantity.toLocaleString("en-AU")} available across warehouse stock`;
    }

    if (etaDate) {
      return `Currently out of stock. Next ETA ${etaDate}`;
    }

    if (etaStatus && !/^(check availability|in stock)$/i.test(etaStatus)) {
      return `Currently out of stock. ${etaStatus}`;
    }

    return "Currently out of stock. Call 1300 U R NEXT (1300 876 398) for ETA";
  }

  return safeText(product.availabilityText) || "Stock confirmed before checkout";
};

const getDeliverySummary = (product: CatalogProduct) => {
  if (typeof product.stockQuantity === "number" && product.stockQuantity <= 0) {
    const etaDate = safeText(product.etaDate);
    return etaDate ? `Backorder available from ${etaDate}` : "Delivery timing confirmed once ETA is available";
  }

  return "Shipping calculated at checkout from product dimensions and delivery postcode";
};

const getSchemaAvailability = (product: CatalogProduct) => {
  if (/available to order|in stock/i.test(safeText(product.availabilityText))) {
    return "https://schema.org/InStock";
  }

  return typeof product.stockQuantity === "number" && product.stockQuantity > 0
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
};

const toAbsoluteUrl = (value: string) => {
  try {
    return new URL(value, SITE_URL).href;
  } catch {
    return "";
  }
};

const truncateText = (value: unknown, maxLength: number) => {
  const text = safeText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trim()}...` : text;
};

const normalizeToken = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeGtin = (value: unknown) => {
  const digits = String(value || "").replace(/\D/g, "");
  return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits) ? digits : "";
};

const getProductGtin = (product: CatalogProduct) =>
  normalizeGtin(product.gtin) || normalizeGtin(product.ean) || normalizeGtin(product.upc) || normalizeGtin(product.barcode);

const getProductMpn = (product: CatalogProduct) => {
  const supplierCode = safeText(product.supplierCode);
  const code = safeText(product.code);

  if (supplierCode.length >= 3 && normalizeToken(supplierCode) !== normalizeToken(code)) {
    return supplierCode;
  }

  return code;
};

const getSeoProductType = (product: CatalogProduct) => {
  const text = `${safeText(product.manufacturer)} ${safeText(product.description)} ${safeText(product.longDescription)}`.toLowerCase();

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
  if (/\b(phone|handset|headset|speakerphone|conference|voip|sip)\b/.test(text)) return "Business Phone";
  if (/\b(monitor|display|screen|signage|panel)\b/.test(text)) return "Commercial display";
  if (/\b(projector)\b/.test(text)) return "Projector";
  if (/\b(camera|cctv|nvr|dvr|surveillance)\b/.test(text)) return "Security camera";
  if (/\b(intercom|access control|rfid|door station)\b/.test(text)) return "Access control device";
  if (/\b(router|switch|access point|network|nas|storage|firewall|wifi|wi-fi)\b/.test(text)) return "Network hardware";
  if (/\b(ups|battery|power supply|powerboard|pdu)\b/.test(text)) return "Power accessory";
  if (/\b(relay|controller|control module|interface)\b/.test(text)) return "Control module";
  if (/\b(adapter|adaptor|converter|interface)\b/.test(text)) return "Adapter";
  if (/\b(cable|cord|lead)\b/.test(text)) return "Cable";
  if (/\b(mount|bracket|stand)\b/.test(text)) return "Mount";

  return "";
};

const getRecommendationPrimaryText = (product: CatalogProduct) =>
  [
    product.manufacturer,
    product.description,
    product.code,
    product.supplierCode,
    product.category,
    product.subcategory,
    product.leaderCategory,
  ]
    .map(safeText)
    .join(" ")
    .toLowerCase();

const getRecommendationKind = (product: CatalogProduct) => {
  const text = getRecommendationPrimaryText(product);

  if (/\b(toner|toner cartridge)\b/.test(text)) return "print-toner";
  if (/\b(ink|ink cartridge)\b/.test(text)) return "print-ink";
  if (/\bdrum\b/.test(text)) return "print-drum";
  if (/\bribbon\b/.test(text)) return "print-ribbon";
  if (/\bprinthead\b/.test(text)) return "printhead";
  if (/\b(paper|roll|media|film|vinyl|label)\b/.test(text)) return "print-media";
  if (/\b(scanner|document scanner)\b/.test(text)) return "scanner";
  if (/\b(printer|multifunction|mfp|copier|plotter|large format)\b/.test(text)) return "printer";

  if (/\btrolley\b/.test(text)) return "trolley";
  if (/\b(floor stand|display stand|screen stand|tv stand)\b/.test(text)) return "floor-stand";
  if (/\b(wall mount|wall bracket|bracket|mount)\b/.test(text)) return "mount-bracket";
  if (/\bprojector\b/.test(text)) return "projector";
  if (/\b(interactive|ifp|touch\s*screen|touchscreen)\b/.test(text) && /\b(display|panel|screen|board)\b/.test(text)) {
    return "interactive-display";
  }
  if (/\b(tv|television|bravia)\b/.test(text)) return "tv";
  if (/\b(monitor|display|screen|signage|panel)\b/.test(text)) return "commercial-display";

  if (/\b(nvr|dvr|recorder)\b/.test(text)) return "video-recorder";
  if (/\b(ptz|turret|bullet|dome|camera|cctv|surveillance)\b/.test(text)) return "security-camera";
  if (/\b(intercom|door station|door phone|access control|rfid|biometric|fingerprint|card reader)\b/.test(text)) {
    return "access-control";
  }

  if (/\b(base station|base unit|dect base|wireless base)\b/.test(text)) return "uc-base-station";
  if (/\bheadset\b/.test(text)) return "uc-headset";
  if (/\b(conference|speakerphone)\b/.test(text)) return "uc-conference";
  if (/\bhandset\b/.test(text)) return "uc-handset";
  if (/\b(ip phone|voip phone|sip phone|deskphone|desk phone|telephone|phone)\b/.test(text)) return "uc-desk-phone";

  if (/\b(access point|wireless ap|wi-fi ap|wifi ap)\b/.test(text)) return "network-access-point";
  if (/\bswitch\b/.test(text)) return "network-switch";
  if (/\brouter\b/.test(text)) return "network-router";
  if (/\bfirewall\b/.test(text)) return "network-firewall";
  if (/\b(nas|storage)\b/.test(text)) return "network-storage";

  if (/\bups\b/.test(text)) return "ups";
  if (/\b(battery|power supply|powerboard|pdu)\b/.test(text)) return "power-accessory";
  if (/\b(relay|controller|control module)\b/.test(text)) return "control-module";
  if (/\b(adapter|adaptor|converter|interface)\b/.test(text)) return "adapter";
  if (/\b(cable|cord|lead)\b/.test(text)) return "cable";
  if (/\b(laptop|notebook|chromebook)\b/.test(text)) return "laptop";
  if (/\btablet\b/.test(text)) return "tablet";
  if (/\bserver\b/.test(text)) return "server";
  if (/\b(desktop|workstation|pc\b)\b/.test(text)) return "desktop";

  return "";
};

const PRODUCT_RECOMMENDATION_STOP_WORDS = new Set([
  "and",
  "for",
  "with",
  "the",
  "this",
  "that",
  "from",
  "into",
  "plus",
  "inch",
  "inches",
  "black",
  "white",
  "grey",
  "gray",
  "new",
  "product",
  "series",
  "business",
  "commercial",
  "professional",
  "compatible",
  "replacement",
  "includes",
  "pack",
  "ready",
  "high",
  "quality",
  "unit",
  "device",
  "australia",
  "internext",
]);

const getRecommendationTokens = (product: CatalogProduct) =>
  new Set(
    `${safeText(product.manufacturer)} ${safeText(product.description)} ${safeText(product.code)} ${safeText(product.supplierCode)} ${safeText(product.category)} ${safeText(product.subcategory)} ${safeText(product.leaderCategory)}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !PRODUCT_RECOMMENDATION_STOP_WORDS.has(token)),
  );

const getModelTokens = (product: CatalogProduct) =>
  new Set(
    `${safeText(product.description)} ${safeText(product.code)} ${safeText(product.supplierCode)}`
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => /^(?=.*[a-z])(?=.*[0-9])[a-z0-9]{3,}$/.test(token)),
  );

const getSeriesTokens = (product: CatalogProduct) =>
  new Set(
    Array.from(getModelTokens(product))
      .map((token) => token.match(/^[a-z]+/)?.[0] || "")
      .filter((token) => token.length >= 3),
  );

const getSizeTokens = (product: CatalogProduct) =>
  new Set(
    safeText(product.description)
      .toLowerCase()
      .match(/\b(?:[1-9][0-9]{1,2})(?:\.\d+)?\s?(?:inch|in|")\b/g)
      ?.map((value) => value.replace(/[^0-9.]/g, ""))
      .filter(Boolean) || [],
  );

const countSharedRecommendationTokens = (left: Set<string>, right: Set<string>) => {
  let count = 0;
  left.forEach((token) => {
    if (right.has(token)) {
      count += 1;
    }
  });
  return count;
};

const getCodeFamily = (value: unknown) =>
  safeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .split("-")
    .filter((part) => part.length >= 2)
    .slice(0, 2)
    .join("-");

const SAME_BRAND_REQUIRED_KINDS = new Set([
  "uc-base-station",
  "uc-desk-phone",
  "uc-handset",
  "uc-headset",
  "uc-conference",
  "security-camera",
  "video-recorder",
  "access-control",
  "interactive-display",
  "commercial-display",
  "tv",
]);

const STRICT_FAMILY_KINDS = new Set([
  "mount-bracket",
  "floor-stand",
  "trolley",
  "adapter",
  "cable",
  "power-accessory",
  "control-module",
  "print-toner",
  "print-ink",
  "print-drum",
  "print-ribbon",
  "printhead",
]);

const scoreSimilarProduct = (
  current: CatalogProduct,
  candidate: CatalogProduct,
  currentTokens: Set<string>,
) => {
  if (candidate.code === current.code) {
    return -1;
  }

  const candidateImage = getProductImageCandidates(candidate)[0];
  if (!candidateImage) {
    return -1;
  }

  const currentBrand = normalizeToken(current.manufacturer);
  const candidateBrand = normalizeToken(candidate.manufacturer);
  const currentKind = getRecommendationKind(current);
  const candidateKind = getRecommendationKind(candidate);
  const currentType = getSeoProductType(current);
  const candidateType = getSeoProductType(candidate);
  const candidateTokens = getRecommendationTokens(candidate);
  const sharedTokens = countSharedRecommendationTokens(currentTokens, candidateTokens);
  const sharedModelTokens = countSharedRecommendationTokens(getModelTokens(current), getModelTokens(candidate));
  const sharedSeriesTokens = countSharedRecommendationTokens(getSeriesTokens(current), getSeriesTokens(candidate));
  const sharedSizeTokens = countSharedRecommendationTokens(getSizeTokens(current), getSizeTokens(candidate));
  const currentFamily = getCodeFamily(current.code || current.supplierCode);
  const candidateFamily = getCodeFamily(candidate.code || candidate.supplierCode);
  const sameBrand = Boolean(currentBrand && currentBrand === candidateBrand);
  const sameType = Boolean(currentType && currentType === candidateType);
  const sameFamily = Boolean(currentFamily && candidateFamily && currentFamily === candidateFamily);

  if (!currentKind || currentKind !== candidateKind) {
    return -1;
  }

  if (SAME_BRAND_REQUIRED_KINDS.has(currentKind) && !sameBrand) {
    return -1;
  }

  if (STRICT_FAMILY_KINDS.has(currentKind) && !sameBrand && !sameFamily && sharedModelTokens === 0) {
    return -1;
  }

  if (
    ["print-toner", "print-ink", "print-drum", "print-ribbon", "printhead"].includes(currentKind) &&
    sharedModelTokens === 0 &&
    sharedSeriesTokens === 0
  ) {
    return -1;
  }

  if (
    ["mount-bracket", "floor-stand", "trolley"].includes(currentKind) &&
    sharedSizeTokens === 0 &&
    sharedModelTokens === 0 &&
    sharedTokens < 4
  ) {
    return -1;
  }

  if (!sameBrand && !sameFamily && sharedModelTokens === 0 && sharedSeriesTokens === 0 && sharedTokens < 3) {
    return -1;
  }

  let score = 0;
  score += 12;
  if (sameBrand) {
    score += 6;
  }
  if (sameType) {
    score += 7;
  }
  if (sameFamily) {
    score += 4;
  }
  score += sharedModelTokens * 4;
  score += sharedSeriesTokens * 2;
  score += sharedSizeTokens * 3;
  score += Math.min(sharedTokens, 8);

  if (typeof current.price === "number" && typeof candidate.price === "number" && current.price > 0) {
    const priceRatio = candidate.price / current.price;
    if (priceRatio < 0.2 && sharedModelTokens === 0 && !sameFamily) {
      return -1;
    }
    if (priceRatio > 5 && sharedModelTokens === 0 && !sameFamily) {
      return -1;
    }
    if (priceRatio >= 0.6 && priceRatio <= 1.6) {
      score += 2;
    }
  }

  return score;
};

const removeLeadingBrandFromTitle = (title: string, brand: string) => {
  const cleanBrand = safeText(brand);
  const cleanTitle = safeText(title);
  if (!cleanBrand) return cleanTitle;

  const escapedBrand = cleanBrand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return cleanTitle.replace(new RegExp(`^${escapedBrand}\\s+`, "i"), "").trim();
};

const buildSearchTitleText = (product: CatalogProduct) => {
  const brand = safeText(product.manufacturer);
  const base = removeLeadingBrandFromTitle(safeText(product.description) || safeText(product.code) || "Product", brand);
  const mpn = getProductMpn(product);
  const productType = getSeoProductType(product);
  const normalizedBase = normalizeToken(base);
  const normalizedType = normalizeToken(productType);
  const normalizedMpn = normalizeToken(mpn);
  const parts = [
    brand && !normalizedBase.startsWith(normalizeToken(brand)) ? brand : "",
    mpn && normalizedMpn && !normalizedBase.includes(normalizedMpn) ? mpn : "",
    productType && normalizedType && !normalizedBase.includes(normalizedType) ? productType : "",
    base,
  ].filter(Boolean);

  return parts.join(" ");
};

const setNamedMeta = (selector: string, attribute: "name" | "property", key: string, content: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
};

const setCanonicalLink = (href: string) => {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.appendChild(element);
  }

  element.setAttribute("href", href);
};

const getPublicProductUrl = (productCode: string) =>
  `${SITE_URL}/products/item/${encodeURIComponent(safeText(productCode))}`;

const getProductMetaDescription = (
  product: CatalogProduct,
  description: string,
  availability: string,
) => {
  const price = product.price ? formatAud(product.price) : null;
  const productType = getSeoProductType(product);
  const mpn = getProductMpn(product);
  const gtin = getProductGtin(product);
  const title = buildSearchTitleText(product);
  const parts = [
    `Shop ${title} at Internext Australia.`,
    productType ? `${productType} for Australian business and home customers.` : null,
    mpn ? `MPN ${mpn}.` : null,
    gtin ? `GTIN ${gtin}.` : null,
    price ? `${price} Inc GST.` : null,
    availability ? `${availability}.` : null,
    description,
  ].filter(Boolean);

  return truncateText(parts.join(" "), 155);
};

const getProductStructuredDescription = (product: CatalogProduct, paragraphs: string[]) => {
  const productType = getSeoProductType(product);
  const mpn = getProductMpn(product);
  const gtin = getProductGtin(product);
  const searchTitle = buildSearchTitleText(product);
  const parts = [
    `${searchTitle} from Internext Australia.`,
    productType ? `Product type: ${productType}.` : "",
    mpn ? `MPN: ${mpn}.` : "",
    gtin ? `GTIN: ${gtin}.` : "",
    paragraphs.join(" "),
    "Includes secure checkout, Australian delivery options, and Internext customer support.",
  ].filter(Boolean);

  return parts.join(" ");
};

const ProductDetail = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const productCode = code || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<CatalogProduct | null>(null);
  const [allProducts, setAllProducts] = useState<CatalogProduct[]>([]);
  const [isLivePriceReady, setIsLivePriceReady] = useState(false);
  const [hasCheckedFullCatalog, setHasCheckedFullCatalog] = useState(false);
  const [qty, setQty] = useState(1);
  const [isInCart, setIsInCart] = useState(false);
  const [activeImage, setActiveImage] = useState<string>("");
  const [adminStockForm, setAdminStockForm] = useState<AdminStockFormState>({
    stockQuantity: "",
    stockLocation: "internext",
    note: "",
  });
  const [adminStockSaving, setAdminStockSaving] = useState(false);
  const [adminStockMessage, setAdminStockMessage] = useState<AdminStockMessage | null>(null);
  const { session } = useAuthSession();
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      document.title = DEFAULT_DOCUMENT_TITLE;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setIsInCart(isProductInStoredCart(productCode));
    setIsLivePriceReady(false);
    setHasCheckedFullCatalog(false);
    setLoading(true);
    setError(null);
    setProduct(null);
    setAllProducts([]);
    const loadProduct = async () => {
      let hasAppliedVerifiedProduct = false;
      try {
        const data = (await loadCatalogProductsFast((liveProducts) => {
          const liveProduct = findProductByCode(liveProducts as CatalogProduct[], productCode);
          if (isMounted && liveProduct) {
            hasAppliedVerifiedProduct = true;
            setAllProducts(liveProducts as CatalogProduct[]);
            setProduct(liveProduct);
            setIsLivePriceReady(true);
            setHasCheckedFullCatalog(true);
            setLoading(false);
          }
        })) as CatalogProduct[];

        const found = findProductByCode(data, productCode);
        if (!isMounted) {
          return;
        }

        if (hasAppliedVerifiedProduct) {
          return;
        }

        if (found) {
          setAllProducts(data);
          setProduct(found);
          setIsLivePriceReady(
            Boolean(found.liveUpdatedAt) ||
              safeText(found.manufacturer).toLowerCase() === "leader",
          );
          setLoading(false);

          try {
            const liveProducts = (await loadCatalogProducts({ forceRefresh: true })) as CatalogProduct[];
            const liveFound = findProductByCode(liveProducts, productCode);
            if (isMounted && liveFound) {
              setAllProducts(liveProducts);
              setProduct(liveFound);
              setIsLivePriceReady(true);
              setHasCheckedFullCatalog(true);
            }
          } catch {
            if (isMounted) {
              setHasCheckedFullCatalog(true);
            }
          }
          return;
        }

        const liveProducts = (await loadCatalogProducts({ forceRefresh: true })) as CatalogProduct[];
        const liveFound = findProductByCode(liveProducts, productCode);
        if (!isMounted) {
          return;
        }

        setAllProducts(liveProducts);
        setProduct(liveFound);
        setIsLivePriceReady(Boolean(liveFound));
        setHasCheckedFullCatalog(true);
        setLoading(false);
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unable to load product.");
          setHasCheckedFullCatalog(true);
          setLoading(false);
        }
      }
    };

    loadProduct();
    return () => {
      isMounted = false;
    };
  }, [productCode]);

  const displayPrice = useMemo(() => {
    if (!product) {
      return "";
    }
    return isLivePriceReady ? getDisplayPrice(product, session?.role) : "Checking price...";
  }, [isLivePriceReady, product, session?.role]);

  useEffect(() => {
    if (session?.role !== "admin" || !product) {
      return;
    }

    setAdminStockForm({
      stockQuantity: getAdminStockDisplayValue(product),
      stockLocation: getAdminStockLocation(product),
      note: "",
    });
    setAdminStockMessage(null);
  }, [product?.code, product?.stockQuantity, product?.stockByWarehouse?.adminAdjustment, product?.stockByWarehouse?.adminLocation, product?.stockByWarehouse?.internext, session?.role]);

  const availability = useMemo(() => {
    if (!product) {
      return "";
    }

    return (
      safeText(product.availabilityText) ||
      (typeof product.stockQuantity === "number" ? `${product.stockQuantity} available` : "")
    );
  }, [product]);

  const availabilityRows = useMemo(() => {
    if (!product) {
      return [];
    }

    return getAvailabilityRows(product);
  }, [product]);

  const galleryImages = useMemo(() => {
    if (!product) {
      return [];
    }
    const candidates = getProductImageCandidates(product);
    if (candidates.length > 0) {
      return candidates;
    }
    return [];
  }, [product]);

  const similarProducts = useMemo(() => {
    if (!product || allProducts.length === 0) {
      return [];
    }

    const currentTokens = getRecommendationTokens(product);
    return allProducts
      .map((candidate) => ({
        product: candidate,
        image: getProductImageCandidates(candidate)[0] || "",
        score: scoreSimilarProduct(product, candidate, currentTokens),
      }))
      .filter((item) => item.score > 0 && item.image)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return safeText(a.product.description).localeCompare(safeText(b.product.description));
      })
      .slice(0, 4);
  }, [allProducts, product]);

  const specHighlights = useMemo(() => {
    if (!product) {
      return [];
    }
    return extractProductSpecHighlights(product);
  }, [product]);
  const keyHighlights = useMemo(() => specHighlights.slice(0, 6), [specHighlights]);

  const fullDescriptionBlocks = useMemo(() => {
    if (!product) {
      return [];
    }
    const blocks = buildFullDescriptionBlocks(product, specHighlights);

    const adminSupplierCode = safeText(product.supplierCode);
    if (session?.role === "admin" && adminSupplierCode) {
      return [
        ...blocks,
        { type: "paragraph", text: `Admin reference: ${adminSupplierCode}` },
      ];
    }

    return blocks;
  }, [product, session?.role, specHighlights]);
  const fullDescriptionParagraphs = useMemo(
    () => descriptionBlocksToParagraphs(fullDescriptionBlocks),
    [fullDescriptionBlocks],
  );

  const productName = product ? buildProductDisplayTitle(product) : "";
  const productBrand = product ? safeText(product.manufacturer) || "Unbranded" : "Unbranded";
  const productCodeLabel = product ? safeText(product.code) : "";
  const supplierCodeLabel = product ? safeText(product.supplierCode) : "";
  const liveCatalogError = product ? safeText(product.liveCatalogError) : "";

  useEffect(() => {
    setActiveImage(galleryImages[0] || "");
  }, [galleryImages]);

  useEffect(() => {
    const scriptId = "internext-product-json-ld";
    document.getElementById(scriptId)?.remove();

    if (!product) {
      return;
    }

    const canonicalUrl = getPublicProductUrl(productCodeLabel);
    const searchTitle = buildSearchTitleText(product);
    const pageTitle = truncateText(`${searchTitle} | Internext Australia`, 90);
    const metaDescription = getProductMetaDescription(
      product,
      getDescriptionBlocksText(fullDescriptionBlocks),
      availability,
    );
    const schemaPrice =
      typeof product.price === "number" && Number.isFinite(product.price) ? product.price : null;
    const schemaImages = galleryImages
      .filter((image) => image !== PRODUCT_IMAGE_PLACEHOLDER)
      .map(toAbsoluteUrl)
      .filter(Boolean);

    document.title = pageTitle;
    setNamedMeta('meta[name="description"]', "name", "description", metaDescription);
    setNamedMeta('meta[name="robots"]', "name", "robots", "index, follow");
    setNamedMeta('meta[property="og:title"]', "property", "og:title", pageTitle);
    setNamedMeta('meta[property="og:description"]', "property", "og:description", metaDescription);
    setNamedMeta('meta[property="og:type"]', "property", "og:type", "product");
    setNamedMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setNamedMeta('meta[name="twitter:title"]', "name", "twitter:title", pageTitle);
    setNamedMeta('meta[name="twitter:description"]', "name", "twitter:description", metaDescription);
    setCanonicalLink(canonicalUrl);

    if (schemaImages[0]) {
      setNamedMeta('meta[property="og:image"]', "property", "og:image", schemaImages[0]);
      setNamedMeta('meta[name="twitter:image"]', "name", "twitter:image", schemaImages[0]);
    }

    const structuredData = {
      "@context": "https://schema.org",
      "@type": "Product",
      sku: productCodeLabel,
      mpn: getProductMpn(product),
      ...(getProductGtin(product) ? { gtin: getProductGtin(product) } : {}),
      name: searchTitle,
      description: getProductStructuredDescription(product, fullDescriptionParagraphs),
      brand: {
        "@type": "Brand",
        name: productBrand || "Internext",
      },
      image: schemaImages,
      offers: schemaPrice !== null
        ? {
            "@type": "Offer",
            url: canonicalUrl,
            priceCurrency: "AUD",
            price: schemaPrice.toFixed(2),
            availability: getSchemaAvailability(product),
            itemCondition: "https://schema.org/NewCondition",
            shippingDetails: {
              "@type": "OfferShippingDetails",
              shippingRate: {
                "@type": "MonetaryAmount",
                value: DEFAULT_PUBLIC_SHIPPING_PRICE.toFixed(2),
                currency: "AUD",
              },
              shippingDestination: {
                "@type": "DefinedRegion",
                addressCountry: "AU",
              },
              deliveryTime: {
                "@type": "ShippingDeliveryTime",
                handlingTime: {
                  "@type": "QuantitativeValue",
                  minValue: 1,
                  maxValue: 2,
                  unitCode: "DAY",
                },
                transitTime: {
                  "@type": "QuantitativeValue",
                  minValue: 2,
                  maxValue: 7,
                  unitCode: "DAY",
                },
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
          }
        : undefined,
    };
    const breadcrumbData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Products",
          item: `${SITE_URL}/products`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: productName,
          item: canonicalUrl,
        },
      ],
    };

    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify([structuredData, breadcrumbData]);
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [availability, fullDescriptionBlocks, fullDescriptionParagraphs, galleryImages, product, productBrand, productCodeLabel, productName]);

  const addToCart = () => {
    if (!product) {
      return;
    }

    try {
      const existing = getCartItems().map((item) => ({ ...toCartProduct(item), qty: item.qty }));
      const match = existing.find((item) => item.code === product.code);
      const pricedProduct = toCartProduct(getCartPricedProduct(product, session?.role));
      const nextQuantity = (match?.qty || 0) + qty;
      const toastProductName = truncateText(productName, 90);
      const updated: CartItem[] = match
        ? existing.map((item) =>
            item.code === product.code ? { ...pricedProduct, qty: item.qty + qty } : item,
          )
        : [...existing, { ...pricedProduct, qty }];

      if (!saveCartItems(updated)) {
        toast({
          title: "Cart could not be saved",
          description: "Please refresh the page and try again.",
          variant: "destructive",
        });
        return;
      }

      trackAddToCart({
        item_id: product.code,
        item_name: productName,
        item_brand: productBrand,
        price: pricedProduct.price || 0,
        quantity: qty,
      });
      setIsInCart(true);
      toast({
        title: match ? "Cart updated" : "Added to cart",
        description: match
          ? `${toastProductName} is now ${nextQuantity} in your cart.`
          : `${qty} x ${toastProductName} added to your cart.`,
      });
    } catch {
      toast({
        title: "Cart could not be updated",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
    }
  };

  const updateQuantity = (value: number) => {
    if (!Number.isFinite(value)) {
      setQty(1);
      return;
    }

    setQty(Math.max(1, Math.min(9999, Math.floor(value))));
  };

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/products");
  };

  const saveAdminStockOverride = async () => {
    if (!product) {
      return;
    }

    const stockQuantity = Number(adminStockForm.stockQuantity);
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      setAdminStockMessage({
        tone: "error",
        text: "Enter a whole stock quantity of 0 or higher.",
      });
      return;
    }

    setAdminStockSaving(true);
    setAdminStockMessage(null);

    try {
      const supplierStockQuantity = getSupplierStockQuantity(product);
      const response = await fetch("/api/catalog/live", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: product.code,
          supplierCode: product.supplierCode,
          stockQuantity,
          supplierStockQuantity,
          stockLocation: adminStockForm.stockLocation,
          note: adminStockForm.note,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
        override?: { stockQuantity?: number };
        desiredStockQuantity?: number;
      };

      if (!response.ok) {
        throw new Error(result.message || "Unable to save stock override.");
      }

      const nextStockQuantity =
        typeof result.desiredStockQuantity === "number"
          ? result.desiredStockQuantity
          : stockQuantity;
      const updateProduct = (item: CatalogProduct) =>
        item.code === product.code ? applyAdminStockToProduct(item, nextStockQuantity, adminStockForm.stockLocation) : item;

      setProduct((current) => (current ? applyAdminStockToProduct(current, nextStockQuantity, adminStockForm.stockLocation) : current));
      setAllProducts((current) => current.map(updateProduct));
      setAdminStockMessage({
        tone: "success",
        text: "Admin stock total has been saved for this product.",
      });
      toast({
        title: "Stock updated",
        description: `${nextStockQuantity.toLocaleString("en-AU")} total unit${
          nextStockQuantity === 1 ? "" : "s"
        } set for ${getStockLocationLabel(adminStockForm.stockLocation)}.`,
      });
    } catch (error) {
      setAdminStockMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Unable to save stock override.",
      });
    } finally {
      setAdminStockSaving(false);
    }
  };

  const handleActiveImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    const currentIndex = galleryImages.indexOf(activeImage);
    const nextImage = currentIndex >= 0 ? galleryImages[currentIndex + 1] : galleryImages[0];

    if (nextImage && nextImage !== activeImage) {
      setActiveImage(nextImage);
      return;
    }

    handleProductImageError(event);
  };

  return (
    <Layout>
      <section className="section-padding bg-background">
        <div className="container-catalog">
          <div className="mb-6">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>

          {loading && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              Loading product...
            </div>
          )}

          {error && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-destructive">
              {error}
            </div>
          )}

          {!loading && !error && !product && hasCheckedFullCatalog && (
            <div className="bg-card rounded-xl p-6 shadow-card border border-border/50">
              Product not found.
            </div>
          )}

          {!loading && !error && product && (
            <div className="space-y-6">
              <div className="space-y-6">
                <div className="bg-card rounded-2xl border border-border/50 p-4 shadow-card sm:p-5 md:p-6">
                  <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                    <div>
                      {galleryImages.length > 0 ? (
                        <div className="mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-secondary/60">
                          {activeImage ? (
                          <img
                            src={activeImage}
                            alt={productName}
                            className="h-full w-full object-contain"
                            loading="eager"
                            decoding="async"
                            onError={handleActiveImageError}
                          />
                          ) : null}
                        </div>
                      ) : null}
                      {galleryImages.length > 1 ? (
                        <div className="rounded-2xl border border-border/50 bg-secondary/20 p-3">
                          <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                          {galleryImages.map((img) => (
                            <button
                              key={img}
                              type="button"
                              onClick={() => setActiveImage(img)}
                              className={`group aspect-square overflow-hidden rounded-xl border bg-card transition-all ${
                                activeImage === img
                                  ? "border-accent shadow-sm ring-2 ring-accent/15"
                                  : "border-border/60 hover:border-accent/40 hover:bg-background"
                              }`}
                            >
                              <img
                                src={img}
                                alt={productName}
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                                loading="lazy"
                                onError={handleProductImageError}
                              />
                            </button>
                          ))}
                          </div>
                        </div>
                      ) : null}

                      <Tabs defaultValue="overview" className="mt-6">
                        <div className="overflow-hidden rounded-[1.75rem] border border-border/50 bg-gradient-to-br from-background via-secondary/15 to-background shadow-card">
                          <div className="border-b border-border/50 bg-background/80 px-5 py-4 backdrop-blur md:px-6">
                            <TabsList className="grid h-auto w-full max-w-lg grid-cols-3 rounded-xl bg-secondary/50 p-1">
                              <TabsTrigger value="overview" className="rounded-lg px-2 text-xs sm:text-sm">
                                Overview
                              </TabsTrigger>
                              <TabsTrigger value="size" className="rounded-lg px-2 text-xs sm:text-sm">
                                Size
                              </TabsTrigger>
                              <TabsTrigger value="availability" className="rounded-lg px-2 text-xs sm:text-sm">
                                Availability
                              </TabsTrigger>
                            </TabsList>
                          </div>

                          <TabsContent value="overview" className="m-0">
                            <div className="border-b border-border/50 bg-background/55 px-5 py-4 md:px-6">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                                Product Overview
                              </p>
                              <h2 className="mt-2 text-lg font-semibold text-foreground">
                                Full Description
                              </h2>
                            </div>
                            <div className="space-y-5 px-5 py-5 md:px-6 md:py-6">
                              {fullDescriptionBlocks.map((block, index) => {
                                if (block.type === "heading") {
                                  return (
                                    <h3
                                      key={`${product.code}-desc-${index}`}
                                      className="pt-2 text-base font-semibold text-foreground"
                                    >
                                      {block.text}
                                    </h3>
                                  );
                                }

                                if (block.type === "list") {
                                  return (
                                    <ul
                                      key={`${product.code}-desc-${index}`}
                                      className="ml-5 list-disc space-y-2 text-base leading-7 text-muted-foreground"
                                    >
                                      {block.items.map((item) => (
                                        <li key={item}>{item}</li>
                                      ))}
                                    </ul>
                                  );
                                }

                                return (
                                  <p
                                    key={`${product.code}-desc-${index}`}
                                    className={`max-w-none text-base leading-8 ${
                                      index === 0 ? "text-foreground" : "text-muted-foreground"
                                    }`}
                                  >
                                    {block.text}
                                  </p>
                                );
                              })}
                            </div>
                          </TabsContent>

                          <TabsContent value="size" className="m-0">
                            <div className="border-b border-border/50 bg-background/55 px-5 py-4 md:px-6">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                                Product Size
                              </p>
                              <h2 className="mt-2 text-lg font-semibold text-foreground">
                                Measurements
                              </h2>
                            </div>
                            {getMeasurementRows(product).length > 0 ? (
                              <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 md:px-6 md:py-6">
                                {getMeasurementRows(product).map((row) => (
                                  <div
                                    key={row.label}
                                    className="rounded-xl border border-border/60 bg-background px-4 py-3"
                                  >
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                      {row.label}
                                    </p>
                                    <p className="mt-2 text-lg font-semibold text-foreground">
                                      {row.value}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="px-5 py-5 text-sm text-muted-foreground md:px-6 md:py-6">
                                Product measurements are not available.
                              </p>
                            )}
                          </TabsContent>

                          <TabsContent value="availability" className="m-0">
                            <div className="border-b border-border/50 bg-background/55 px-5 py-4 md:px-6">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                                Availability
                              </p>
                              <h2 className="mt-2 text-lg font-semibold text-foreground">
                                Stock by Location
                              </h2>
                            </div>
                            {availabilityRows.length > 0 ? (
                              <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 md:px-6 md:py-6">
                                {availabilityRows.map((row) => (
                                  <div
                                    key={row.label}
                                    className="rounded-xl border border-border/60 bg-background px-4 py-3"
                                  >
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                      {row.label}
                                    </p>
                                    <p className="mt-2 text-lg font-semibold text-foreground">
                                      {row.value}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="px-5 py-5 text-sm text-muted-foreground md:px-6 md:py-6">
                                Stock details are not available for this product.
                              </p>
                            )}
                          </TabsContent>
                        </div>
                      </Tabs>
                    </div>

                    <div className="flex h-full flex-col rounded-2xl border border-border/50 bg-secondary/20 p-5 md:p-6">
                      <div className="mb-5 flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-semibold tracking-[0.18em] text-accent uppercase">
                          {productBrand}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                          Code: {productCodeLabel}
                        </span>
                        {session?.role === "admin" && supplierCodeLabel ? (
                          <span className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-xs font-medium text-muted-foreground">
                            Ref: {supplierCodeLabel}
                          </span>
                        ) : null}
                      </div>

                      <h1 className="mb-6 break-words text-2xl font-bold leading-tight text-foreground sm:text-3xl md:text-4xl xl:text-[2.5rem] xl:leading-tight">
                        {productName}
                      </h1>

                      {keyHighlights.length > 0 ? (
                        <div className="mb-5 rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
                          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                            Key Details
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {keyHighlights.map((highlight) => (
                              <div key={highlight} className="flex items-start gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                                <span>{highlight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {liveCatalogError ? (
                        <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                          {liveCatalogError} Product information is temporarily unavailable.
                        </div>
                      ) : null}

                      <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card">
                        <p className="mb-2 text-sm text-muted-foreground">Price</p>
                        <p className="mb-2 text-3xl font-bold text-foreground">{displayPrice}</p>
                        {availability ? (
                          <p className="mb-2 text-sm font-semibold text-accent">{availability}</p>
                        ) : null}
                        {product.rrp ? (
                          <p className="mb-6 text-sm text-muted-foreground">
                            RRP {formatAud(product.rrp)}
                          </p>
                        ) : (
                          <p className="mb-6 text-sm text-muted-foreground">RRP not listed</p>
                        )}

                        <div className="mb-5 grid gap-3 text-sm">
                          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3">
                            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                            <div>
                              <p className="font-medium text-foreground">Delivery</p>
                              <p className="mt-1 text-muted-foreground">{getDeliverySummary(product)}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                            <div>
                              <p className="font-medium text-foreground">Stock check</p>
                              <p className="mt-1 text-muted-foreground">{getStockSummary(product)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mb-5">
                          <p className="mb-2 text-sm font-medium text-foreground">Quantity</p>
                          <div className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/35 p-1">
                            <button
                              type="button"
                              onClick={() => updateQuantity(qty - 1)}
                              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background hover:bg-secondary"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <Input
                              type="number"
                              min={1}
                              max={9999}
                              step={1}
                              value={qty}
                              onFocus={(event) => event.currentTarget.select()}
                              onChange={(event) => updateQuantity(Number(event.target.value))}
                              className="h-9 w-20 border-border bg-background text-center font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                              aria-label="Quantity"
                            />
                            <button
                              type="button"
                              onClick={() => updateQuantity(qty + 1)}
                              className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background hover:bg-secondary"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {isInCart ? (
                          <Button className="w-full" asChild>
                            <Link to="/cart">View Cart</Link>
                          </Button>
                        ) : (
                          <Button className="w-full" onClick={addToCart} disabled={!isLivePriceReady}>
                            {isLivePriceReady ? "Add to Cart" : "Checking price"}
                          </Button>
                        )}

                        {!isInCart ? (
                          <Button variant="outline" className="mt-3 w-full" asChild>
                            <Link to="/cart">View Cart</Link>
                          </Button>
                        ) : null}

                        <Button variant="outline" className="mt-3 w-full" asChild>
                          <Link to="/products">Browse More Products</Link>
                        </Button>

                        {session?.role === "admin" ? (
                          <div className="mt-5 rounded-xl border border-accent/30 bg-accent/5 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-foreground">
                                  Admin stock override
                                </p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                  Set the total stock shown on the website. Supplier feed changes will still adjust this total automatically.
                                </p>
                              </div>
                              <span className="rounded-full bg-background px-2 py-1 text-xs font-semibold text-accent">
                                {typeof product.stockQuantity === "number"
                                  ? product.stockQuantity.toLocaleString("en-AU")
                                  : "0"}
                              </span>
                            </div>
                            {getAdminStockAdjustmentSummary(product) ? (
                              <p className="mt-3 rounded-lg border border-border/60 bg-background px-3 py-2 text-xs leading-5 text-muted-foreground">
                                {getAdminStockAdjustmentSummary(product)}
                              </p>
                            ) : null}

                            <div className="mt-4 grid gap-3">
                              <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  Total website stock
                                </span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={adminStockForm.stockQuantity}
                                  onChange={(event) =>
                                    setAdminStockForm((current) => ({
                                      ...current,
                                      stockQuantity: event.target.value,
                                    }))
                                  }
                                  placeholder="0"
                                  className="h-11 border-border/70 bg-background"
                                />
                              </label>

                              <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  Stock location
                                </span>
                                <select
                                  value={adminStockForm.stockLocation}
                                  onChange={(event) =>
                                    setAdminStockForm((current) => ({
                                      ...current,
                                      stockLocation: event.target.value,
                                    }))
                                  }
                                  className="h-11 w-full rounded-md border border-border/70 bg-background px-3 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-accent/35"
                                >
                                  {STOCK_OVERRIDE_LOCATIONS.map((location) => (
                                    <option key={location.value} value={location.value}>
                                      {location.label}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                  Internal note
                                </span>
                                <textarea
                                  value={adminStockForm.note}
                                  onChange={(event) =>
                                    setAdminStockForm((current) => ({
                                      ...current,
                                      note: event.target.value,
                                    }))
                                  }
                                  rows={3}
                                  placeholder="Optional stock note"
                                  className="w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-accent/35"
                                />
                              </label>
                            </div>

                            {adminStockMessage ? (
                              <p
                                className={`mt-3 rounded-lg px-3 py-2 text-sm ${
                                  adminStockMessage.tone === "success"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-red-50 text-red-700"
                                }`}
                              >
                                {adminStockMessage.text}
                              </p>
                            ) : null}

                            <Button
                              type="button"
                              className="mt-4 w-full"
                              onClick={saveAdminStockOverride}
                              disabled={adminStockSaving}
                            >
                              {adminStockSaving ? "Saving stock..." : "Save Total Stock"}
                            </Button>
                          </div>
                        ) : null}

                        <div className="mt-5 rounded-xl border border-border/60 bg-secondary/35 p-4">
                          <div className="flex items-center gap-2">
                            <Headphones className="h-4 w-4 text-accent" />
                            <p className="text-sm font-semibold text-foreground">Need help choosing?</p>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            Use the product code <span className="font-medium text-foreground">{productCodeLabel}</span> when discussing this item with sales or comparing options across your shortlist.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {similarProducts.length > 0 ? (
                  <section className="rounded-2xl border border-border/50 bg-card p-5 shadow-card md:p-6">
                    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                          Similar Products
                        </p>
                        <h2 className="mt-2 text-2xl font-bold text-foreground">
                          Compare similar options
                        </h2>
                      </div>
                      <Button variant="outline" asChild>
                        <Link to="/products">View all products</Link>
                      </Button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {similarProducts.map(({ product: relatedProduct, image }) => {
                        const relatedName = buildProductDisplayTitle(relatedProduct);
                        const relatedBrand = safeText(relatedProduct.manufacturer) || "Unbranded";
                        const relatedCode = safeText(relatedProduct.code);
                        const relatedPrice = getDisplayPrice(relatedProduct, session?.role);
                        const relatedAvailability =
                          safeText(relatedProduct.availabilityText) ||
                          (typeof relatedProduct.stockQuantity === "number"
                            ? `${relatedProduct.stockQuantity.toLocaleString("en-AU")} available`
                            : "");

                        return (
                          <Link
                            key={relatedCode || relatedName}
                            to={`/products/item/${encodeURIComponent(relatedCode)}`}
                            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/50 bg-background transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-card"
                          >
                            <div className="flex aspect-square items-center justify-center bg-white p-4">
                              <img
                                src={image}
                                alt={relatedName}
                                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                                loading="lazy"
                                decoding="async"
                                onError={handleProductImageError}
                              />
                            </div>
                            <div className="flex flex-1 flex-col p-4">
                              <div className="mb-3 flex flex-wrap gap-2">
                                <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">
                                  {relatedBrand}
                                </span>
                                {relatedCode ? (
                                  <span className="inline-flex items-center rounded-full border border-border/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                                    {relatedCode}
                                  </span>
                                ) : null}
                              </div>
                              <h3 className="line-clamp-3 text-sm font-semibold leading-6 text-foreground group-hover:text-accent">
                                {relatedName}
                              </h3>
                              <div className="mt-auto pt-4">
                                <p className="text-lg font-bold text-foreground">{relatedPrice}</p>
                                {relatedAvailability ? (
                                  <p className="mt-1 text-xs font-medium text-accent">{relatedAvailability}</p>
                                ) : null}
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

              </div>
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default ProductDetail;
