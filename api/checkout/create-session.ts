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
    stockQuantity?: number;
  }>;
  shipping?: {
    name?: string;
    price?: number;
  };
};

const validateSubmittedStock = (items: NonNullable<RequestBody["items"]>) => {
  const unavailable: string[] = [];
  const insufficient: string[] = [];

  items.forEach((item) => {
    if (typeof item.stockQuantity !== "number") {
      return;
    }

    if (item.stockQuantity <= 0) {
      unavailable.push(item.code);
      return;
    }

    if (item.qty > item.stockQuantity) {
      insufficient.push(`${item.code} has ${item.stockQuantity} available`);
    }
  });

  if (unavailable.length > 0) {
    return `Remove out-of-stock item(s) before payment: ${unavailable.join(", ")}.`;
  }

  if (insufficient.length > 0) {
    return `Reduce quantity before payment: ${insufficient.join(", ")}.`;
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

  const stockError = validateSubmittedStock(body.items || []);
  if (stockError) {
    return sendJson(res, 400, { message: stockError });
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
