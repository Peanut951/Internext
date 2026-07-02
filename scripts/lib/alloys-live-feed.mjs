import fs from "node:fs";
import path from "node:path";

const CUSTOMER_MARGIN_RATE = 0.1;
const CUSTOMER_GST_RATE = 0.1;
const RESELLER_MARGIN_RATE = 0.1;
const MIN_RRP_PRICE_MULTIPLIER = 1.1;

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (process.env[key]) {
      continue;
    }

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }
};

const readEnv = (name) => {
  loadEnvFile(path.resolve(".env.local"));
  loadEnvFile(path.resolve(".env"));
  return process.env[name] || "";
};

const parseNumber = (value) => {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePositiveNumber = (value) => {
  const parsed = parseNumber(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};

const normalizeGtin = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits) ? digits : "";
};

const cleanSupplierDescription = (value) =>
  String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");

const isDetailedDescription = (value) => {
  const text = String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length >= 350 || (text.match(/[.!?]/g) || []).length >= 4;
};

const chooseLongDescription = (preferred, fallback) =>
  isDetailedDescription(preferred)
    ? String(preferred).trim()
    : typeof fallback === "string" && fallback.trim()
      ? fallback.trim()
      : typeof preferred === "string"
        ? preferred.trim()
        : undefined;

const normalizeHeaderName = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

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

const parseCsvRecords = (text) => {
  const records = [];
  let field = "";
  let record = [];
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

const getCsvField = (headers, parts, names) => {
  for (const name of names) {
    const index = headers.indexOf(normalizeHeaderName(name));
    if (index >= 0 && parts[index] !== undefined) {
      return parts[index]?.trim() || "";
    }
  }

  return "";
};

const decodeXmlText = (value) =>
  String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");

const getXmlTag = (row, tag) => {
  const match = row.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXmlText(match[1].trim()) : "";
};

const getFirstXmlTag = (row, tags) => {
  for (const tag of tags) {
    const value = getXmlTag(row, tag);
    if (value.trim()) {
      return value;
    }
  }

  return "";
};

const formatAud = (value) =>
  value === null ? "P.O.A." : value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });

const formatCustomerAud = (value) => (value === null ? "P.O.A." : `${formatAud(value)} Inc GST`);
const formatResellerAud = (value) => (value === null ? "P.O.A." : `${formatAud(value)} Ex GST`);

const applyTax = (value, taxRate) =>
  value === null ? null : Math.round(value * (1 + taxRate / 100) * 100) / 100;

const removeTax = (value, taxRate) =>
  value === null ? null : Math.round((value / (1 + taxRate / 100)) * 100) / 100;

const applyCustomerPrice = (value) =>
  value === null
    ? null
    : Math.round(value * (1 + CUSTOMER_MARGIN_RATE) * (1 + CUSTOMER_GST_RATE) * 100) / 100;

const applyResellerPrice = (value) =>
  value === null ? null : Math.round(value * (1 + RESELLER_MARGIN_RATE) * 100) / 100;

const ensureMinimumRrp = (rrp, price) => {
  if (price === null || price <= 0 || !Number.isFinite(price)) {
    return rrp;
  }

  const minimumRrp = Math.round(price * MIN_RRP_PRICE_MULTIPLIER * 100) / 100;
  if (rrp === null || rrp < minimumRrp || !Number.isFinite(rrp)) {
    return minimumRrp;
  }

  return rrp;
};

const metresToCentimetres = (value) =>
  value === null ? null : Math.round(value * 100 * 10) / 10;

