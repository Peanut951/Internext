import {
  buildStripeCheckoutParams,
  createStripeCheckoutSession,
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
  };
  items?: Array<{
    code: string;
    description: string;
    manufacturer: string;
    qty: number;
    price: number | null;
  }>;
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
  if (!body) {
    return sendJson(res, 400, { message: "Invalid request body." });
  }

  const origin = String(body.origin || "").trim();
  if (!origin) {
    return sendJson(res, 400, { message: "A checkout origin is required." });
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
    },
    items: body.items || [],
    resellerEmail: body.resellerEmail,
  });

  const session = await createStripeCheckoutSession(params);
  if (!session.ok) {
    return sendJson(res, 500, { message: session.message });
  }

  return sendJson(res, 200, { url: session.url });
}
