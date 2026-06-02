import { readEnv, sendJson } from "../checkout/_shared.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type LiveCatalogItem = {
  code: string;
  supplierCode: string;
  manufacturer: string;
  name: string;
  price: number | null;
  priceText: string;
  resellerPrice: number | null;
  resellerPriceText: string;
  rrp: number | null;
  rrpText: string;
  rrpExGst: number | null;
  taxRate: number;
  availabilityText: string;
  etaDate: string;
  etaStatus: string;
  stockQuantity?: number;
  stockByWarehouse: {
    adl: number;
    bne: number;
    mel: number;
    syd: number;
  };
  stockRecordUpdated: string;
  weightKg: number | null;
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
};

type LiveCatalogCache = {
  expiresAt: number;
  updatedAt: string;
  source: "xml" | "csv" | "combined";
  items: LiveCatalogItem[];
};

type StaticCatalogProduct = {
  code: string;
  supplierCode?: string;
  [key: string]: unknown;
};

type MergedCatalogCache = {
  expiresAt: number;
  updatedAt: string;
  source: "xml" | "csv" | "combined";
  items: Array<StaticCatalogProduct & LiveCatalogItem>;
};

type LeaderCatalogProduct = StaticCatalogProduct & {
  manufacturer: string;
  description: string;
  longDescription?: string;
  leaderDealerBuyEx?: number | null;
  leaderRrpInc?: number | null;
  leaderStatus?: string;
};

const parseNumber = (value: string | undefined) => {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePositiveNumber = (value: string | undefined) => {
  const parsed = parseNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};

const formatAud = (value: number | null) =>
  value === null ? "P.O.A." : value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });

const formatCustomerAud = (value: number | null) =>
  value === null ? "P.O.A." : `${formatAud(value)} Inc GST`;

const formatResellerAud = (value: number | null) =>
  value === null ? "P.O.A." : `${formatAud(value)} Ex GST`;

const applyTax = (value: number | null, taxRate: number) =>
  value === null ? null : Math.round(value * (1 + taxRate / 100) * 100) / 100;

const removeTax = (value: number | null, taxRate: number) =>
  value === null ? null : Math.round((value / (1 + taxRate / 100)) * 100) / 100;

const CUSTOMER_MARGIN_RATE = 0.1;
const CUSTOMER_GST_RATE = 0.1;
const RESELLER_MARGIN_RATE = 0.1;

const applyCustomerPrice = (value: number | null) =>
  value === null
    ? null
    : Math.round(value * (1 + CUSTOMER_MARGIN_RATE) * (1 + CUSTOMER_GST_RATE) * 100) / 100;

const applyResellerPrice = (value: number | null) =>
  value === null ? null : Math.round(value * (1 + RESELLER_MARGIN_RATE) * 100) / 100;

const metresToCentimetres = (value: number | null) =>
  value === null ? null : Math.round(value * 100 * 10) / 10;

const formatDateDmy = (value: string | undefined) => {
  const trimmed = String(value || "").trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }

  return trimmed;
};

const CONTACT_AVAILABILITY_TEXT = "Contact us for availability information";
const LEADER_AVAILABILITY_TEXT = "Available to order";

const isBackToBackStatus = (value: string | undefined) => /^btb$/i.test(String(value || "").trim());

const normalizeAvailabilityStatus = (value: string | undefined, stockQuantity: number) => {
  const status = String(value || "").trim();

  if (isBackToBackStatus(status)) {
    return CONTACT_AVAILABILITY_TEXT;
  }

  if (!status || /^\d{4}-\d{2}-\d{2}$/.test(status) || /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(status)) {
    return stockQuantity > 0 ? "In Stock" : "Check availability";
  }

  return status;
};

const normalizeEtaStatus = (value: string | undefined) =>
  isBackToBackStatus(value) ? CONTACT_AVAILABILITY_TEXT : formatDateDmy(value);

