import { readEnv, sendJson } from "../checkout/_shared.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";

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
  gtin: string;
};

type LiveCatalogCache = {
  expiresAt: number;
  staleUntil: number;
  updatedAt: string;
  source: "xml" | "csv" | "combined";
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

const parseNumber = (value: string | undefined) => {
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

const normalizeHeaderName = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

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

const leaderMillimetresToCentimetres = (value: number | null) =>
  value === null ? null : Math.round((value / 10) * 10) / 10;

const getLeaderEtaDate = (row: Record<string, string>) =>
  [getCsvValue(row, "ETAA"), getCsvValue(row, "ETAQ"), getCsvValue(row, "ETAN"), getCsvValue(row, "ETAV"), getCsvValue(row, "ETAW")]
    .map(formatDateDmy)
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
      };
      const stockQuantity = parseLeaderQuantity(getCsvValue(row, "AT")) ||
        stockByWarehouse.adl + stockByWarehouse.bne + stockByWarehouse.syd + stockByWarehouse.mel;
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
  const [header = "", ...rows] = splitFeedRows(csv);
  const headers = header.split(",").map(normalizeHeaderName);

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
  __internextMergedCatalogCache?: MergedCatalogCache;
  __internextLeaderCatalogProductsCache?: {
    expiresAt: number;
    staleUntil: number;
    products: LeaderCatalogProduct[];
  };
};

const getProductKeys = (product: Pick<StaticCatalogProduct, "code" | "supplierCode">) =>
  [product.code, product.supplierCode]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));

const loadLeaderCatalogProducts = async () => {
  const cached = globalCatalogCache.__internextLeaderCatalogProductsCache;
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.products;
  }

  const cacheMs = getServerCatalogCacheMs();
  const staleMs = getServerCatalogStaleMs();
  const feedUrl = readEnv("LEADER_DATA_FEED_URL");
  let feedProducts: LeaderCatalogProduct[] = [];

  try {
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

      feedProducts = parseLeaderFeedCsv(csv);
    }

    const leaderPath = join(process.cwd(), "public", "data", "leader-products.json");
    const raw = await readFile(leaderPath, "utf8");
    const staticProducts = JSON.parse(raw) as LeaderCatalogProduct[];
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

    const products = Array.from(productsByKey.values());
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
      const leaderPath = join(process.cwd(), "public", "data", "leader-products.json");
      const raw = await readFile(leaderPath, "utf8");
      return JSON.parse(raw) as LeaderCatalogProduct[];
    } catch {
      return [] as LeaderCatalogProduct[];
    }
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
    availabilityText: product.leaderStatus || LEADER_AVAILABILITY_TEXT,
    stockQuantity: product.stockQuantity,
    stockByWarehouse: {
      adl: product.stockByWarehouse?.adl ?? 0,
      bne: product.stockByWarehouse?.bne ?? 0,
      mel: product.stockByWarehouse?.mel ?? 0,
      syd: product.stockByWarehouse?.syd ?? 0,
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
    const items = mergeLiveCatalogItems([...alloysItems, ...leaderItems]);
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
  return [...staticProducts, ...leaderOnlyProducts] as StaticCatalogProduct[];
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

  let staticProducts: StaticCatalogProduct[];
  let liveCatalog: Awaited<ReturnType<typeof loadLiveCatalogItems>>;

  try {
    [staticProducts, liveCatalog] = await Promise.all([
      loadStaticCatalogProducts(),
      loadLiveCatalogItems(),
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
        gtin: getProductGtin(product) || live.gtin,
        liveUpdatedAt: liveCatalog.updatedAt,
      };
    })
    .filter((item): item is StaticCatalogProduct & LiveCatalogItem => Boolean(item));

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