const formatDateDmy = (value) => {
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

const formatEtaDateDmy = (value) => {
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

const isBackToBackStatus = (value) => /^btb$/i.test(String(value || "").trim());

const normalizeAvailabilityStatus = (value, stockQuantity) => {
  const status = String(value || "").trim();
  if (isBackToBackStatus(status)) {
    return "Contact us for availability information";
  }

  if (!status || /^\d{4}-\d{2}-\d{2}$/.test(status) || /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(status)) {
    return stockQuantity > 0 ? "In Stock" : "Check availability";
  }

  return status;
};

const normalizeEtaStatus = (value) =>
  isBackToBackStatus(value) ? "Contact us for availability information" : formatEtaDateDmy(value);

const createLiveItem = ({
  code,
  supplierCode,
  manufacturer,
  name,
  longDescription,
  costExGst,
  rrpExGst,
  taxRate,
  stockQuantity,
  stockRecordUpdated,
  etaDate,
  etaStatus,
  qtyAdl,
  qtyBne,
  qtyMel,
  qtySyd,
  qtyWa,
  weightKg,
  heightCm,
  widthCm,
  depthCm,
  gtin,
}) => {
  const price = applyCustomerPrice(costExGst);
  const resellerPrice = applyResellerPrice(costExGst);
  const rrp = ensureMinimumRrp(applyTax(rrpExGst, taxRate), price);

  return {
    code,
    supplierCode: supplierCode || code,
    manufacturer,
    name,
    longDescription,
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
    stockByWarehouse: {
      adl: qtyAdl,
      bne: qtyBne,
      mel: qtyMel,
      syd: qtySyd,
      wa: qtyWa,
    },
    stockRecordUpdated: formatDateDmy(stockRecordUpdated),
    weightKg,
    heightCm,
    widthCm,
    depthCm,
    gtin,
  };
};

const parseLiveCatalogCsv = (csv) => {
  const records = parseCsvRecords(csv.replace(/^\uFEFF/, ""));
  const [rawHeaders = [], ...rows] = records;
  const headers = rawHeaders.map(normalizeHeaderName);

  return rows
    .map((parts) => {
      const code = parts[0]?.trim();
      if (!code) {
        return null;
      }

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
      const warehouseStockQuantity =
        stockByWarehouse.adl +
        stockByWarehouse.bne +
        stockByWarehouse.mel +
        stockByWarehouse.syd +
        stockByWarehouse.wa;

      return createLiveItem({
        code,
        supplierCode: parts[13]?.trim() || code,
        manufacturer: parts[3]?.trim() || "",
        name: parts[1]?.trim() || "",
        longDescription: cleanSupplierDescription(getCsvField(headers, parts, SUPPLIER_DESCRIPTION_FIELDS)) || undefined,
        costExGst: parseNumber(parts[8]),
        rrpExGst: parseNumber(parts[9]),
        taxRate: parseNumber(parts[11]) ?? 0,
        stockQuantity: warehouseStockQuantity || parseNumber(parts[12]) || 0,
        stockRecordUpdated,
        etaDate,
        etaStatus,
        qtyAdl: stockByWarehouse.adl,
        qtyBne: stockByWarehouse.bne,
        qtyMel: stockByWarehouse.mel,
        qtySyd: stockByWarehouse.syd,
        qtyWa: stockByWarehouse.wa,
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
      });
    })
    .filter(Boolean);
};

const parseLiveCatalogXml = (xml) => {
  const rows = Array.from(xml.matchAll(/<row>([\s\S]*?)<\/row>/gi), (match) => match[1]);

  return rows
    .map((row) => {
      const code = getXmlTag(row, "PartNumber");
      if (!code) {
        return null;
      }

      const stockByWarehouse = {
        adl: parseNumber(getXmlTag(row, "Qty_ADL")) ?? 0,
        bne: parseNumber(getXmlTag(row, "Qty_BNE")) ?? 0,
        mel: parseNumber(getXmlTag(row, "Qty_MEL")) ?? 0,
        syd: parseNumber(getXmlTag(row, "Qty_SYD")) ?? 0,
        wa:
          parseNumber(getFirstXmlTag(row, ["Qty_WA", "Qty_WAUS", "Qty_PER", "Qty_PERTH", "Qty_WesternAustralia"])) ??
          0,
      };
      const warehouseStockQuantity =
        stockByWarehouse.adl +
        stockByWarehouse.bne +
        stockByWarehouse.mel +
        stockByWarehouse.syd +
        stockByWarehouse.wa;
      const stockQuantity = warehouseStockQuantity || parseNumber(getXmlTag(row, "Quantity")) || 0;

      return createLiveItem({
        code,
        supplierCode: getXmlTag(row, "SupplierPartNumber") || code,
        manufacturer: getXmlTag(row, "Manufacturer"),
        name: getXmlTag(row, "Name"),
        longDescription: cleanSupplierDescription(getFirstXmlTag(row, SUPPLIER_DESCRIPTION_FIELDS)) || undefined,
        costExGst: parseNumber(getXmlTag(row, "PriceCostEx")),
        rrpExGst: parseNumber(getXmlTag(row, "PriceRetailEx")),
        taxRate: parseNumber(getXmlTag(row, "TaxRate")) ?? 0,
        stockQuantity,
        stockRecordUpdated: getXmlTag(row, "StockRecordUpdated"),
        etaDate: getXmlTag(row, "ETADate"),
        etaStatus: getXmlTag(row, "ETAStatus"),
        qtyAdl: stockByWarehouse.adl,
        qtyBne: stockByWarehouse.bne,
        qtyMel: stockByWarehouse.mel,
        qtySyd: stockByWarehouse.syd,
        qtyWa: stockByWarehouse.wa,
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
      });
    })
    .filter(Boolean);
};

const getProductKeys = (product) =>
  [product.code, product.supplierCode]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

export const loadAlloysLiveCatalogItems = async () => {
  const feedUrl = readEnv("ALLOYS_CATALOG_XML_FEED_URL") || readEnv("ALLOYS_CATALOG_FEED_URL");
  if (!feedUrl) {
    return [];
  }

  const response = await fetch(feedUrl, {
    headers: {
      Accept: "application/xml,text/xml,text/csv,text/plain,*/*",
    },
  });

  if (!response.ok) {
    throw new Error(`Alloys feed returned ${response.status}.`);
  }

  const text = await response.text();
  return text.trim().startsWith("<") ? parseLiveCatalogXml(text) : parseLiveCatalogCsv(text);
};

export const mergeAlloysLivePricing = (products, liveItems) => {
  if (!Array.isArray(liveItems) || liveItems.length === 0) {
    return products;
  }

  const liveByKey = new Map();
  for (const item of liveItems) {
    for (const key of getProductKeys(item)) {
      liveByKey.set(key, item);
    }
  }

  return products.map((product) => {
    const live = getProductKeys(product)
      .map((key) => liveByKey.get(key))
      .find(Boolean);

    if (!live) {
      return product;
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
      gtin: product.gtin || product.ean || product.upc || product.barcode || live.gtin,
      liveUpdatedAt: new Date().toISOString(),
    };
  });
};