const splitFeedRows = (csv: string) =>
  csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const parseLiveCatalog = (csv: string) => {
  const [, ...rows] = splitFeedRows(csv);

  return rows
    .map((row): LiveCatalogItem | null => {
      const parts = row.split(",");
      const code = parts[0]?.trim();

      if (!code) {
        return null;
      }

      const costExGst = parseNumber(parts[8]);
      const price = applyCustomerPrice(costExGst);
      const resellerPrice = applyResellerPrice(costExGst);
      const rrpExGst = parseNumber(parts[9]);
      const taxRate = parseNumber(parts[11]) ?? 0;
      const rrp = applyTax(rrpExGst, taxRate);
      const stockQuantity = parseNumber(parts[12]) ?? 0;
      const tail = parts.slice(-7);
      const [stockRecordUpdated, etaDate, etaStatus, qtyAdl, qtyBne, qtyMel, qtySyd] = tail;

      return {
        code,
        supplierCode: parts[13]?.trim() || code,
        manufacturer: parts[3]?.trim() || "",
        name: parts[1]?.trim() || "",
        price,
        priceText: formatCustomerAud(price),
        resellerPrice,
        resellerPriceText: formatResellerAud(resellerPrice),
        rrp,
        rrpText: formatAud(rrp),
        rrpExGst,
        taxRate,
        availabilityText: normalizeAvailabilityStatus(etaStatus, stockQuantity),
        etaDate: formatDateDmy(etaDate),
        etaStatus: normalizeEtaStatus(etaStatus),
        stockQuantity,
        stockByWarehouse: {
          adl: parseNumber(qtyAdl) ?? 0,
          bne: parseNumber(qtyBne) ?? 0,
          mel: parseNumber(qtyMel) ?? 0,
          syd: parseNumber(qtySyd) ?? 0,
        },
        stockRecordUpdated: formatDateDmy(stockRecordUpdated),
        weightKg: parsePositiveNumber(parts[17]),
        heightCm: metresToCentimetres(parsePositiveNumber(parts[18])),
        widthCm: metresToCentimetres(parsePositiveNumber(parts[19])),
        depthCm: metresToCentimetres(parsePositiveNumber(parts[20])),
      };
    })
    .filter((item): item is LiveCatalogItem => Boolean(item));
};

const decodeXmlText = (value: string) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");

const getXmlTag = (row: string, tag: string) => {
  const match = row.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXmlText(match[1].trim()) : "";
};

const parseLiveCatalogXml = (xml: string) => {
  const rows = Array.from(xml.matchAll(/<row>([\s\S]*?)<\/row>/gi), (match) => match[1]);

  return rows
    .map((row): LiveCatalogItem | null => {
      const code = getXmlTag(row, "PartNumber");

      if (!code) {
        return null;
      }

      const costExGst = parseNumber(getXmlTag(row, "PriceCostEx"));
      const price = applyCustomerPrice(costExGst);
      const resellerPrice = applyResellerPrice(costExGst);
      const rrpExGst = parseNumber(getXmlTag(row, "PriceRetailEx"));
      const taxRate = parseNumber(getXmlTag(row, "TaxRate")) ?? 0;
      const rrp = applyTax(rrpExGst, taxRate);
      const stockQuantity = parseNumber(getXmlTag(row, "Quantity")) ?? 0;

      return {
        code,
        supplierCode: getXmlTag(row, "SupplierPartNumber") || code,
        manufacturer: getXmlTag(row, "Manufacturer"),
        name: getXmlTag(row, "Name"),
        price,
        priceText: formatCustomerAud(price),
        resellerPrice,
        resellerPriceText: formatResellerAud(resellerPrice),
        rrp,
        rrpText: formatAud(rrp),
        rrpExGst,
        taxRate,
        availabilityText: normalizeAvailabilityStatus(getXmlTag(row, "ETAStatus"), stockQuantity),
        etaDate: formatDateDmy(getXmlTag(row, "ETADate")),
        etaStatus: normalizeEtaStatus(getXmlTag(row, "ETAStatus")),
        stockQuantity,
        stockByWarehouse: {
          adl: parseNumber(getXmlTag(row, "Qty_ADL")) ?? 0,
          bne: parseNumber(getXmlTag(row, "Qty_BNE")) ?? 0,
          mel: parseNumber(getXmlTag(row, "Qty_MEL")) ?? 0,
          syd: parseNumber(getXmlTag(row, "Qty_SYD")) ?? 0,
        },
        stockRecordUpdated: formatDateDmy(getXmlTag(row, "StockRecordUpdated")),
        weightKg: parsePositiveNumber(getXmlTag(row, "Weight")),
        heightCm: metresToCentimetres(parsePositiveNumber(getXmlTag(row, "Height"))),
        widthCm: metresToCentimetres(parsePositiveNumber(getXmlTag(row, "Width"))),
        depthCm: metresToCentimetres(parsePositiveNumber(getXmlTag(row, "Depth"))),
      };
    })
    .filter((item): item is LiveCatalogItem => Boolean(item));
};

