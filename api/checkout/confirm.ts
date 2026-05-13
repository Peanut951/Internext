import { parseJsonBody, retrieveStripeCheckoutSession, sendJson } from "./_shared.js";

type RequestBody = {
  sessionId?: string;
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
  const sessionId = String(body?.sessionId || "").trim();

  if (!sessionId) {
    return sendJson(res, 400, { message: "Stripe session ID is required." });
  }

  const stripeSession = await retrieveStripeCheckoutSession(sessionId);
  if (!stripeSession.ok) {
    return sendJson(res, 400, { message: stripeSession.message });
  }

  return sendJson(res, 200, {
    sessionId: stripeSession.session.id,
    paymentStatus: stripeSession.session.paymentStatus,
    status: stripeSession.session.status,
    amountTotal: stripeSession.session.amountTotal,
    currency: stripeSession.session.currency,
    customerEmail: stripeSession.session.customerEmail,
  });
}
