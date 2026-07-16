import { getSessionFromRequest } from "../auth/_shared.js";
import { readEnv, sendJson } from "../checkout/_shared.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

export type LiveCatalogItem = {
  code: string;
  supplierCode: string;
  manufacturer: string;
  name: string;
  longDescription?: string;
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
    wa: number;
    internext?: number;
    adminAdjustment?: number;
    adminLocation?: string;
  };
  stockRecordUpdated: string;
  weightKg: number | null;
  heightCm: number | null;
  widthCm: number | null;
  depthCm: number | null;
  gtin: string;
};

type LiveCatalogCache = {
  expiresAt: number;
  staleUntil: number;
  updatedAt: string;
  source: "xml" | "csv" | "combined";
  items: LiveCatalogItem[];
};

type LiveCatalogResult = {
  updatedAt: string;
  count: number;
  source: LiveCatalogCache["source"];
  cached: boolean;
  stale?: boolean;
  items: LiveCatalogItem[];
};

type StaticCatalogProduct = {
  code: string;
  supplierCode?: string;
  gtin?: string;
  ean?: string;
  upc?: string;
  barcode?: string;
  [key: string]: unknown;
};

type MergedCatalogCache = {
  expiresAt: number;
  staleUntil: number;
  updatedAt: string;
  source: "xml" | "csv" | "combined";
  items: Array<StaticCatalogProduct & LiveCatalogItem>;
};

type MergedCatalogResult = {
  updatedAt: string;
  count: number;
  source: MergedCatalogCache["source"];
  cached: boolean;
  stale?: boolean;
  items: Array<StaticCatalogProduct & LiveCatalogItem>;
};

type StockOverride = {
  code: string;
  supplierCode?: string;
  stockQuantity: number;
  stockLocation?: string;
  note?: string;
  updatedAt?: string;
};

type LeaderCatalogProduct = StaticCatalogProduct & {
  manufacturer: string;
  description: string;
  longDescription?: string;
  imageUrl?: string;
  imageUrls?: string[];
  leaderDealerBuyEx?: number | null;
  leaderRrpEx?: number | null;
  leaderRrpInc?: number | null;
  leaderStatus?: string;
  category?: string;
  subcategory?: string;
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
  etaDate?: string;
  etaStatus?: string;
  weightKg?: number | null;
  heightCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
  gtin?: string;
  ean?: string;
  upc?: string;
  barcode?: string;
};

const parseNumber = (value: unknown) => {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePositiveNumber = (value: string | undefined) => {
  const parsed = parseNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};

const normalizeGtin = (value: unknown) => {
  const digits = String(value || "").replace(/\D/g, "");
  return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits) ? digits : "";
};

const cleanText = (value: unknown) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cleanSupplierDescription = (value: unknown) =>
  String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");

const isDetailedDescription = (value: unknown) => {
  const text = cleanText(value);
  return text.length >= 350 || (text.match(/[.!?]/g) || []).length >= 4;
};

const chooseLongDescription = (preferred: unknown, fallback: unknown) =>
  isDetailedDescription(preferred)
    ? String(preferred).trim()
    : typeof fallback === "string" && fallback.trim()
      ? fallback.trim()
      : typeof preferred === "string"
        ? preferred.trim()
        : undefined;

const normalizeHeaderName = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const SUPPLIER_DESCRIPTION_FIELDS = [
  "LongDescription",
  "Long Description",
  "FullDescription",
  "Full Description",
  "ProductDescription",
  "Product Description",
  "MarketingDescription",
  "Marketing Description",
  "WebDescription",
  "Web Description",
  "ExtendedDescription",
  "Extended Description",
  "Description",
  "Overview",
  "Features",
];

const getCsvField = (headers: string[], parts: string[], names: string[]) => {
  for (const name of names) {
    const index = headers.indexOf(normalizeHeaderName(name));
    if (index >= 0 && parts[index] !== undefined) {
      return parts[index]?.trim() || "";
    }
  }

  return "";
};

const getProductGtin = (product: {
  gtin?: unknown;
  ean?: unknown;
  upc?: unknown;
  barcode?: unknown;
}) => normalizeGtin(product.gtin) || normalizeGtin(product.ean) || normalizeGtin(product.upc) || normalizeGtin(product.barcode);

const parseCsvRecords = (text: string) => {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      record.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      record.push(field);
      if (record.some((value) => value.trim())) {
        records.push(record);
      }
      field = "";
      record = [];
      continue;
    }

    field += char;
  }

  record.push(field);
  if (record.some((value) => value.trim())) {
    records.push(record);
  }

  return records;
};

const extractFirstCsvFromZip = (buffer: Buffer) => {
  let eocdOffset = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 66000); offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }

  if (eocdOffset === -1) {
    return null;
  }

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let centralOffset = buffer.readUInt32LE(eocdOffset + 16);

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) {
      break;
    }

    const method = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const nameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localOffset = buffer.readUInt32LE(centralOffset + 42);
    const fileName = buffer.toString("utf8", centralOffset + 46, centralOffset + 46 + nameLength);

    if (/\.csv$/i.test(fileName)) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
      const output = method === 8 ? inflateRawSync(compressed) : compressed;
      return output.toString("utf8").replace(/^\uFEFF/, "");
    }

    centralOffset += 46 + nameLength + extraLength + commentLength;
  }

  return null;
};

const getCsvValue = (row: Record<string, string>, key: string) => row[normalizeHeaderName(key)] || "";

const parseLeaderQuantity = (value: string | undefined) => {
  const parsed = parseNumber(value);
  return parsed !== null && parsed > 0 ? parsed : 0;
};

