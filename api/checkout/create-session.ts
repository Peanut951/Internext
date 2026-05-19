import {
  buildStripeCheckoutParams,
  createStripeCheckoutSession,
  getRequestOrigin,
  isValidCheckoutOrigin,
  parseJsonBody,
  sendJson,
  validateCheckoutPayload,
} from "./_shared.js";

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
  }>;
  shipping?: {
    name?: string;
    price?: number;
  };
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
    resellerEmail: body.resellerEmail,
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
