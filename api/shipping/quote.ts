import { readEnv, sendJson } from "../checkout/_shared.js";
import { estimateShippingProfile } from "./_estimates.js";

type ShippingQuoteItem = {
  code?: string;
  manufacturer?: string;
  description?: string;
  longDescription?: string;
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
  qty: number;
  itemCode?: string;
};

const ORIGIN_POSTCODE = "2158";
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

const roundParcel = (parcel: ParcelEstimate): ParcelEstimate => ({
  ...parcel,
  weightKg: Math.max(0.1, Math.round(parcel.weightKg * 100) / 100),
  lengthCm: Math.max(1, Math.round(parcel.lengthCm * 10) / 10),
  widthCm: Math.max(1, Math.round(parcel.widthCm * 10) / 10),
  heightCm: Math.max(1, Math.round(parcel.heightCm * 10) / 10),
});

const buildParcelForItem = (item: ShippingQuoteItem): ParcelEstimate => {
  const estimate = estimateShippingProfile(item);

  return roundParcel({
    itemCode: item.code,
    qty: 1,
    weightKg: estimate.weightKg,
    lengthCm: estimate.lengthCm,
    widthCm: estimate.widthCm,
    heightCm: estimate.heightCm,
  });
};

const calculateParcels = (items: ShippingQuoteItem[] = []) => {
  if (items.length === 0) {
    return [{
      qty: 1,
      weightKg: 1,
      lengthCm: 30,
      widthCm: 20,
      heightCm: 10,
    }];
  }

  return items.map((item) => ({
    ...buildParcelForItem(item),
    qty: Math.max(1, Math.floor(toPositiveNumber(item.qty) ?? 1)),
  }));
};

const summarizeParcels = (parcels: ParcelEstimate[]) => {
  const summary = parcels.reduce<ParcelEstimate>(
    (acc, parcel) => ({
      qty: acc.qty + parcel.qty,
      weightKg: acc.weightKg + parcel.weightKg * parcel.qty,
      lengthCm: Math.max(acc.lengthCm, parcel.lengthCm),
      widthCm: Math.max(acc.widthCm, parcel.widthCm),
      heightCm: Math.max(acc.heightCm, parcel.heightCm),
    }),
    { qty: 0, weightKg: 0, lengthCm: 0, widthCm: 0, heightCm: 0 },
  );

  return roundParcel(summary);
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

const quoteParcel = async (
  apiBaseUrl: string,
  authKey: string,
  destinationPostcode: string,
  parcel: ParcelEstimate,
) => {
  const params = new URLSearchParams({
    from_postcode: ORIGIN_POSTCODE,
    to_postcode: destinationPostcode,
    length: String(parcel.lengthCm),
    width: String(parcel.widthCm),
    height: String(parcel.heightCm),
    weight: String(parcel.weightKg),
  });

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
    throw new Error(JSON.stringify(payload));
  }

  const services = getServices(payload).map(formatService).filter((service) => service.price > 0);
  const cheapest = services.slice().sort((a, b) => a.price - b.price)[0] || null;

  if (!cheapest) {
    throw new Error("No Australia Post shipping services were returned for this parcel.");
  }

  return { parcel, service: cheapest, services };
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

  const parcels = calculateParcels(body?.items || []);
  const parcel = summarizeParcels(parcels);
  const apiBaseUrl = readEnv("AUSPOST_API_BASE_URL") || "https://digitalapi.auspost.com.au";

  try {
    const parcelQuotes = await Promise.all(
      parcels.map((currentParcel) => quoteParcel(apiBaseUrl, authKey, destinationPostcode, currentParcel)),
    );
    const totalPrice = parcelQuotes.reduce(
      (sum, quote) => sum + quote.service.price * quote.parcel.qty,
      0,
    );
    const primaryService = parcelQuotes[0].service;
    const serviceName =
      parcelQuotes.length === 1 && parcels[0].qty === 1
        ? primaryService.name
        : `${primaryService.name} (${parcel.qty} parcels)`;

    return sendJson(res, 200, {
      originPostcode: ORIGIN_POSTCODE,
      destinationPostcode,
      parcel,
      parcels,
      service: {
        ...primaryService,
        name: serviceName,
        price: totalPrice,
        priceText: totalPrice.toLocaleString("en-AU", { style: "currency", currency: "AUD" }),
      },
      parcelQuotes,
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
