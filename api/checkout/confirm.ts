import { parseJsonBody, retrieveStripeCheckoutSession, sendJson } from "./_shared.js";

type RequestBody = {
  sessionId?: string;
};

const readEnv = (key: string) => process.env[key]?.trim() || "";
const ORDERS_TABLE = "orders";

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

const markStoredInvoicePaid = async (
  orderId: string,
  stripeSession: {
    id: string;
    amountTotal: number;
    currency: string;
    customerEmail: string;
  },
) => {
  const config = getSupabaseOrdersConfig();
  if (!config) {
    return {
      ok: false,
      status: 0,
      message: "Supabase order storage is not configured.",
    };
  }

  const orderUrl = new URL(`${config.supabaseUrl}/rest/v1/${ORDERS_TABLE}`);
  orderUrl.searchParams.set("id", `eq.${orderId}`);
  orderUrl.searchParams.set("select", "order_data");
  orderUrl.searchParams.set("limit", "1");

  const orderResponse = await fetch(orderUrl, {
    method: "GET",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept: "application/json",
    },
  });

  if (!orderResponse.ok) {
    return {
      ok: false,
      status: orderResponse.status,
      message: `Supabase order lookup returned HTTP ${orderResponse.status}.`,
    };
  }

  const rows = (await orderResponse.json()) as Array<{ order_data?: Record<string, unknown> }>;
  const order = rows[0]?.order_data;
  if (!order || typeof order !== "object") {
    return {
      ok: false,
      status: 404,
      message: "Stored invoice was not found.",
    };
  }

  const now = new Date().toISOString();
  const paidOrder = {
    ...order,
    paymentStatus: "paid",
    paidAt: now,
    updatedAt: now,
    stripeCheckoutSessionId: stripeSession.id,
    stripePaymentStatus: "paid",
    stripeAmountTotal: stripeSession.amountTotal,
    stripeCurrency: stripeSession.currency,
    stripeCustomerEmail: stripeSession.customerEmail,
  };

  const reseller = paidOrder.reseller && typeof paidOrder.reseller === "object" ? paidOrder.reseller : {};
  const customer = paidOrder.customer && typeof paidOrder.customer === "object" ? paidOrder.customer : {};
  const getNestedString = (source: Record<string, unknown>, key: string) => {
    const value = source[key];
    return typeof value === "string" ? value.trim() : "";
  };

  const updateResponse = await fetch(`${config.supabaseUrl}/rest/v1/${ORDERS_TABLE}?id=eq.${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      reseller_email: getNestedString(reseller as Record<string, unknown>, "email").toLowerCase(),
      reseller_user_id: getNestedString(reseller as Record<string, unknown>, "userId"),
      customer_email: getNestedString(customer as Record<string, unknown>, "email").toLowerCase(),
      fulfillment_status: typeof paidOrder.fulfillmentStatus === "string" ? paidOrder.fulfillmentStatus : "",
      supplier_status: typeof paidOrder.supplierStatus === "string" ? paidOrder.supplierStatus : "",
      order_data: paidOrder,
      updated_at: now,
    }),
  });

  return {
    ok: updateResponse.ok,
    status: updateResponse.status,
    message: updateResponse.ok
      ? "Stored invoice marked as paid."
      : `Supabase order update returned HTTP ${updateResponse.status}.`,
    orderNumber: typeof paidOrder.orderNumber === "string" ? paidOrder.orderNumber : "",
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

  const body = parseJsonBody<RequestBody>(req.body);
  const sessionId = String(body?.sessionId || "").trim();

  if (!sessionId) {
    return sendJson(res, 400, { message: "Stripe session ID is required." });
  }

  const stripeSession = await retrieveStripeCheckoutSession(sessionId);
  if (!stripeSession.ok) {
    return sendJson(res, 400, { message: stripeSession.message });
  }

  const invoiceOrderId = stripeSession.session.metadata.invoice_order_id || "";
  const isAdminInvoice = stripeSession.session.metadata.internext_payment_type === "admin_invoice";
  const invoiceUpdate =
    isAdminInvoice && invoiceOrderId
      ? await markStoredInvoicePaid(invoiceOrderId, {
          id: stripeSession.session.id,
          amountTotal: stripeSession.session.amountTotal,
          currency: stripeSession.session.currency,
          customerEmail: stripeSession.session.customerEmail,
        })
      : null;

  if (invoiceUpdate && !invoiceUpdate.ok) {
    return sendJson(res, invoiceUpdate.status || 502, {
      message: invoiceUpdate.message,
      invoicePayment: true,
      invoiceMarkedPaid: false,
    });
  }

  return sendJson(res, 200, {
    sessionId: stripeSession.session.id,
    paymentStatus: stripeSession.session.paymentStatus,
    status: stripeSession.session.status,
    amountTotal: stripeSession.session.amountTotal,
    currency: stripeSession.session.currency,
    customerEmail: stripeSession.session.customerEmail,
    invoicePayment: Boolean(invoiceUpdate),
    invoiceMarkedPaid: invoiceUpdate?.ok ?? false,
    orderNumber: invoiceUpdate?.orderNumber || stripeSession.session.metadata.order_number || "",
  });
}
