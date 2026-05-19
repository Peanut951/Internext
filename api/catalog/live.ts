import { readEnv, sendJson } from "../checkout/_shared.js";

type LiveCatalogItem = {
  code: string;
  supplierCode: string;
  manufacturer: string;
  name: string;
  price: number | null;
  priceText: string;
  rrp: number | null;
  rrpText: string;
  costExGst: number | null;
  markupRate: number;
  priceExGst: number | null;
  rrpExGst: number | null;
  taxRate: number;
  availabilityText: string;
  stockQuantity: number;
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

const parseNumber = (value: string | undefined) => {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const formatAud = (value: number | null) =>
  value === null ? "P.O.A." : value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });

const applyTax = (value: number | null, taxRate: number) =>
  value === null ? null : Math.round(value * (1 + taxRate / 100) * 100) / 100;

const SELL_PRICE_MARKUP_RATE = 0.2;

const applyMarkup = (value: number | null) =>
  value === null ? null : Math.round(value * (1 + SELL_PRICE_MARKUP_RATE) * 100) / 100;

const metresToCentimetres = (value: number | null) =>
  value === null ? null : Math.round(value * 100 * 10) / 10;

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
      const price = applyMarkup(costExGst);
      const rrpExGst = parseNumber(parts[9]);
      const taxRate = parseNumber(parts[11]) ?? 0;
      const rrp = applyTax(rrpExGst, taxRate);
      const stockQuantity = parseNumber(parts[12]) ?? 0;
      const tail = parts.slice(-7);
      const [stockRecordUpdated, , availabilityText, qtyAdl, qtyBne, qtyMel, qtySyd] = tail;

      return {
        code,
        supplierCode: parts[13]?.trim() || code,
        manufacturer: parts[3]?.trim() || "",
        name: parts[1]?.trim() || "",
        price,
        priceText: formatAud(price),
        rrp,
        rrpText: formatAud(rrp),
        costExGst,
        markupRate: SELL_PRICE_MARKUP_RATE,
        priceExGst: price,
        rrpExGst,
        taxRate,
        availabilityText: availabilityText?.trim() || (stockQuantity > 0 ? "In Stock" : "Check availability"),
        stockQuantity,
        stockByWarehouse: {
          adl: parseNumber(qtyAdl) ?? 0,
          bne: parseNumber(qtyBne) ?? 0,
          mel: parseNumber(qtyMel) ?? 0,
          syd: parseNumber(qtySyd) ?? 0,
        },
        stockRecordUpdated: stockRecordUpdated?.trim() || "",
        weightKg: parseNumber(parts[17]),
        heightCm: metresToCentimetres(parseNumber(parts[18])),
        widthCm: metresToCentimetres(parseNumber(parts[19])),
        depthCm: metresToCentimetres(parseNumber(parts[20])),
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
      const price = applyMarkup(costExGst);
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
        priceText: formatAud(price),
        rrp,
        rrpText: formatAud(rrp),
        costExGst,
        markupRate: SELL_PRICE_MARKUP_RATE,
        priceExGst: price,
        rrpExGst,
        taxRate,
        availabilityText: getXmlTag(row, "ETAStatus") || (stockQuantity > 0 ? "In Stock" : "Check availability"),
        stockQuantity,
        stockByWarehouse: {
          adl: parseNumber(getXmlTag(row, "Qty_ADL")) ?? 0,
          bne: parseNumber(getXmlTag(row, "Qty_BNE")) ?? 0,
          mel: parseNumber(getXmlTag(row, "Qty_MEL")) ?? 0,
          syd: parseNumber(getXmlTag(row, "Qty_SYD")) ?? 0,
        },
        stockRecordUpdated: getXmlTag(row, "StockRecordUpdated"),
        weightKg: parseNumber(getXmlTag(row, "Weight")),
        heightCm: metresToCentimetres(parseNumber(getXmlTag(row, "Height"))),
        widthCm: metresToCentimetres(parseNumber(getXmlTag(row, "Width"))),
        depthCm: metresToCentimetres(parseNumber(getXmlTag(row, "Depth"))),
      };
    })
    .filter((item): item is LiveCatalogItem => Boolean(item));
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
    return sendJson(res, 405, { message: "Method not allowed." });
  }

  const feedUrl = readEnv("ALLOYS_CATALOG_XML_FEED_URL") || readEnv("ALLOYS_CATALOG_FEED_URL");
  if (!feedUrl) {
    return sendJson(res, 500, {
      message: "Alloys catalog feed is not configured. Add ALLOYS_CATALOG_XML_FEED_URL to the server environment.",
    });
  }

  try {
    const response = await fetch(feedUrl, {
      headers: {
        Accept: "application/xml,text/xml,text/csv,text/plain,*/*",
      },
    });

    if (!response.ok) {
      return sendJson(res, 502, { message: `Alloys feed returned ${response.status}.` });
    }

    const feedText = await response.text();
    const items = feedText.trim().startsWith("<")
      ? parseLiveCatalogXml(feedText)
      : parseLiveCatalog(feedText);

    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    return sendJson(res, 200, {
      updatedAt: new Date().toISOString(),
      count: items.length,
      source: feedText.trim().startsWith("<") ? "xml" : "csv",
      items,
    });
  } catch (error) {
    return sendJson(res, 502, {
      message:
        error instanceof Error
          ? `Unable to load Alloys catalog feed: ${error.message}`
          : "Unable to load Alloys catalog feed.",
    });
  }
}
