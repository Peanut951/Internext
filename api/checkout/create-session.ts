import {
  buildStripeCheckoutParams,
  createStripeCheckoutSession,
  getRequestOrigin,
  isValidCheckoutOrigin,
  parseJsonBody,
  sendJson,
  validateCheckoutPayload,
} from "./_shared.js";
import { getSessionFromRequest } from "../auth/_shared.js";
import { loadLiveCatalogItems } from "../catalog/live.js";

type RequestBody = {
  origin?: string;
  resellerEmail?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
  };
  items?: Array<{
    code: string;
    description: string;
    manufacturer: string;
    qty: number;
    price: number | null;
    priceText?: string;
  }>;
  shipping?: {
    name?: string;
    price?: number;
  };
};

const normalizeStockKey = (value: string | undefined) => value?.trim().toLowerCase() || "";

const validateLiveStock = async (items: NonNullable<RequestBody["items"]>) => {
  const catalog = await loadLiveCatalogItems();
  const liveByCode = new Map(
    catalog.items.flatMap((item) =>
      [item.code, item.supplierCode]
        .map(normalizeStockKey)
        .filter(Boolean)
        .map((key) => [key, item] as const),
    ),
  );

  const unavailable: string[] = [];
  const insufficient: string[] = [];
  const unknown: string[] = [];

  items.forEach((item) => {
    const live = liveByCode.get(normalizeStockKey(item.code));
    if (!live) {
      unknown.push(item.code);
      return;
    }

    if (live.stockQuantity <= 0) {
      unavailable.push(item.code);
      return;
    }

    if (item.qty > live.stockQuantity) {
      insufficient.push(`${item.code} has ${live.stockQuantity} available`);
    }
  });

  if (unavailable.length > 0) {
    return `Remove out-of-stock item(s) before payment: ${unavailable.join(", ")}.`;
  }

  if (insufficient.length > 0) {
    return `Reduce quantity before payment: ${insufficient.join(", ")}.`;
  }

  if (unknown.length > 0) {
    return `Unable to confirm live stock for: ${unknown.join(", ")}.`;
  }

  return null;
};

export default async function handler(
  req: {
    method?: string;
    body?: string | RequestBody;
    headers?: Record<string, string | string[] | undefined>;
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

  const authSession = getSessionFromRequest({
    headers: {
      cookie: Array.isArray(req.headers?.cookie) ? req.headers?.cookie[0] : req.headers?.cookie,
    },
  });

  const body = parseJsonBody<RequestBody>(req.body);
  if (!body) {
    return sendJson(res, 400, { message: "Invalid request body." });
  }

  const origin = getRequestOrigin(req.headers, String(body.origin || "").trim());
  if (!isValidCheckoutOrigin(origin)) {
    return sendJson(res, 400, { message: "A valid checkout origin is required." });
  }

  const validationError = validateCheckoutPayload(body.customer, body.items);
  if (validationError) {
    return sendJson(res, 400, { message: validationError });
  }

  try {
    const stockError = await validateLiveStock(body.items || []);
    if (stockError) {
      return sendJson(res, 400, { message: stockError });
    }
  } catch (error) {
    return sendJson(res, 502, {
      message:
        error instanceof Error
          ? `Unable to verify live stock availability: ${error.message}`
          : "Unable to verify live stock availability.",
    });
  }

  const params = buildStripeCheckoutParams({
    origin,
    customer: {
      firstName: String(body.customer?.firstName || ""),
      lastName: String(body.customer?.lastName || ""),
      email: String(body.customer?.email || ""),
      phone: String(body.customer?.phone || ""),
      company: String(body.customer?.company || ""),
    },
    items: body.items || [],
    resellerEmail: authSession?.email || body.resellerEmail,
    shipping:
      typeof body.shipping?.price === "number" && body.shipping.price > 0
        ? {
            name: String(body.shipping.name || "Shipping"),
            price: body.shipping.price,
          }
        : undefined,
  });

  const session = await createStripeCheckoutSession(params);
  if (!session.ok) {
    return sendJson(res, 500, { message: session.message });
  }

  return sendJson(res, 200, { sessionId: session.id, url: session.url });
}
