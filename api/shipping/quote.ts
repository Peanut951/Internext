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
  itemText?: string;
};

const ORIGIN_POSTCODE = "2158";
const MAX_PARCEL_WEIGHT_KG = 22;
const MAX_PARCEL_LENGTH_CM = 105;
const MAX_PARCEL_SIDE_CM = 70;
const PACKING_ALLOWANCE = 1.15;
const PACKING_WEIGHT_ALLOWANCE_KG = 0.25;
const CUBIC_WEIGHT_DIVISOR_CM = 4000;
const MIN_SHIPPING_TOTAL = 15;
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
  const itemText = `${item.manufacturer || ""} ${item.description || ""} ${item.longDescription || ""}`.toLowerCase();

  return roundParcel({
    itemCode: item.code,
    itemText,
    qty: 1,
    weightKg: estimate.weightKg,
    lengthCm: estimate.lengthCm,
    widthCm: estimate.widthCm,
    heightCm: estimate.heightCm,
  });
};

const getMinimumPackedWeightKg = (itemText = "") => {
  if (/\b(tablet|ipad)\b/.test(itemText)) {
    return 2;
  }

  if (/\b(laptop|notebook|chromebook)\b/.test(itemText)) {
    return 4;
  }

  if (/\b(monitor|display|screen|tv|signage|panel)\b/.test(itemText)) {
    return 6;
  }

  if (/\b(printer|multifunction|mfp|copier|scanner|plotter|large format)\b/.test(itemText)) {
    return 8;
  }

  if (/\b(projector|speaker|soundbar|conference)\b/.test(itemText)) {
    return 4;
  }

  if (/\b(ink|toner|cartridge|drum|ribbon|printhead)\b/.test(itemText)) {
    return 0.7;
  }

  if (/\b(cable|cord|lead|adapter|remote|mouse|keyboard|bracket|mount|wall\s*mount|stand|desk\s*stand|deskstand|base\s*station\s*stand)\b/.test(itemText)) {
    return 0.5;
  }

  if (/\b(camera|nvr|dvr|switch|router|phone|handset|headset|access point|ap\b|intercom)\b/.test(itemText)) {
    return 1.2;
  }

  return 0.5;
};

const getMinimumShippingFloor = (items: ShippingQuoteItem[] = []) => {
  const text = items
    .map((item) => `${item.manufacturer || ""} ${item.description || ""} ${item.longDescription || ""}`)
    .join(" ")
    .toLowerCase();

  if (/\b(monitor|display|screen|tv|signage|panel|projector)\b/.test(text)) {
    return 24;
  }

  if (/\b(printer|multifunction|mfp|copier|scanner|plotter|large format)\b/.test(text)) {
    return 30;
  }

  return MIN_SHIPPING_TOTAL;
};

const getChargeableWeightKg = (parcel: ParcelEstimate) => {
  const cubicWeight = (parcel.lengthCm * parcel.widthCm * parcel.heightCm) / CUBIC_WEIGHT_DIVISOR_CM;
  return Math.max(parcel.weightKg, cubicWeight);
};

const createConsolidatedParcel = (
  parcels: ParcelEstimate[],
  weightScale = 1,
): ParcelEstimate => {
  const totals = parcels.reduce(
    (acc, parcel) => {
      const qty = Math.max(1, Math.floor(toPositiveNumber(parcel.qty) ?? 1));
      const minimumPackedWeight = getMinimumPackedWeightKg(parcel.itemText) * qty * weightScale;
      const packedWeight = (parcel.weightKg + PACKING_WEIGHT_ALLOWANCE_KG) * qty * weightScale;
      return {
        weightKg: acc.weightKg + Math.max(packedWeight, minimumPackedWeight),
        volumeCm3: acc.volumeCm3 + parcel.lengthCm * parcel.widthCm * parcel.heightCm * qty * weightScale,
        lengthCm: Math.max(acc.lengthCm, parcel.lengthCm),
        widthCm: Math.max(acc.widthCm, parcel.widthCm),
        heightCm: Math.max(acc.heightCm, parcel.heightCm),
      };
    },
    { weightKg: 0, volumeCm3: 0, lengthCm: 0, widthCm: 0, heightCm: 0 },
  );

  const packedVolume = Math.max(totals.volumeCm3 * PACKING_ALLOWANCE, 1000);
  const cube = Math.cbrt(packedVolume);
  const lengthCm = Math.min(
    MAX_PARCEL_LENGTH_CM,
    Math.max(totals.lengthCm, cube * 1.4),
  );
  const widthCm = Math.min(
    MAX_PARCEL_SIDE_CM,
    Math.max(totals.widthCm, Math.sqrt(packedVolume / lengthCm) * 0.95),
  );
  const heightCm = Math.min(
    MAX_PARCEL_SIDE_CM,
    Math.max(totals.heightCm, packedVolume / (lengthCm * widthCm)),
  );

  return roundParcel({
    qty: 1,
    weightKg: Math.max(totals.weightKg, packedVolume / CUBIC_WEIGHT_DIVISOR_CM),
    lengthCm,
    widthCm,
    heightCm,
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

  const itemParcels = items.map((item) => ({
    ...buildParcelForItem(item),
    qty: Math.max(1, Math.floor(toPositiveNumber(item.qty) ?? 1)),
  }));

  const totalWeight = itemParcels.reduce((sum, parcel) => sum + parcel.weightKg * parcel.qty, 0);
  const parcelCount = Math.max(1, Math.ceil(totalWeight / MAX_PARCEL_WEIGHT_KG));

  if (parcelCount === 1) {
    return [createConsolidatedParcel(itemParcels)];
  }

  const weightScale = 1 / parcelCount;
  return Array.from({ length: parcelCount }, () => createConsolidatedParcel(itemParcels, weightScale));
};

const getItemsMissingShippingDimensions = (items: ShippingQuoteItem[] = []) =>
  items
    .filter((item) => estimateShippingProfile(item).estimated)
    .map((item) => ({
      code: item.code || "",
      description: item.description || item.manufacturer || item.code || "Product",
    }));

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
  const chargeableWeightKg = Math.max(parcel.weightKg, getChargeableWeightKg(parcel));
  const params = new URLSearchParams({
    from_postcode: ORIGIN_POSTCODE,
    to_postcode: destinationPostcode,
    length: String(parcel.lengthCm),
    width: String(parcel.widthCm),
    height: String(parcel.heightCm),
    weight: String(Math.round(chargeableWeightKg * 100) / 100),
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

  const estimatedDimensions = getItemsMissingShippingDimensions(body?.items || []);

  const parcels = calculateParcels(body?.items || []);
  const parcel = summarizeParcels(parcels);
  const shippingFloor = getMinimumShippingFloor(body?.items || []);
  const apiBaseUrl = readEnv("AUSPOST_API_BASE_URL") || "https://digitalapi.auspost.com.au";

  try {
    const parcelQuotes = await Promise.all(
      parcels.map((currentParcel) => quoteParcel(apiBaseUrl, authKey, destinationPostcode, currentParcel)),
    );
    const quotedPrice = parcelQuotes.reduce((sum, quote) => sum + quote.service.price, 0);
    const totalPrice = Math.max(quotedPrice, shippingFloor);
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
      quotedPrice,
      shippingFloor,
      estimatedDimensions,
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
