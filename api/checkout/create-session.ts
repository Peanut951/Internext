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
    address1?: string;
    address2?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
    country?: string;
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

const normalizeTextKey = (value?: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(pty|ltd|limited|proprietary|company|co)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizePhoneKey = (value?: string) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("61") && digits.length === 11) {
    return `0${digits.slice(2)}`;
  }

  return digits;
};

const normalizeAddressKey = (customer?: RequestBody["customer"]) => {
  const address1 = normalizeTextKey(customer?.address1)
    .replace(/\bst\b/g, "street")
    .replace(/\brd\b/g, "road")
    .replace(/\bave\b/g, "avenue")
    .replace(/\bav\b/g, "avenue")
    .replace(/\bdr\b/g, "drive")
    .replace(/\bct\b/g, "court")
    .replace(/\bcct\b/g, "circuit")
    .replace(/\bcr\b/g, "crescent")
    .replace(/\bcres\b/g, "crescent")
    .replace(/\bpde\b/g, "parade")
    .replace(/\bpl\b/g, "place")
    .replace(/\bln\b/g, "lane")
    .replace(/\btce\b/g, "terrace");
  const suburb = normalizeTextKey(customer?.suburb);
  const state = normalizeTextKey(customer?.state).toUpperCase();
  const postcode = String(customer?.postcode || "").replace(/\D/g, "");
  const country = normalizeTextKey(customer?.country || "Australia");

  if (!address1 || !suburb || !postcode) {
    return "";
  }

  return [address1, suburb, state, postcode, country].filter(Boolean).join("|");
};

const getNestedString = (source: unknown, key: string) => {
  if (!source || typeof source !== "object") {
    return "";
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
};

const getOrderCustomer = (orderData: unknown): RequestBody["customer"] => {
  if (!orderData || typeof orderData !== "object") {
    return {};
  }

  const customer = (orderData as Record<string, unknown>).customer;
  if (!customer || typeof customer !== "object") {
    return {};
  }

  return {
    firstName: getNestedString(customer, "firstName"),
    lastName: getNestedString(customer, "lastName"),
    email: getNestedString(customer, "email"),
    phone: getNestedString(customer, "phone"),
    company: getNestedString(customer, "company"),
    address1: getNestedString(customer, "address1"),
    address2: getNestedString(customer, "address2"),
    suburb: getNestedString(customer, "suburb"),
    state: getNestedString(customer, "state"),
    postcode: getNestedString(customer, "postcode"),
    country: getNestedString(customer, "country"),
  };
};

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

const hasExistingAccountOrders = async (input: {
  userId: string;
  email: string;
  customer?: RequestBody["customer"];
}) => {
  const config = getSupabaseOrdersConfig();
  if (!config) {
    return true;
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const submittedCompany = normalizeTextKey(input.customer?.company);
  const submittedPhone = normalizePhoneKey(input.customer?.phone);
  const submittedAddress = normalizeAddressKey(input.customer);
  const directMatchUrl = new URL(`${config.supabaseUrl}/rest/v1/${ORDERS_TABLE}`);
  directMatchUrl.searchParams.set("select", "id");
  directMatchUrl.searchParams.set(
    "or",
    `(reseller_user_id.eq.${input.userId},reseller_email.eq.${normalizedEmail},customer_email.eq.${normalizedEmail})`,
  );
  directMatchUrl.searchParams.set("limit", "1");

  try {
    const directMatchResponse = await fetch(directMatchUrl, {
      method: "GET",
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        Accept: "application/json",
      },
    });

    if (!directMatchResponse.ok) {
      return true;
    }

    const directRows = (await directMatchResponse.json()) as Array<unknown>;
    if (directRows.length > 0) {
      return true;
    }

    if (!submittedCompany && !submittedPhone && !submittedAddress) {
      return false;
    }

    const pageSize = 1000;
    for (let offset = 0; offset < 10000; offset += pageSize) {
      const url = new URL(`${config.supabaseUrl}/rest/v1/${ORDERS_TABLE}`);
      url.searchParams.set("select", "order_data");
      url.searchParams.set("order", "created_at.desc");
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(offset));

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

      const rows = (await response.json()) as Array<{ order_data?: unknown }>;
      if (rows.length === 0) {
        return false;
      }

      const hasIdentityMatch = rows.some((row) => {
        const existingCustomer = getOrderCustomer(row.order_data);
        const existingCompany = normalizeTextKey(existingCustomer.company);
        const existingPhone = normalizePhoneKey(existingCustomer.phone);
        const existingAddress = normalizeAddressKey(existingCustomer);

        return (
          Boolean(submittedCompany && existingCompany && submittedCompany === existingCompany) ||
          Boolean(submittedPhone && existingPhone && submittedPhone === existingPhone) ||
          Boolean(submittedAddress && existingAddress && submittedAddress === existingAddress)
        );
      });

      if (hasIdentityMatch) {
        return true;
      }

      if (rows.length < pageSize) {
        return false;
      }
    }

    return true;
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
      customer: body.customer,
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
      address1: String(body.customer?.address1 || ""),
      address2: String(body.customer?.address2 || ""),
      suburb: String(body.customer?.suburb || ""),
      state: String(body.customer?.state || ""),
      postcode: String(body.customer?.postcode || ""),
      country: String(body.customer?.country || ""),
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