const globalCatalogCache = globalThis as typeof globalThis & {
  __internextLiveCatalogCache?: LiveCatalogCache;
  __internextMergedCatalogCache?: MergedCatalogCache;
};

const getProductKeys = (product: Pick<StaticCatalogProduct, "code" | "supplierCode">) =>
  [product.code, product.supplierCode]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));

const loadLeaderCatalogProducts = async () => {
  try {
    const leaderPath = join(process.cwd(), "public", "data", "leader-products.json");
    const raw = await readFile(leaderPath, "utf8");
    return JSON.parse(raw) as LeaderCatalogProduct[];
  } catch {
    return [] as LeaderCatalogProduct[];
  }
};

const createLeaderLiveCatalogItem = (product: LeaderCatalogProduct): LiveCatalogItem => {
  const costExGst = typeof product.leaderDealerBuyEx === "number" ? product.leaderDealerBuyEx : null;
  const price = applyCustomerPrice(costExGst);
  const resellerPrice = applyResellerPrice(costExGst);
  const rrp = typeof product.leaderRrpInc === "number" ? product.leaderRrpInc : null;
  const taxRate = 10;

  return {
    code: product.code,
    supplierCode: product.supplierCode || product.code,
    manufacturer: product.manufacturer || "Leader",
    name: product.description || product.code,
    price,
    priceText: formatCustomerAud(price),
    resellerPrice,
    resellerPriceText: formatResellerAud(resellerPrice),
    rrp,
    rrpText: formatAud(rrp),
    rrpExGst: removeTax(rrp, taxRate),
    taxRate,
    availabilityText: LEADER_AVAILABILITY_TEXT,
    etaDate: "",
    etaStatus: "",
    stockByWarehouse: {
      adl: 0,
      bne: 0,
      mel: 0,
      syd: 0,
    },
    stockRecordUpdated: "",
    weightKg: null,
    heightCm: null,
    widthCm: null,
    depthCm: null,
  };
};

const getComparablePrice = (item: LiveCatalogItem) =>
  item.resellerPrice ?? item.price ?? 0;

const chooseHigherPricedCatalogItem = (current: LiveCatalogItem | undefined, next: LiveCatalogItem) => {
  if (!current) {
    return next;
  }

  return getComparablePrice(next) > getComparablePrice(current) ? next : current;
};

const mergeLiveCatalogItems = (items: LiveCatalogItem[]) => {
  const merged: LiveCatalogItem[] = [];

  for (const item of items) {
    const itemKeys = getProductKeys(item);
    if (itemKeys.length === 0) {
      continue;
    }

    const existingIndex = merged.findIndex((existing) => {
      const existingKeys = getProductKeys(existing);
      return existingKeys.some((key) => itemKeys.includes(key));
    });

    if (existingIndex === -1) {
      merged.push(item);
      continue;
    }

    merged[existingIndex] = chooseHigherPricedCatalogItem(merged[existingIndex], item);
  }

  return merged;
};

