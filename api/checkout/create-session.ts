import {
  buildStripeCheckoutParams,
  createStripeCheckoutSession,
  getRequestOrigin,
  isValidCheckoutOrigin,
  parseJsonBody,
  readEnv,
  sendJson,
  validateCheckoutPayload,
} from "./_shared.js";
import { getSessionFromRequest } from "../auth/_shared.js";

const MIN_SHIPPING_TOTAL = 15;
const FIRST_ORDER_DISCOUNT_RATE = 0.1;
const FIRST_ORDER_DISCOUNT_NAME = "First order account discount";
const ORDERS_TABLE = "orders";

type RequestBody = {
  origin?: string;
  orderNumber?: string;
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

const normalizeMoney = (value: number) => Math.round(value * 100) / 100;

const getSupabaseOrdersConfig = () => {
  const supabaseUrl = readEnv("SUPABASE_URL") || readEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = readEnv("SUPABASE_SERVICE_ROLE_KEY") || readEnv("SERVICE_ROLE_SECRET_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ""),
    serviceRoleKey,
  };
};

const hasExistingAccountOrders = async (input: { userId: string; email: string }) => {
  const config = getSupabaseOrdersConfig();
  if (!config) {
    return true;
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const url = new URL(`${config.supabaseUrl}/rest/v1/${ORDERS_TABLE}`);
  url.searchParams.set("select", "id");
  url.searchParams.set(
    "or",
    `(reseller_user_id.eq.${input.userId},reseller_email.eq.${normalizedEmail},customer_email.eq.${normalizedEmail})`,
  );
  url.searchParams.set("limit", "1");

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return true;
    }

    const rows = (await response.json()) as Array<unknown>;
    return rows.length > 0;
  } catch {
    return true;
  }
};

const calculateFirstOrderDiscountAmount = (items: NonNullable<RequestBody["items"]>) =>
  normalizeMoney(
    items.reduce((total, item) => {
      if (typeof item.price !== "number") {
        return total;
      }

      const discountedUnit = normalizeMoney(item.price * (1 - FIRST_ORDER_DISCOUNT_RATE));
      return total + (item.price - discountedUnit) * item.qty;
    }, 0),
  );

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

  const normalizedCustomerEmail = String(body.customer?.email || "").trim().toLowerCase();
  const firstOrderDiscountApplies =
    Boolean(authSession) &&
    authSession?.role === "user" &&
    authSession.email.trim().toLowerCase() === normalizedCustomerEmail &&
    !(await hasExistingAccountOrders({
      userId: authSession.userId,
      email: authSession.email,
    }));
  const firstOrderDiscountAmount = firstOrderDiscountApplies
    ? calculateFirstOrderDiscountAmount(body.items || [])
    : 0;

  const params = buildStripeCheckoutParams({
    origin,
    orderNumber: String(body.orderNumber || ""),
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
            price: Math.max(body.shipping.price, MIN_SHIPPING_TOTAL),
          }
        : undefined,
    discount:
      firstOrderDiscountApplies && firstOrderDiscountAmount > 0
        ? {
            name: FIRST_ORDER_DISCOUNT_NAME,
            rate: FIRST_ORDER_DISCOUNT_RATE,
          }
        : undefined,
  });

  const session = await createStripeCheckoutSession(params);
  if (!session.ok) {
    return sendJson(res, 500, { message: session.message });
  }

  return sendJson(res, 200, {
    sessionId: session.id,
    url: session.url,
    firstOrderDiscount: {
      applied: firstOrderDiscountApplies && firstOrderDiscountAmount > 0,
      name: FIRST_ORDER_DISCOUNT_NAME,
      rate: FIRST_ORDER_DISCOUNT_RATE,
      amount: firstOrderDiscountAmount,
    },
  });
}