const sumWarehouseStock = (stockByWarehouse: {
  adl?: number;
  bne?: number;
  mel?: number;
  syd?: number;
  wa?: number;
  internext?: number;
}) =>
  (stockByWarehouse.adl ?? 0) +
  (stockByWarehouse.bne ?? 0) +
  (stockByWarehouse.mel ?? 0) +
  (stockByWarehouse.syd ?? 0) +
  (stockByWarehouse.wa ?? 0) +
  (stockByWarehouse.internext ?? 0);

const leaderMillimetresToCentimetres = (value: number | null) =>
  value === null ? null : Math.round((value / 10) * 10) / 10;

const getLeaderEtaDate = (row: Record<string, string>) =>
  [getCsvValue(row, "ETAA"), getCsvValue(row, "ETAQ"), getCsvValue(row, "ETAN"), getCsvValue(row, "ETAV"), getCsvValue(row, "ETAW")]
    .map(formatEtaDateDmy)
    .find(Boolean) || "";

const parseLeaderFeedCsv = (csv: string) => {
  const [headers = [], ...records] = parseCsvRecords(csv);
  const normalizedHeaders = headers.map(normalizeHeaderName);

  return records
    .map((record): LeaderCatalogProduct | null => {
      const row = Object.fromEntries(normalizedHeaders.map((header, index) => [header, record[index] || ""]));
      const code = getCsvValue(row, "STOCK CODE").trim();
      const description = cleanText(getCsvValue(row, "SHORT DESCRIPTION"));
      const dealerBuyEx = parsePositiveNumber(getCsvValue(row, "DBP"));
      const rrpEx = parsePositiveNumber(getCsvValue(row, "RRP"));

      if (!code || !description) {
        return null;
      }

      const stockByWarehouse = {
        adl: parseLeaderQuantity(getCsvValue(row, "AA")),
        bne: parseLeaderQuantity(getCsvValue(row, "AQ")),
        syd: parseLeaderQuantity(getCsvValue(row, "AN")),
        mel: parseLeaderQuantity(getCsvValue(row, "AV")),
        wa: parseLeaderQuantity(getCsvValue(row, "AW")),
      };
      const warehouseStockQuantity = sumWarehouseStock(stockByWarehouse);
      const stockQuantity = warehouseStockQuantity || parseLeaderQuantity(getCsvValue(row, "AT"));
      const etaDate = getLeaderEtaDate(row);
      const manufacturerSku = getCsvValue(row, "MANUFACTURER SKU").trim();
      const barcode = normalizeGtin(getCsvValue(row, "BAR CODE"));
      const imageUrl = getCsvValue(row, "IMAGE").trim();
      const longDescription = cleanText(getCsvValue(row, "LONG DESCRIPTION"));
      const category = cleanText(getCsvValue(row, "CATEGORY NAME"));
      const subcategory = cleanText(getCsvValue(row, "SUBCATEGORY NAME"));

      return {
        code,
        supplierCode: manufacturerSku || code,
        manufacturer: cleanText(getCsvValue(row, "MANUFACTURER")) || "Leader",
        description,
        longDescription: [longDescription, category, subcategory].filter(Boolean).join(" "),
        imageUrl,
        imageUrls: imageUrl ? [imageUrl] : [],
        leaderDealerBuyEx: dealerBuyEx,
        leaderRrpEx: rrpEx,
        leaderRrpInc: applyTax(rrpEx, 10),
        leaderStatus: stockQuantity > 0 ? "In Stock" : etaDate ? `ETA ${etaDate}` : LEADER_AVAILABILITY_TEXT,
        category,
        subcategory,
        stockQuantity,
        stockByWarehouse,
        etaDate,
        etaStatus: etaDate || "",
        weightKg: parsePositiveNumber(getCsvValue(row, "WEIGHT")),
        heightCm: leaderMillimetresToCentimetres(parsePositiveNumber(getCsvValue(row, "HEIGHT"))),
        widthCm: leaderMillimetresToCentimetres(parsePositiveNumber(getCsvValue(row, "WIDTH"))),
        depthCm: leaderMillimetresToCentimetres(parsePositiveNumber(getCsvValue(row, "LENGTH"))),
        gtin: barcode,
        barcode,
      };
    })
    .filter((product): product is LeaderCatalogProduct => Boolean(product));
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
const MIN_RRP_PRICE_MULTIPLIER = 1.1;
const DEFAULT_SERVER_CATALOG_CACHE_MS = 30 * 60 * 1000;
const DEFAULT_SERVER_CATALOG_STALE_MS = 6 * 60 * 60 * 1000;

const parseCacheMs = (name: string, fallback: number) => {
  const raw = readEnv(name);
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getServerCatalogCacheMs = () =>
  parseCacheMs("CATALOG_SERVER_CACHE_MS", DEFAULT_SERVER_CATALOG_CACHE_MS);

const getServerCatalogStaleMs = () =>
  parseCacheMs("CATALOG_SERVER_STALE_MS", DEFAULT_SERVER_CATALOG_STALE_MS);

const applyCustomerPrice = (value: number | null) =>
  value === null
    ? null
    : Math.round(value * (1 + CUSTOMER_MARGIN_RATE) * (1 + CUSTOMER_GST_RATE) * 100) / 100;

const applyResellerPrice = (value: number | null) =>
  value === null ? null : Math.round(value * (1 + RESELLER_MARGIN_RATE) * 100) / 100;

const ensureMinimumRrp = (rrp: number | null, price: number | null) => {
  if (price === null || price <= 0 || !Number.isFinite(price)) {
    return rrp;
  }

  const minimumRrp = Math.round(price * MIN_RRP_PRICE_MULTIPLIER * 100) / 100;
  if (rrp === null || rrp < minimumRrp || !Number.isFinite(rrp)) {
    return minimumRrp;
  }

  return rrp;
};

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

const formatEtaDateDmy = (value: string | undefined) => {
  const trimmed = String(value || "").trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);

  const parts = isoMatch
    ? { year: Number(isoMatch[1]), month: Number(isoMatch[2]), day: Number(isoMatch[3]) }
    : dmyMatch
      ? { year: Number(dmyMatch[3]), month: Number(dmyMatch[2]), day: Number(dmyMatch[1]) }
      : null;

  if (!parts) {
    return trimmed;
  }

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (Number.isNaN(date.getTime())) {
    return formatDateDmy(trimmed);
  }

  date.setUTCDate(date.getUTCDate() + 5);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
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
  isBackToBackStatus(value) ? CONTACT_AVAILABILITY_TEXT : formatEtaDateDmy(value);

const parseLiveCatalog = (csv: string) => {
  const records = parseCsvRecords(csv.replace(/^\uFEFF/, ""));
  const [rawHeaders = [], ...rows] = records;
  const headers = rawHeaders.map(normalizeHeaderName);

  return rows
    .map((parts): LiveCatalogItem | null => {
      const code = parts[0]?.trim();

      if (!code) {
        return null;
      }

      const costExGst = parseNumber(parts[8]);
      const price = applyCustomerPrice(costExGst);
      const resellerPrice = applyResellerPrice(costExGst);
      const rrpExGst = parseNumber(parts[9]);
      const taxRate = parseNumber(parts[11]) ?? 0;
      const rrp = ensureMinimumRrp(applyTax(rrpExGst, taxRate), price);
      const rawStockQuantity = parseNumber(parts[12]) ?? 0;
      const tail = parts.slice(-7);
      const [stockRecordUpdated, etaDate, etaStatus, qtyAdl, qtyBne, qtyMel, qtySyd] = tail;
      const stockByWarehouse = {
        adl: parseNumber(qtyAdl) ?? 0,
        bne: parseNumber(qtyBne) ?? 0,
        mel: parseNumber(qtyMel) ?? 0,
        syd: parseNumber(qtySyd) ?? 0,
        wa:
          parseNumber(
            getCsvField(headers, parts, ["Qty_WA", "Qty_WAUS", "Qty_PER", "Qty_PERTH", "Qty_WesternAustralia"]),
          ) ?? 0,
      };
      const warehouseStockQuantity = sumWarehouseStock(stockByWarehouse);
      const stockQuantity = warehouseStockQuantity || rawStockQuantity;

      return {
        code,
        supplierCode: parts[13]?.trim() || code,
        manufacturer: parts[3]?.trim() || "",
        name: parts[1]?.trim() || "",
        longDescription: cleanSupplierDescription(getCsvField(headers, parts, SUPPLIER_DESCRIPTION_FIELDS)) || undefined,
        price,
        priceText: formatCustomerAud(price),
        resellerPrice,
        resellerPriceText: formatResellerAud(resellerPrice),
        rrp,
        rrpText: formatAud(rrp),
        rrpExGst: removeTax(rrp, taxRate),
        taxRate,
        availabilityText: normalizeAvailabilityStatus(etaStatus, stockQuantity),
        etaDate: formatEtaDateDmy(etaDate),
        etaStatus: normalizeEtaStatus(etaStatus),
        stockQuantity,
        stockByWarehouse,
        stockRecordUpdated: formatDateDmy(stockRecordUpdated),
        weightKg: parsePositiveNumber(parts[17]),
        heightCm: metresToCentimetres(parsePositiveNumber(parts[18])),
        widthCm: metresToCentimetres(parsePositiveNumber(parts[19])),
        depthCm: metresToCentimetres(parsePositiveNumber(parts[20])),
        gtin: normalizeGtin(
          getCsvField(headers, parts, [
            "GTIN",
            "EAN",
            "EAN13",
            "UPC",
            "Barcode",
            "BarCode",
            "APN",
            "ProductBarcode",
          ]),
        ),
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

const getFirstXmlTag = (row: string, tags: string[]) => {
  for (const tag of tags) {
    const value = getXmlTag(row, tag);
    if (value.trim()) {
      return value;
    }
  }

  return "";
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
      const rrp = ensureMinimumRrp(applyTax(rrpExGst, taxRate), price);
      const rawStockQuantity = parseNumber(getXmlTag(row, "Quantity")) ?? 0;
      const stockByWarehouse = {
        adl: parseNumber(getXmlTag(row, "Qty_ADL")) ?? 0,
        bne: parseNumber(getXmlTag(row, "Qty_BNE")) ?? 0,
        mel: parseNumber(getXmlTag(row, "Qty_MEL")) ?? 0,
        syd: parseNumber(getXmlTag(row, "Qty_SYD")) ?? 0,
        wa:
          parseNumber(getFirstXmlTag(row, ["Qty_WA", "Qty_WAUS", "Qty_PER", "Qty_PERTH", "Qty_WesternAustralia"])) ??
          0,
      };
      const warehouseStockQuantity = sumWarehouseStock(stockByWarehouse);
      const stockQuantity = warehouseStockQuantity || rawStockQuantity;

      return {
        code,
        supplierCode: getXmlTag(row, "SupplierPartNumber") || code,
        manufacturer: getXmlTag(row, "Manufacturer"),
        name: getXmlTag(row, "Name"),
        longDescription: cleanSupplierDescription(getFirstXmlTag(row, SUPPLIER_DESCRIPTION_FIELDS)) || undefined,
        price,
        priceText: formatCustomerAud(price),
        resellerPrice,
        resellerPriceText: formatResellerAud(resellerPrice),
        rrp,
        rrpText: formatAud(rrp),
        rrpExGst: removeTax(rrp, taxRate),
        taxRate,
        availabilityText: normalizeAvailabilityStatus(getXmlTag(row, "ETAStatus"), stockQuantity),
        etaDate: formatEtaDateDmy(getXmlTag(row, "ETADate")),
        etaStatus: normalizeEtaStatus(getXmlTag(row, "ETAStatus")),
        stockQuantity,
        stockByWarehouse,
        stockRecordUpdated: formatDateDmy(getXmlTag(row, "StockRecordUpdated")),
        weightKg: parsePositiveNumber(getXmlTag(row, "Weight")),
        heightCm: metresToCentimetres(parsePositiveNumber(getXmlTag(row, "Height"))),
        widthCm: metresToCentimetres(parsePositiveNumber(getXmlTag(row, "Width"))),
        depthCm: metresToCentimetres(parsePositiveNumber(getXmlTag(row, "Depth"))),
        gtin:
          normalizeGtin(getXmlTag(row, "GTIN")) ||
          normalizeGtin(getXmlTag(row, "EAN")) ||
          normalizeGtin(getXmlTag(row, "EAN13")) ||
          normalizeGtin(getXmlTag(row, "UPC")) ||
          normalizeGtin(getXmlTag(row, "Barcode")) ||
          normalizeGtin(getXmlTag(row, "BarCode")) ||
          normalizeGtin(getXmlTag(row, "APN")) ||
          normalizeGtin(getXmlTag(row, "ProductBarcode")),
      };
    })
    .filter((item): item is LiveCatalogItem => Boolean(item));
};

const globalCatalogCache = globalThis as typeof globalThis & {
  __internextLiveCatalogCache?: LiveCatalogCache;
  __internextLiveCatalogPromise?: Promise<LiveCatalogResult>;
  __internextMergedCatalogCache?: MergedCatalogCache;
  __internextMergedCatalogPromise?: Promise<MergedCatalogResult>;
  __internextLeaderCatalogProductsCache?: {
    expiresAt: number;
    staleUntil: number;
    products: LeaderCatalogProduct[];
  };
  __internextLeaderCatalogProductsPromise?: Promise<LeaderCatalogProduct[]>;
};

const getProductKeys = (product: Pick<StaticCatalogProduct, "code" | "supplierCode">) =>
  [product.code, product.supplierCode]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));

let leaderPdfExclusionCodes: Set<string> | null = null;

const loadLeaderPdfExclusionCodes = async () => {
  if (leaderPdfExclusionCodes) {
    return leaderPdfExclusionCodes;
  }

  try {
    const exclusionPath = join(process.cwd(), "public", "data", "leader-pdf-exclusions.json");
    const raw = await readFile(exclusionPath, "utf8");
    leaderPdfExclusionCodes = new Set(
      (JSON.parse(raw) as string[]).map((code) => code.trim().toLowerCase()).filter(Boolean),
    );
  } catch {
    leaderPdfExclusionCodes = new Set();
  }

  return leaderPdfExclusionCodes;
};

const isLeaderPdfExcluded = (product: Pick<LeaderCatalogProduct, "code" | "supplierCode">) =>
  getProductKeys(product).some((key) => leaderPdfExclusionCodes?.has(key));

const STOCK_OVERRIDES_TABLE = "catalog_stock_overrides";
const STOCK_OVERRIDE_LOCATIONS = new Set(["internext", "adl", "bne", "mel", "syd", "wa"]);

const normalizeStockOverrideLocation = (value: unknown) => {
  const location = String(value || "").trim().toLowerCase();
  return STOCK_OVERRIDE_LOCATIONS.has(location) ? location : "internext";
};

const getSupabaseRestConfig = () => {
  const supabaseUrl = readEnv("SUPABASE_URL") || readEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY") || readEnv("SERVICE_ROLE_SECRET_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    serviceRoleKey,
  };
};

const normalizeOverrideRow = (row: Record<string, unknown>): StockOverride | null => {
  const code = String(row.code || "").trim();
  if (!code) {
    return null;
  }

  const stockQuantity = Math.floor(parseNumber(row.stock_quantity) ?? 0);
  return {
    code,
    supplierCode: String(row.supplier_code || "").trim() || undefined,
    stockQuantity,
    stockLocation: normalizeStockOverrideLocation(row.stock_location),
    note: String(row.note || "").trim() || undefined,
    updatedAt: String(row.updated_at || "").trim() || undefined,
  };
};

const fetchStockOverrides = async (): Promise<StockOverride[]> => {
  const config = getSupabaseRestConfig();
  if (!config) {
    return [];
  }

  try {
    const response = await fetch(
      `${config.supabaseUrl}/rest/v1/${STOCK_OVERRIDES_TABLE}?select=code,supplier_code,stock_quantity,stock_location,note,updated_at`,
      {
        headers: {
          apikey: config.serviceRoleKey,
          Authorization: `Bearer ${config.serviceRoleKey}`,
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return [];
    }

    const rows = (await response.json()) as Record<string, unknown>[];
    return rows.map(normalizeOverrideRow).filter((row): row is StockOverride => Boolean(row));
  } catch {
    return [];
  }
};

const buildStockOverrideMap = (overrides: StockOverride[]) => {
  const overridesByKey = new Map<string, StockOverride>();
  for (const override of overrides) {
    for (const key of getProductKeys({ code: override.code, supplierCode: override.supplierCode })) {
      overridesByKey.set(key, override);
    }
  }
  return overridesByKey;
};

const getStockOverrideForProduct = (
  product: Pick<StaticCatalogProduct, "code" | "supplierCode">,
  overridesByKey: Map<string, StockOverride>,
) =>
  getProductKeys(product)
    .map((key) => overridesByKey.get(key))
    .find(Boolean);

const applyStockOverrideToProduct = <
  T extends {
    stockQuantity?: number;
    stockByWarehouse?: LiveCatalogItem["stockByWarehouse"];
    availabilityText?: string;
    stockRecordUpdated?: string;
  },
>(
  product: T,
  override?: StockOverride,
) => {
  if (!override || override.stockQuantity === 0) {
    return product;
  }

  const supplierStock = typeof product.stockQuantity === "number" ? Math.max(0, product.stockQuantity) : 0;
  const totalStock = Math.max(0, supplierStock + override.stockQuantity);
  const stockLocation = normalizeStockOverrideLocation(override.stockLocation);
  const stockByWarehouse = {
    adl: product.stockByWarehouse?.adl ?? 0,
    bne: product.stockByWarehouse?.bne ?? 0,
    mel: product.stockByWarehouse?.mel ?? 0,
    syd: product.stockByWarehouse?.syd ?? 0,
    wa: product.stockByWarehouse?.wa ?? 0,
    internext: product.stockByWarehouse?.internext ?? 0,
    adminAdjustment: override.stockQuantity,
    adminLocation: stockLocation,
  };

  if (stockLocation === "internext") {
    stockByWarehouse.internext = Math.max(0, stockByWarehouse.internext + override.stockQuantity);
  } else {
    stockByWarehouse[stockLocation] = Math.max(0, stockByWarehouse[stockLocation] + override.stockQuantity);
  }

  return {
    ...product,
    availabilityText: totalStock > 0 ? "In Stock" : product.availabilityText,
    stockQuantity: totalStock,
    stockByWarehouse,
    stockRecordUpdated: override.updatedAt || product.stockRecordUpdated,
  };
};

const upsertStockOverride = async (input: {
  code?: unknown;
  supplierCode?: unknown;
  stockQuantity?: unknown;
  supplierStockQuantity?: unknown;
  stockLocation?: unknown;
  note?: unknown;
  adminEmail?: string;
}) => {
  const config = getSupabaseRestConfig();
  if (!config) {
    return { ok: false, status: 500, message: "Supabase service role is not configured." };
  }

  const code = String(input.code || "").trim();
  if (!code) {
    return { ok: false, status: 400, message: "Product code is required." };
  }

  const desiredStockQuantity = Math.max(0, Math.floor(parseNumber(input.stockQuantity) ?? 0));
  const supplierStockQuantity = Math.max(0, Math.floor(parseNumber(input.supplierStockQuantity) ?? 0));
  const stockQuantity = desiredStockQuantity - supplierStockQuantity;
  const stockLocation = normalizeStockOverrideLocation(input.stockLocation);
  const row = {
    code,
    supplier_code: String(input.supplierCode || "").trim() || null,
    stock_quantity: stockQuantity,
    stock_location: stockLocation,
    note: String(input.note || "").trim() || null,
    updated_by: input.adminEmail || null,
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/${STOCK_OVERRIDES_TABLE}?on_conflict=code`,
    {
      method: "POST",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(row),
    },
  );

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    return {
      ok: false,
      status: response.status,
      message: message || `Stock override save failed with status ${response.status}.`,
    };
  }

  delete globalCatalogCache.__internextLiveCatalogCache;
  delete globalCatalogCache.__internextLiveCatalogPromise;
  delete globalCatalogCache.__internextMergedCatalogCache;
  delete globalCatalogCache.__internextMergedCatalogPromise;

  const [saved] = (await response.json().catch(() => [])) as Record<string, unknown>[];
  return {
    ok: true,
    status: 200,
    override: normalizeOverrideRow(saved || row),
    desiredStockQuantity,
    supplierStockQuantity,
    stockLocation,
  };
};

const cleanClassificationText = (value: unknown) =>
  String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const getProductClassificationText = (product: Record<string, unknown>) =>
  cleanClassificationText(
    [
      product.code,
      product.supplierCode,
      product.manufacturer,
      product.name,
      product.description,
      product.leaderCategory,
      product.category,
      product.subcategory,
    ]
      .filter(Boolean)
      .join(" "),
  );

const getOfferClassificationText = (product: Record<string, unknown>) =>
  cleanClassificationText(
    [
      product.name,
      product.description,
      product.leaderCategory,
      product.category,
      product.subcategory,
    ]
      .filter(Boolean)
      .join(" "),
  );

const removeLeadingManufacturer = (text: string, manufacturer: unknown) => {
  const brand = cleanClassificationText(manufacturer);
  return brand && text.startsWith(`${brand} `) ? text.slice(brand.length).trim() : text;
};

const hasPhysicalProductSignal = (text: string) =>
  /\b(?:adapter|adaptor|access\s*point|battery|bracket|cable|camera|cartridge|case|chair|charger|cord|desktop|display|dock|drum|filament|firewall|handset|hard\s*drive|headset|ink|intercom|keyboard|kit|laptop|lead|monitor|mount|mouse|nas|notebook|nvr|panel|paper|phone|power\s*bank|power\s*supply|printer|printhead|projector|remote|router|scanner|screen|server|speaker|stand|switch|tablet|toner|ups|webcam|workstation)\b/i.test(
    text,
  );

export const isTangibleCatalogProduct = (product: Record<string, unknown>) => {
  const text = getProductClassificationText(product);
  const offerText = getOfferClassificationText(product);
  const debrandedOfferText = removeLeadingManufacturer(offerText, product.manufacturer);
  if (!text) {
    return true;
  }

  const leaderCategory = cleanClassificationText(product.leaderCategory);
  if (/^(?:software|services?|subscriptions?|licen[cs]es?|warrant(?:y|ies)|support|maintenance)$/.test(leaderCategory)) {
    return false;
  }

  const leadingIntangiblePattern =
    /^(?:[a-z0-9&.+-]+\s+){0,4}(?:\d+\s*)?(?:additional|extra|extended|post|onsite|on-site|nbd|next\s+business\s+day|warranty|support|care\s*pack|cover\s*plus|coverplus|service\s*pack|phone\s+service|renewal|licen[cs]e|subscription|software|cloud\s+service|managed\s+service|professional\s+service|installation\s+service)\b/i;
  const intangiblePattern =
    /\b(?:microsoft\s*365|office\s*365|defender\s+suite|subscription|renewal|licen[cs]e|digital\s+download|software\s+(?:licen[cs]e|subscription|upgrade|assurance)|cloud\s+service|saas|care\s*pack|cover\s*plus|coverplus|service\s*pack|support\s*pack|phone\s+service|post\s*warranty|extended\s*warranty|warranty\s+(?:renewal|upgrade|extension|service|pack)|hardware\s+support|onsite\s+support|on-site\s+support|nbd\s+support|next\s+business\s+day\s+support|installation\s+service|professional\s+service|managed\s+service|training\s+(?:service|course|session)|bootcamp|postscript\s+upgrade|pdf\s+upgrade|additional\s+(?:year|years)|total\s+of\s+\d+\s+(?:year|years)|response\s+service|repair\s+service|exchange\s+service|\b(?:\d+\s*)?(?:year|yr|month|mth)\s+(?:phone\s+)?service\b|\b(?:phone\s+)?service\s+(?:agreement|contract|plan|pack|renewal|support)\b)\b/i;

  const startsLikeIntangible =
    leadingIntangiblePattern.test(offerText) || leadingIntangiblePattern.test(debrandedOfferText);

  if (startsLikeIntangible || intangiblePattern.test(offerText)) {
    return false;
  }

  if (
    /\b(?:warranty|service)\b/i.test(offerText) &&
    /\b(?:additional|addl|extra|extended|post|renewal|upgrade|extension|support|onsite|on-site|nbd|response|repair|exchange|care|pack|agreement|contract|plan|total\s+of|swap\s+out|year|years|yr|yrs|mth|month|months)\b/i.test(offerText) &&
    (!hasPhysicalProductSignal(offerText) || startsLikeIntangible)
  ) {
    return false;
  }

  return true;
};

const loadLeaderCatalogProducts = async () => {
  const cached = globalCatalogCache.__internextLeaderCatalogProductsCache;
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.products;
  }

  if (globalCatalogCache.__internextLeaderCatalogProductsPromise) {
    return globalCatalogCache.__internextLeaderCatalogProductsPromise;
  }

  const loadPromise = loadLeaderCatalogProductsUncached(cached, now);
  globalCatalogCache.__internextLeaderCatalogProductsPromise = loadPromise;

  try {
    return await loadPromise;
  } finally {
    if (globalCatalogCache.__internextLeaderCatalogProductsPromise === loadPromise) {
      delete globalCatalogCache.__internextLeaderCatalogProductsPromise;
    }
  }
};

const loadLeaderCatalogProductsUncached = async (
  cached: typeof globalCatalogCache.__internextLeaderCatalogProductsCache,
  now: number,
) => {
  const cacheMs = getServerCatalogCacheMs();
  const staleMs = getServerCatalogStaleMs();
  const feedUrl = readEnv("LEADER_DATA_FEED_URL");
  let feedProducts: LeaderCatalogProduct[] = [];

  try {
    await loadLeaderPdfExclusionCodes();

    if (feedUrl) {
      const response = await fetch(feedUrl, {
        headers: {
          Accept: "application/zip,text/csv,text/plain,*/*",
        },
      });

      if (!response.ok) {
        throw new Error(`Leader feed returned ${response.status}.`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "";
      const csv = /zip/i.test(contentType) || (bytes.length >= 4 && bytes.readUInt32LE(0) === 0x04034b50)
        ? extractFirstCsvFromZip(bytes)
        : bytes.toString("utf8").replace(/^\uFEFF/, "");

      if (!csv) {
        throw new Error("Leader feed did not contain a CSV file.");
      }

      feedProducts = parseLeaderFeedCsv(csv).filter((product) => !isLeaderPdfExcluded(product));
    }

    const leaderPath = join(process.cwd(), "public", "data", "leader-products.json");
    const raw = await readFile(leaderPath, "utf8");
    const staticProducts = (JSON.parse(raw) as LeaderCatalogProduct[]).filter(
      (product) => !isLeaderPdfExcluded(product),
    );
    const productsByKey = new Map<string, LeaderCatalogProduct>();

    for (const product of [...staticProducts, ...feedProducts]) {
      const keys = getProductKeys(product);
      const key = keys[0] || product.code;
      const existing = productsByKey.get(key);
      const existingPrice = existing?.leaderDealerBuyEx ?? existing?.leaderRrpEx ?? existing?.leaderRrpInc ?? 0;
      const nextPrice = product.leaderDealerBuyEx ?? product.leaderRrpEx ?? product.leaderRrpInc ?? 0;

      if (!existing || nextPrice >= existingPrice) {
        productsByKey.set(key, product);
      }
    }

    const products = Array.from(productsByKey.values()).filter((product) =>
      isTangibleCatalogProduct(product as Record<string, unknown>),
    );
    globalCatalogCache.__internextLeaderCatalogProductsCache = {
      expiresAt: Date.now() + cacheMs,
      staleUntil: Date.now() + cacheMs + staleMs,
      products,
    };

    return products;
  } catch (error) {
    if (cached && cached.staleUntil > now) {
      return cached.products;
    }

    try {
      await loadLeaderPdfExclusionCodes();
      const leaderPath = join(process.cwd(), "public", "data", "leader-products.json");
      const raw = await readFile(leaderPath, "utf8");
      return (JSON.parse(raw) as LeaderCatalogProduct[]).filter(
        (product) => !isLeaderPdfExcluded(product) && isTangibleCatalogProduct(product as Record<string, unknown>),
      );
    } catch {
      return [] as LeaderCatalogProduct[];
    }
  }
};

const createLeaderLiveCatalogItem = (product: LeaderCatalogProduct): LiveCatalogItem => {
  const costExGst = typeof product.leaderDealerBuyEx === "number" ? product.leaderDealerBuyEx : null;
  const price = applyCustomerPrice(costExGst);
  const resellerPrice = applyResellerPrice(costExGst);
  const rawRrp = typeof product.leaderRrpInc === "number" ? product.leaderRrpInc : null;
  const rrp = ensureMinimumRrp(rawRrp, price);
  const taxRate = 10;

  return {
    code: product.code,
    supplierCode: product.supplierCode || product.code,
    manufacturer: product.manufacturer || "Leader",
    name: product.description || product.code,
    longDescription: product.longDescription,
    price,
    priceText: formatCustomerAud(price),
    resellerPrice,
    resellerPriceText: formatResellerAud(resellerPrice),
    rrp,
    rrpText: formatAud(rrp),
    rrpExGst: removeTax(rrp, taxRate),
    taxRate,
    availabilityText: product.leaderStatus || LEADER_AVAILABILITY_TEXT,
    stockQuantity: product.stockQuantity,
    stockByWarehouse: {
      adl: product.stockByWarehouse?.adl ?? 0,
      bne: product.stockByWarehouse?.bne ?? 0,
      mel: product.stockByWarehouse?.mel ?? 0,
      syd: product.stockByWarehouse?.syd ?? 0,
      wa: product.stockByWarehouse?.wa ?? 0,
    },
    stockRecordUpdated: "",
    etaDate: product.etaDate || "",
    etaStatus: product.etaStatus || "",
    weightKg: product.weightKg ?? null,
    heightCm: product.heightCm ?? null,
    widthCm: product.widthCm ?? null,
    depthCm: product.depthCm ?? null,
    gtin: getProductGtin(product),
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
  const indexByKey = new Map<string, number>();

  for (const item of items) {
    const itemKeys = getProductKeys(item);
    if (itemKeys.length === 0) {
      continue;
    }

    const existingIndex = itemKeys
      .map((key) => indexByKey.get(key))
      .find((index): index is number => typeof index === "number");

    if (typeof existingIndex !== "number") {
      const nextIndex = merged.length;
      merged.push(item);
      for (const key of itemKeys) {
        indexByKey.set(key, nextIndex);
      }
      continue;
    }

    const current = merged[existingIndex];
    const selected = chooseHigherPricedCatalogItem(current, item);
    merged[existingIndex] = selected;

    for (const key of [...getProductKeys(current), ...itemKeys, ...getProductKeys(selected)]) {
      indexByKey.set(key, existingIndex);
    }
  }

  return merged;
};

export const loadLiveCatalogItems = async () => {
  const cached = globalCatalogCache.__internextLiveCatalogCache;
  const now = Date.now();
  if (cached && cached.expiresAt > Date.now()) {
    return {
      updatedAt: cached.updatedAt,
      count: cached.items.length,
      source: cached.source,
      cached: true,
      items: cached.items,
    };
  }

  if (globalCatalogCache.__internextLiveCatalogPromise) {
    return globalCatalogCache.__internextLiveCatalogPromise;
  }

  const loadPromise = loadLiveCatalogItemsUncached(cached, now);
  globalCatalogCache.__internextLiveCatalogPromise = loadPromise;

  try {
    return await loadPromise;
  } finally {
    if (globalCatalogCache.__internextLiveCatalogPromise === loadPromise) {
      delete globalCatalogCache.__internextLiveCatalogPromise;
    }
  }
};

const loadLiveCatalogItemsUncached = async (
  cached: typeof globalCatalogCache.__internextLiveCatalogCache,
  now: number,
): Promise<LiveCatalogResult> => {
  const leaderProducts = await loadLeaderCatalogProducts();
  const leaderItems = leaderProducts.map(createLeaderLiveCatalogItem);
  const feedUrl = readEnv("ALLOYS_CATALOG_XML_FEED_URL") || readEnv("ALLOYS_CATALOG_FEED_URL");
  if (!feedUrl) {
    if (cached && cached.staleUntil > now) {
      return {
        updatedAt: cached.updatedAt,
        count: cached.items.length,
        source: cached.source,
        cached: true,
        stale: true,
        items: cached.items,
      };
    }
    throw new Error("Alloys catalog feed is not configured. Add ALLOYS_CATALOG_XML_FEED_URL to the server environment.");
  }

  try {
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
    const overridesByKey = buildStockOverrideMap(await fetchStockOverrides());
    const items = mergeLiveCatalogItems([...alloysItems, ...leaderItems])
      .map((item) => applyStockOverrideToProduct(item, getStockOverrideForProduct(item, overridesByKey)))
      .filter((item) =>
        isTangibleCatalogProduct(item as unknown as Record<string, unknown>),
      );
    const updatedAt = new Date().toISOString();
    const source = leaderItems.length > 0 ? "combined" : feedText.trim().startsWith("<") ? "xml" : "csv";
    const cacheMs = getServerCatalogCacheMs();
    const staleMs = getServerCatalogStaleMs();

    globalCatalogCache.__internextLiveCatalogCache = {
      expiresAt: Date.now() + cacheMs,
      staleUntil: Date.now() + cacheMs + staleMs,
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
  } catch (error) {
    if (cached && cached.staleUntil > now) {
      return {
        updatedAt: cached.updatedAt,
        count: cached.items.length,
        source: cached.source,
        cached: true,
        stale: true,
        items: cached.items,
      };
    }

    throw error;
  }
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
  return [...staticProducts, ...leaderOnlyProducts].filter((product) =>
    isTangibleCatalogProduct(product as Record<string, unknown>),
  ) as StaticCatalogProduct[];
};

export const loadMergedCatalogProducts = async () => {
  const cached = globalCatalogCache.__internextMergedCatalogCache;
  const now = Date.now();
  if (cached && cached.expiresAt > Date.now()) {
    return {
      updatedAt: cached.updatedAt,
      count: cached.items.length,
      source: cached.source,
      cached: true,
      items: cached.items,
    };
  }

  if (globalCatalogCache.__internextMergedCatalogPromise) {
    return globalCatalogCache.__internextMergedCatalogPromise;
  }

  const loadPromise = loadMergedCatalogProductsUncached(cached, now);
  globalCatalogCache.__internextMergedCatalogPromise = loadPromise;

  try {
    return await loadPromise;
  } finally {
    if (globalCatalogCache.__internextMergedCatalogPromise === loadPromise) {
      delete globalCatalogCache.__internextMergedCatalogPromise;
    }
  }
};

const loadMergedCatalogProductsUncached = async (
  cached: typeof globalCatalogCache.__internextMergedCatalogCache,
  now: number,
): Promise<MergedCatalogResult> => {
  let staticProducts: StaticCatalogProduct[];
  let liveCatalog: Awaited<ReturnType<typeof loadLiveCatalogItems>>;
  let stockOverrides: StockOverride[];

  try {
    [staticProducts, liveCatalog, stockOverrides] = await Promise.all([
      loadStaticCatalogProducts(),
      loadLiveCatalogItems(),
      fetchStockOverrides(),
    ]);
  } catch (error) {
    if (cached && cached.staleUntil > now) {
      return {
        updatedAt: cached.updatedAt,
        count: cached.items.length,
        source: cached.source,
        cached: true,
        stale: true,
        items: cached.items,
      };
    }

    throw error;
  }
  const liveByKey = new Map<string, LiveCatalogItem>();
  const overridesByKey = buildStockOverrideMap(stockOverrides);

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

      const stockOverride = getStockOverrideForProduct(product, overridesByKey);

      if (!live && !stockOverride) {
        return null;
      }

      const mergedProduct = live
        ? {
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
            longDescription: chooseLongDescription(live.longDescription, product.longDescription),
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
            gtin: getProductGtin(product) || live.gtin,
            liveUpdatedAt: liveCatalog.updatedAt,
          }
        : {
            ...product,
            price: product.price,
            priceText: product.priceText || formatCustomerAud(product.price ?? null),
            resellerPrice: product.resellerPrice ?? product.price,
            resellerPriceText:
              product.resellerPriceText ||
              formatResellerAud(product.resellerPrice ?? product.price ?? null),
            rrp: product.rrp,
            rrpText: product.rrpText || formatAud(product.rrp ?? null),
            rrpExGst: null,
            taxRate: 10,
            availabilityText: "Check availability",
            etaDate: "",
            etaStatus: "",
            stockQuantity: 0,
            stockByWarehouse: {
              adl: 0,
              bne: 0,
              mel: 0,
              syd: 0,
              wa: 0,
            },
            stockRecordUpdated: "",
            weightKg: product.weightKg ?? null,
            heightCm: product.heightCm ?? null,
            widthCm: product.widthCm ?? null,
            depthCm: product.depthCm ?? null,
            gtin: getProductGtin(product),
            liveUpdatedAt: liveCatalog.updatedAt,
          };

      return applyStockOverrideToProduct(mergedProduct, stockOverride);
    })
    .filter((item): item is StaticCatalogProduct & LiveCatalogItem =>
      Boolean(item) && isTangibleCatalogProduct(item as Record<string, unknown>),
    );

  globalCatalogCache.__internextMergedCatalogCache = {
    expiresAt: Date.now() + getServerCatalogCacheMs(),
    staleUntil: Date.now() + getServerCatalogCacheMs() + getServerCatalogStaleMs(),
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
    body?: string | Record<string, unknown>;
    headers?: { cookie?: string };
  },
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
) {
  if (req.method === "POST") {
    const session = getSessionFromRequest(req);
    if (session?.role !== "admin") {
      return sendJson(res, 403, { message: "Admin access is required to update catalog stock." });
    }

    let body: Record<string, unknown>;
    try {
      body =
        typeof req.body === "string"
          ? JSON.parse(req.body || "{}") as Record<string, unknown>
          : req.body || {};
    } catch {
      return sendJson(res, 400, { message: "Invalid JSON body." });
    }

    const result = await upsertStockOverride({
      code: body.code,
      supplierCode: body.supplierCode,
      stockQuantity: body.stockQuantity,
      supplierStockQuantity: body.supplierStockQuantity,
      stockLocation: body.stockLocation,
      note: body.note,
      adminEmail: session.email,
    });

    return sendJson(res, result.status, result);
  }

  if (req.method !== "GET") {
    return sendJson(res, 405, { message: "Method not allowed." });
  }

  try {
    const requestUrl = new URL(req.url || "/api/catalog/live", "https://internext.local");
    const catalog = requestUrl.searchParams.get("view") === "products"
      ? await loadMergedCatalogProducts()
      : await loadLiveCatalogItems();
    res.setHeader("Cache-Control", "s-maxage=1800, stale-while-revalidate=21600");
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