export const loadLiveCatalogItems = async () => {
  const cached = globalCatalogCache.__internextLiveCatalogCache;
  if (cached && cached.expiresAt > Date.now()) {
    return {
      updatedAt: cached.updatedAt,
      count: cached.items.length,
      source: cached.source,
      cached: true,
      items: cached.items,
    };
  }

  const leaderProducts = await loadLeaderCatalogProducts();
  const leaderItems = leaderProducts.map(createLeaderLiveCatalogItem);
  const feedUrl = readEnv("ALLOYS_CATALOG_XML_FEED_URL") || readEnv("ALLOYS_CATALOG_FEED_URL");
  if (!feedUrl) {
    throw new Error("Alloys catalog feed is not configured. Add ALLOYS_CATALOG_XML_FEED_URL to the server environment.");
  }

  const response = await fetch(feedUrl, {
    headers: {
      Accept: "application/xml,text/xml,text/csv,text/plain,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Alloys feed returned ${response.status}.`);
  }

  const feedText = await response.text();
  const alloysItems = feedText.trim().startsWith("<")
    ? parseLiveCatalogXml(feedText)
    : parseLiveCatalog(feedText);
  const items = mergeLiveCatalogItems([...alloysItems, ...leaderItems]);
  const updatedAt = new Date().toISOString();
  const source = leaderItems.length > 0 ? "combined" : feedText.trim().startsWith("<") ? "xml" : "csv";

  globalCatalogCache.__internextLiveCatalogCache = {
    expiresAt: Date.now() + 15 * 60 * 1000,
    updatedAt,
    source,
    items,
  };

  return {
    updatedAt,
    count: items.length,
    source,
    cached: false,
    items,
  };
};

const loadStaticCatalogProducts = async () => {
  const catalogPath = join(process.cwd(), "public", "data", "catalog-products.json");
  const raw = await readFile(catalogPath, "utf8");
  const staticProducts = JSON.parse(raw) as StaticCatalogProduct[];
  const leaderProducts = await loadLeaderCatalogProducts();
  const existingKeys = new Set(staticProducts.flatMap(getProductKeys));
  const leaderOnlyProducts = leaderProducts.filter((product) =>
    getProductKeys(product).every((key) => !existingKeys.has(key)),
  );
  return [...staticProducts, ...leaderOnlyProducts] as StaticCatalogProduct[];
};

export const loadMergedCatalogProducts = async () => {
  const cached = globalCatalogCache.__internextMergedCatalogCache;
  if (cached && cached.expiresAt > Date.now()) {
    return {
      updatedAt: cached.updatedAt,
      count: cached.items.length,
      source: cached.source,
      cached: true,
      items: cached.items,
    };
  }

  const [staticProducts, liveCatalog] = await Promise.all([
    loadStaticCatalogProducts(),
    loadLiveCatalogItems(),
  ]);
  const liveByKey = new Map<string, LiveCatalogItem>();

  for (const item of liveCatalog.items) {
    for (const key of [item.code, item.supplierCode]) {
      const normalizedKey = key?.trim().toLowerCase();
      if (normalizedKey) {
        liveByKey.set(normalizedKey, item);
      }
    }
  }

  const items = staticProducts
    .map((product) => {
      const live = getProductKeys(product)
        .map((key) => liveByKey.get(key))
        .find(Boolean);

      if (!live) {
        return null;
      }

      return {
        ...product,
        price: live.price,
        priceText: live.priceText,
        resellerPrice: live.resellerPrice,
        resellerPriceText: live.resellerPriceText,
        rrp: live.rrp,
        rrpText: live.rrpText,
        rrpExGst: live.rrpExGst,
        taxRate: live.taxRate,
        supplierCode: product.supplierCode || live.supplierCode,
        availabilityText: live.availabilityText,
        etaDate: live.etaDate,
        etaStatus: live.etaStatus,
        stockQuantity: live.stockQuantity,
        stockByWarehouse: live.stockByWarehouse,
        stockRecordUpdated: live.stockRecordUpdated,
        weightKg: live.weightKg,
        heightCm: live.heightCm,
        widthCm: live.widthCm,
        depthCm: live.depthCm,
        liveUpdatedAt: liveCatalog.updatedAt,
      };
    })
    .filter((item): item is StaticCatalogProduct & LiveCatalogItem => Boolean(item));

  globalCatalogCache.__internextMergedCatalogCache = {
    expiresAt: Date.now() + 15 * 60 * 1000,
    updatedAt: liveCatalog.updatedAt,
    source: liveCatalog.source,
    items,
  };

  return {
    updatedAt: liveCatalog.updatedAt,
    count: items.length,
    source: liveCatalog.source,
    cached: false,
    items,
  };
};

export default async function handler(
  req: {
    method?: string;
    url?: string;
  },
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { message: "Method not allowed." });
  }

  try {
    const requestUrl = new URL(req.url || "/api/catalog/live", "https://internext.local");
    const catalog = requestUrl.searchParams.get("view") === "products"
      ? await loadMergedCatalogProducts()
      : await loadLiveCatalogItems();
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    return sendJson(res, 200, catalog);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load Alloys catalog feed.";
    return sendJson(res, message.includes("not configured") ? 500 : 502, {
      message:
        error instanceof Error
          ? `Unable to load Alloys catalog feed: ${error.message}`
          : "Unable to load Alloys catalog feed.",
    });
  }
}
