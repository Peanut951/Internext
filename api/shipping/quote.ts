import { loadMergedCatalogProducts } from "../catalog/live.js";
import { parseJsonBody, sendJson } from "../checkout/_shared.js";
import { createShippingQuoteToken } from "./_quoteToken.js";
import { getStandardShippingService } from "../../shared/shipping-policy.js";

type ShippingQuoteItem = {
  code?: string;
  supplierCode?: string;
  qty?: number;
};

type RequestBody = {
  destinationPostcode?: string;
  items?: ShippingQuoteItem[];
};

const ORIGIN_POSTCODE = "2158";

const normalizeProductKey = (value: unknown) => String(value || "").trim().toLowerCase();

const loadVerifiedQuoteItems = async (items: ShippingQuoteItem[]) => {
  if (items.length === 0) {
    throw new Error("The cart is empty.");
  }

  const catalog = await loadMergedCatalogProducts({ refreshStockOverrides: true });
  const productsByKey = new Map<string, (typeof catalog.items)[number]>();
  for (const product of catalog.items) {
    for (const key of [product.code, product.supplierCode]) {
      const normalized = normalizeProductKey(key);
      if (normalized) productsByKey.set(normalized, product);
    }
  }

  return items.map((item) => {
    const verified = [item.code, item.supplierCode]
      .map((key) => productsByKey.get(normalizeProductKey(key)))
      .find(Boolean);
    if (!verified) {
      throw new Error(`${item.code || "A cart product"} is no longer available in the current supplier catalogue.`);
    }
    if (verified.quoteRequired) {
      throw new Error(`${verified.code} requires a manual product and freight quote.`);
    }

    return {
      code: verified.code,
      supplierCode: verified.supplierCode,
      qty: Math.max(1, Math.floor(Number(item.qty) || 1)),
    } satisfies ShippingQuoteItem;
  });
};

const getShippingErrorMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/requires a manual product and freight quote|no longer available|cart is empty/i.test(message)) {
    return message;
  }

  return "Unable to verify shipping right now. Please try again or contact Internext.";
};

export const calculateAuthoritativeShippingQuote = async (
  destinationPostcodeInput: string,
  items: ShippingQuoteItem[],
) => {
  const destinationPostcode = String(destinationPostcodeInput || "").trim();
  if (!/^\d{4}$/.test(destinationPostcode)) {
    throw new Error("A valid Australian destination postcode is required.");
  }

  const verifiedItems = await loadVerifiedQuoteItems(items);
  const service = getStandardShippingService();
  const itemCount = verifiedItems.reduce((total, item) => total + Math.max(1, Number(item.qty) || 1), 0);

  return {
    originPostcode: ORIGIN_POSTCODE,
    destinationPostcode,
    parcel: {
      qty: itemCount,
      weightKg: 0,
      lengthCm: 0,
      widthCm: 0,
      heightCm: 0,
    },
    parcels: [],
    service,
    quoteToken: createShippingQuoteToken({ destinationPostcode, items: verifiedItems, service }),
    quotedPrice: service.price,
    shippingFloor: service.price,
    estimatedDimensions: [],
    measurementProfiles: [],
    parcelQuotes: [],
  };
};

export default async function handler(
  req: {
    method?: string;
    body?: string | RequestBody;
  },
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method not allowed." });
  }

  const body = parseJsonBody<RequestBody>(req.body);
  const destinationPostcode = String(body?.destinationPostcode || "").trim();
  if (!/^\d{4}$/.test(destinationPostcode)) {
    return sendJson(res, 400, { message: "A valid Australian destination postcode is required." });
  }

  try {
    const quote = await calculateAuthoritativeShippingQuote(destinationPostcode, body?.items || []);
    return sendJson(res, 200, quote);
  } catch (error) {
    const message = getShippingErrorMessage(error);
    const status = /requires a manual product and freight quote|no longer available|cart is empty/i.test(message)
      ? 409
      : 502;
    return sendJson(res, status, { message });
  }
}
