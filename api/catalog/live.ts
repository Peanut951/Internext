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
  availabilityText: string;
  stockQuantity: number;
  stockByWarehouse: {
    adl: number;
    bne: number;
    mel: number;
    syd: number;
  };
  stockRecordUpdated: string;
};

const parseNumber = (value: string | undefined) => {
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

const formatAud = (value: number | null) =>
  value === null ? "P.O.A." : value.toLocaleString("en-AU", { style: "currency", currency: "AUD" });

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

      const price = parseNumber(parts[8]);
      const rrp = parseNumber(parts[9]);
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
        availabilityText: availabilityText?.trim() || (stockQuantity > 0 ? "In Stock" : "Check availability"),
        stockQuantity,
        stockByWarehouse: {
          adl: parseNumber(qtyAdl) ?? 0,
          bne: parseNumber(qtyBne) ?? 0,
          mel: parseNumber(qtyMel) ?? 0,
          syd: parseNumber(qtySyd) ?? 0,
        },
        stockRecordUpdated: stockRecordUpdated?.trim() || "",
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

  const feedUrl = readEnv("ALLOYS_CATALOG_FEED_URL");
  if (!feedUrl) {
    return sendJson(res, 500, {
      message: "Alloys catalog feed is not configured. Add ALLOYS_CATALOG_FEED_URL to the server environment.",
    });
  }

  try {
    const response = await fetch(feedUrl, {
      headers: {
        Accept: "text/csv,text/plain,*/*",
      },
    });

    if (!response.ok) {
      return sendJson(res, 502, { message: `Alloys feed returned ${response.status}.` });
    }

    const csv = await response.text();
    const items = parseLiveCatalog(csv);

    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    return sendJson(res, 200, {
      updatedAt: new Date().toISOString(),
      count: items.length,
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
