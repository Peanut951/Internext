import { readEnv, sendJson } from "../checkout/_shared.js";

type ShippingQuoteItem = {
  code?: string;
  qty?: number;
  weightKg?: number | null;
  heightCm?: number | null;
  widthCm?: number | null;
  depthCm?: number | null;
};

type RequestBody = {
  destinationPostcode?: string;
  items?: ShippingQuoteItem[];
};

type ParcelEstimate = {
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

const ORIGIN_POSTCODE = "2158";
const DEFAULT_WEIGHT_KG = 1;
const DEFAULT_LENGTH_CM = 30;
const DEFAULT_WIDTH_CM = 20;
const DEFAULT_HEIGHT_CM = 10;

const parseJsonBody = <T extends Record<string, unknown>>(body: string | T | undefined): T | null => {
  if (!body) {
    return null;
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body) as T;
    } catch {
      return null;
    }
  }

  return body;
};

const toPositiveNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const calculateParcel = (items: ShippingQuoteItem[] = []) => {
  if (items.length === 0) {
    return {
      weightKg: DEFAULT_WEIGHT_KG,
      lengthCm: DEFAULT_LENGTH_CM,
      widthCm: DEFAULT_WIDTH_CM,
      heightCm: DEFAULT_HEIGHT_CM,
    };
  }

  const parcel = items.reduce<ParcelEstimate>(
    (acc, item) => {
      const qty = Math.max(1, Math.floor(toPositiveNumber(item.qty) ?? 1));
      const weightKg = toPositiveNumber(item.weightKg) ?? DEFAULT_WEIGHT_KG;
      const lengthCm = toPositiveNumber(item.depthCm) ?? DEFAULT_LENGTH_CM;
      const widthCm = toPositiveNumber(item.widthCm) ?? DEFAULT_WIDTH_CM;
      const heightCm = toPositiveNumber(item.heightCm) ?? DEFAULT_HEIGHT_CM;

      return {
        weightKg: acc.weightKg + weightKg * qty,
        lengthCm: Math.max(acc.lengthCm, lengthCm),
        widthCm: Math.max(acc.widthCm, widthCm),
        heightCm: acc.heightCm + heightCm * qty,
      };
    },
    { weightKg: 0, lengthCm: 0, widthCm: 0, heightCm: 0 },
  );

  return {
    weightKg: Math.max(0.1, Math.round(parcel.weightKg * 100) / 100),
    lengthCm: Math.max(1, Math.round(parcel.lengthCm * 10) / 10),
    widthCm: Math.max(1, Math.round(parcel.widthCm * 10) / 10),
    heightCm: Math.max(1, Math.round(parcel.heightCm * 10) / 10),
  };
};

const getServices = (payload: unknown) => {
  const services = (payload as { services?: { service?: unknown } })?.services?.service;
  if (!services) {
    return [];
  }
  return Array.isArray(services) ? services : [services];
};

const formatService = (service: unknown) => {
  const item = service as {
    code?: string;
    name?: string;
    price?: string | number;
    max_extra_cover?: string | number;
  };
  const price = Number(item.price);

  return {
    code: item.code || "",
    name: item.name || item.code || "Australia Post",
    price: Number.isFinite(price) ? price : 0,
    priceText: Number.isFinite(price)
      ? price.toLocaleString("en-AU", { style: "currency", currency: "AUD" })
      : "Unavailable",
    maxExtraCover: item.max_extra_cover,
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

  const authKey = readEnv("AUSPOST_AUTH_KEY");
  if (!authKey) {
    return sendJson(res, 500, {
      message: "Australia Post shipping is not configured. Add AUSPOST_AUTH_KEY to the server environment.",
    });
  }

  const body = parseJsonBody<RequestBody>(req.body);
  const destinationPostcode = String(body?.destinationPostcode || "").trim();

  if (!/^\d{4}$/.test(destinationPostcode)) {
    return sendJson(res, 400, { message: "A valid Australian destination postcode is required." });
  }

  const parcel = calculateParcel(body?.items || []);
  const apiBaseUrl = readEnv("AUSPOST_API_BASE_URL") || "https://digitalapi.auspost.com.au";
  const params = new URLSearchParams({
    from_postcode: ORIGIN_POSTCODE,
    to_postcode: destinationPostcode,
    length: String(parcel.lengthCm),
    width: String(parcel.widthCm),
    height: String(parcel.heightCm),
    weight: String(parcel.weightKg),
  });

  try {
    const response = await fetch(
      `${apiBaseUrl.replace(/\/$/, "")}/postage/parcel/domestic/service.json?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "AUTH-KEY": authKey,
          Accept: "application/json",
        },
      },
    );

    const payload = await response.json();
    if (!response.ok) {
      return sendJson(res, 502, { message: "Australia Post could not calculate shipping.", details: payload });
    }

    const services = getServices(payload).map(formatService).filter((service) => service.price > 0);
    const cheapest = services.slice().sort((a, b) => a.price - b.price)[0] || null;

    if (!cheapest) {
      return sendJson(res, 404, { message: "No Australia Post shipping services were returned for this address." });
    }

    return sendJson(res, 200, {
      originPostcode: ORIGIN_POSTCODE,
      destinationPostcode,
      parcel,
      service: cheapest,
      services,
    });
  } catch (error) {
    return sendJson(res, 502, {
      message:
        error instanceof Error
          ? `Unable to reach Australia Post shipping: ${error.message}`
          : "Unable to reach Australia Post shipping.",
    });
  }
}
