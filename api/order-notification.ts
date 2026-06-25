import { parseJsonBody, sendJson } from "./checkout/_shared.js";
import { getSessionFromRequest } from "./auth/_shared.js";

type RequestBody = {
  order?: Record<string, unknown>;
  notificationType?: "paid_order" | "shipment" | "store_order";
};

const readEnv = (key: string) => process.env[key]?.trim() || "";
const WEBHOOK_TIMEOUT_MS = 20000;
const ORDERS_TABLE = "orders";
const MARKETING_CONTACTS_TABLE = "marketing_contacts";

const formatAud = (value: unknown) =>
  typeof value === "number"
    ? value.toLocaleString("en-AU", { style: "currency", currency: "AUD" })
    : "$0.00";

const getNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const getString = (value: unknown) => (typeof value === "string" ? value : "");

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

const getOrderField = (order: Record<string, unknown>, key: string) => {
  const value = order[key];
  return typeof value === "string" ? value.trim() : "";
};

const getNestedString = (source: unknown, key: string) => {
  if (!source || typeof source !== "object") {
    return "";
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
};

const getNestedBoolean = (source: unknown, key: string) => {
  if (!source || typeof source !== "object") {
    return false;
  }

  return (source as Record<string, unknown>)[key] === true;
};

const normalizeMarketingRole = (value: string) => {
  const role = value.trim().toLowerCase();
  if (role === "reseller") {
    return "reseller";
  }
  if (role === "guest") {
    return "guest";
  }
  return "user";
};

const upsertSharedOrder = async (order: Record<string, unknown>) => {
  const config = getSupabaseOrdersConfig();
  if (!config) {
    return {
      ok: false,
      status: 0,
      message: "Supabase order storage is not configured.",
    };
  }

  const id = getOrderField(order, "id") || getOrderField(order, "orderNumber");
  if (!id) {
    return {
      ok: false,
      status: 400,
      message: "Order id is required.",
    };
  }

  const reseller = order.reseller && typeof order.reseller === "object" ? order.reseller : {};
  const customer = order.customer && typeof order.customer === "object" ? order.customer : {};
  const createdAt = getOrderField(order, "createdAt") || new Date().toISOString();
  const updatedAt = getOrderField(order, "updatedAt") || new Date().toISOString();

  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/${ORDERS_TABLE}?on_conflict=id`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        id,
        order_number: getOrderField(order, "orderNumber"),
        reseller_email: getNestedString(reseller, "email").toLowerCase(),
        reseller_user_id: getNestedString(reseller, "userId"),
        customer_email: getNestedString(customer, "email").toLowerCase(),
        fulfillment_status: getOrderField(order, "fulfillmentStatus"),
        supplier_status: getOrderField(order, "supplierStatus"),
        order_data: order,
        created_at: createdAt,
        updated_at: updatedAt,
      }),
    },
  );

  return {
    ok: response.ok,
    status: response.status,
    message: response.ok
      ? "Order saved to shared storage."
      : `Supabase order storage returned HTTP ${response.status}.`,
  };
};

const upsertMarketingContactFromOrder = async (order: Record<string, unknown>) => {
  const config = getSupabaseOrdersConfig();
  if (!config) {
    return {
      ok: false,
      status: 0,
      message: "Supabase marketing contact storage is not configured.",
    };
  }

  const customer = order.customer && typeof order.customer === "object" ? order.customer : {};
  const reseller = order.reseller && typeof order.reseller === "object" ? order.reseller : {};
  const email = getNestedString(customer, "email").toLowerCase();
  if (!email) {
    return {
      ok: false,
      status: 400,
      message: "Customer email is required for marketing contact storage.",
    };
  }

  const now = new Date().toISOString();
  const createdAt = getOrderField(order, "createdAt") || now;
  const role = normalizeMarketingRole(getNestedString(reseller, "role"));
  const marketingConsent = getNestedBoolean(customer, "marketingOptIn");

  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/${MARKETING_CONTACTS_TABLE}?on_conflict=email`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        email,
        role,
        first_name: getNestedString(customer, "firstName"),
        last_name: getNestedString(customer, "lastName"),
        company: getNestedString(customer, "company"),
        phone: getNestedString(customer, "phone"),
        marketing_consent: marketingConsent,
        source: role === "guest" ? "guest_checkout" : "checkout",
        last_order_number: getOrderField(order, "orderNumber"),
        last_order_at: createdAt,
        updated_at: now,
      }),
    },
  );

  return {
    ok: response.ok,
    status: response.status,
    message: response.ok
      ? "Marketing contact saved."
      : `Supabase marketing contact storage returned HTTP ${response.status}.`,
  };
};

const fetchSharedOrders = async (req: { headers?: { cookie?: string } }) => {
  const session = getSessionFromRequest(req);
  if (!session) {
    return {
      status: 401,
      body: { message: "Sign in is required to view orders." },
    };
  }

  const config = getSupabaseOrdersConfig();
  if (!config) {
    return {
      status: 500,
      body: { message: "Supabase order storage is not configured." },
    };
  }

  const url = new URL(`${config.supabaseUrl}/rest/v1/${ORDERS_TABLE}`);
  url.searchParams.set("select", "order_data");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "1000");

  if (session.role !== "admin") {
    const normalizedEmail = session.email.trim().toLowerCase();
    url.searchParams.set(
      "or",
      `(reseller_user_id.eq.${session.userId},reseller_email.eq.${normalizedEmail},customer_email.eq.${normalizedEmail})`,
    );
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return {
      status: response.status,
      body: { message: `Supabase order storage returned HTTP ${response.status}.` },
    };
  }

  const rows = (await response.json()) as Array<{ order_data?: unknown }>;
  return {
    status: 200,
    body: {
      orders: rows
        .map((row) => row.order_data)
        .filter((order): order is Record<string, unknown> => Boolean(order && typeof order === "object")),
    },
  };
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatOrderDate = (value: unknown) => {
  const date = new Date(getString(value));
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const buildOrderEmailSummary = (order: Record<string, unknown>) => {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsSubtotal = getNumber(order.itemsSubtotal ?? order.subtotal);
  const gstAmount = getNumber(order.gstAmount);
  const shippingTotal = getNumber(order.shippingTotal);
  const totalKnownValue = getNumber(order.totalKnownValue) || itemsSubtotal + gstAmount + shippingTotal;

  return {
    orderNumber: order.orderNumber || "",
    itemsSubtotal,
    itemsSubtotalText: formatAud(itemsSubtotal),
    gstAmount,
    gstAmountText: formatAud(gstAmount),
    shippingTotal,
    shippingTotalText: formatAud(shippingTotal),
    totalKnownValue,
    totalKnownValueText: formatAud(totalKnownValue),
    lineCount: items.length,
    lines: items.map((item) => {
      const line = item && typeof item === "object" ? item as Record<string, unknown> : {};
      const quantity = getNumber(line.qty);
      const unitPrice = typeof line.price === "number" ? line.price : null;
      const lineTotal = unitPrice === null ? null : unitPrice * quantity;

      return {
        code: line.code || "",
        description: line.description || "",
        quantity,
        unitPrice,
        unitPriceText: unitPrice === null ? "POA" : formatAud(unitPrice),
        lineTotal,
        lineTotalText: lineTotal === null ? "POA" : formatAud(lineTotal),
        priceBasis: /\bex\s*gst\b/i.test(String(line.priceText || "")) ? "Ex GST" : "Inc GST",
      };
    }),
  };
};

const buildCustomerConfirmationEmail = (order: Record<string, unknown>) => {
  const summary = buildOrderEmailSummary(order);
  const customer = order.customer && typeof order.customer === "object"
    ? order.customer as Record<string, unknown>
    : {};
  const orderNumber = getString(order.orderNumber) || "your order";
  const customerName = [customer.firstName, customer.lastName]
    .map(getString)
    .filter(Boolean)
    .join(" ")
    .trim() || "there";
  const customerEmail = getString(customer.email).trim();
  const shippingAddress = [
    customer.address1,
    customer.address2,
    [customer.suburb, customer.state, customer.postcode].map(getString).filter(Boolean).join(" "),
    customer.country,
  ]
    .map(getString)
    .map((part) => part.trim())
    .filter(Boolean);

  const itemRows = summary.lines
    .map((line) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e5e7eb;">
          <div style="font-weight:700;color:#111827;">${escapeHtml(line.description)}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:4px;">Code: ${escapeHtml(line.code)}</div>
        </td>
        <td align="center" style="padding:14px 10px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(line.quantity)}</td>
        <td align="right" style="padding:14px 10px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(line.unitPriceText)} ${escapeHtml(line.priceBasis)}</td>
        <td align="right" style="padding:14px 0;border-bottom:1px solid #e5e7eb;font-weight:700;color:#111827;">${escapeHtml(line.lineTotalText)}</td>
      </tr>`)
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:720px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#1f2937;padding:28px 32px;">
                <div style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#7dd3fc;font-weight:700;">Internext</div>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">Order confirmation</h1>
                <p style="margin:10px 0 0;color:#d1d5db;font-size:15px;">Thanks ${escapeHtml(customerName)}, we have received your order.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                  <tr>
                    <td style="padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
                      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;font-weight:700;">Order number</div>
                      <div style="margin-top:6px;font-size:18px;font-weight:800;color:#111827;">${escapeHtml(orderNumber)}</div>
                    </td>
                    <td width="16"></td>
                    <td style="padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
                      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;font-weight:700;">Order date</div>
                      <div style="margin-top:6px;font-size:18px;font-weight:800;color:#111827;">${escapeHtml(formatOrderDate(order.createdAt))}</div>
                    </td>
                  </tr>
                </table>

                <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Items ordered</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                  <thead>
                    <tr>
                      <th align="left" style="padding:0 0 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Item</th>
                      <th align="center" style="padding:0 10px 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Qty</th>
                      <th align="right" style="padding:0 10px 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Unit price</th>
                      <th align="right" style="padding:0 0 10px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Line total</th>
                    </tr>
                  </thead>
                  <tbody>${itemRows}</tbody>
                </table>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;">
                  <tr>
                    <td style="vertical-align:top;padding-right:20px;">
                      <h2 style="margin:0 0 10px;font-size:18px;color:#111827;">Delivery details</h2>
                      <p style="margin:0;color:#4b5563;line-height:1.6;">
                        ${shippingAddress.map(escapeHtml).join("<br>")}
                      </p>
                    </td>
                    <td width="260" style="vertical-align:top;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px;">
                        <tr>
                          <td style="padding:6px 0;color:#4b5563;">Items subtotal</td>
                          <td align="right" style="padding:6px 0;color:#111827;font-weight:700;">${escapeHtml(summary.itemsSubtotalText)}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;color:#4b5563;">GST</td>
                          <td align="right" style="padding:6px 0;color:#111827;font-weight:700;">${escapeHtml(summary.gstAmountText)}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;color:#4b5563;">Shipping</td>
                          <td align="right" style="padding:6px 0;color:#111827;font-weight:700;">${escapeHtml(summary.shippingTotalText)}</td>
                        </tr>
                        <tr>
                          <td style="padding:12px 0 4px;border-top:1px solid #e5e7eb;color:#111827;font-weight:800;">Total paid</td>
                          <td align="right" style="padding:12px 0 4px;border-top:1px solid #e5e7eb;color:#111827;font-size:18px;font-weight:900;">${escapeHtml(summary.totalKnownValueText)}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <p style="margin:26px 0 0;color:#4b5563;line-height:1.6;">
                  We will email you again when your order status changes or tracking details are available.
                  For questions, call 1300 567 835.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Internext order confirmation`,
    `Order: ${orderNumber}`,
    `Date: ${formatOrderDate(order.createdAt)}`,
    ``,
    `Hi ${customerName}, we have received your order.`,
    ``,
    ...summary.lines.map((line) =>
      `${line.quantity} x ${line.description} (${line.code}) - ${line.lineTotalText}`,
    ),
    ``,
    `Items subtotal: ${summary.itemsSubtotalText}`,
    `GST: ${summary.gstAmountText}`,
    `Shipping: ${summary.shippingTotalText}`,
    `Total paid: ${summary.totalKnownValueText}`,
    ``,
    `Delivery address:`,
    ...shippingAddress,
    ``,
    `For questions, call 1300 567 835.`,
  ].join("\n");

  return {
    to: customerEmail,
    subject: `Internext order confirmation ${orderNumber}`,
    html,
    text,
  };
};

const buildCustomerShipmentEmail = (order: Record<string, unknown>) => {
  const customer = order.customer && typeof order.customer === "object"
    ? order.customer as Record<string, unknown>
    : {};
  const orderNumber = getString(order.orderNumber) || "your order";
  const customerName = [customer.firstName, customer.lastName]
    .map(getString)
    .filter(Boolean)
    .join(" ")
    .trim() || "there";
  const customerEmail = getString(customer.email).trim();
  const carrier = getString(order.trackingCarrier).trim();
  const trackingNumber = getString(order.trackingNumber).trim();
  const trackingUrl = getString(order.trackingUrl).trim();
  const items = Array.isArray(order.items) ? order.items : [];

  const itemRows = items
    .map((item) => {
      const line = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:700;">${escapeHtml(line.description)}</td>
          <td align="right" style="padding:12px 0;border-bottom:1px solid #e5e7eb;color:#4b5563;">Qty ${escapeHtml(line.qty)}</td>
        </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html>
  <body style="margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
            <tr>
              <td style="background:#1f2937;padding:28px 32px;">
                <div style="font-size:13px;letter-spacing:0.16em;text-transform:uppercase;color:#7dd3fc;font-weight:700;">Internext</div>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">Your order has shipped</h1>
                <p style="margin:10px 0 0;color:#d1d5db;font-size:15px;">Hi ${escapeHtml(customerName)}, your Internext order is now on its way.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;">
                  <tr>
                    <td style="padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
                      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;font-weight:700;">Order number</div>
                      <div style="margin-top:6px;font-size:18px;font-weight:800;color:#111827;">${escapeHtml(orderNumber)}</div>
                    </td>
                    <td width="16"></td>
                    <td style="padding:12px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;">
                      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#6b7280;font-weight:700;">Shipped</div>
                      <div style="margin-top:6px;font-size:18px;font-weight:800;color:#111827;">${escapeHtml(formatOrderDate(new Date().toISOString()))}</div>
                    </td>
                  </tr>
                </table>

                <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Tracking details</h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:14px;margin-bottom:24px;">
                  <tr>
                    <td style="padding:8px 0;color:#4b5563;">Carrier</td>
                    <td align="right" style="padding:8px 0;color:#111827;font-weight:700;">${escapeHtml(carrier)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#4b5563;">Tracking number</td>
                    <td align="right" style="padding:8px 0;color:#111827;font-weight:700;">${escapeHtml(trackingNumber)}</td>
                  </tr>
                </table>

                <p style="margin:0 0 22px;color:#4b5563;line-height:1.6;">
                  You can use the tracking link below to follow the delivery progress with ${escapeHtml(carrier)}.
                </p>
                <p style="margin:0 0 26px;">
                  <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#1f2937;color:#ffffff;text-decoration:none;border-radius:10px;padding:13px 18px;font-weight:700;">Track your order</a>
                </p>

                ${itemRows ? `
                  <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">Items in this shipment</h2>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                    <tbody>${itemRows}</tbody>
                  </table>` : ""}

                <p style="margin:26px 0 0;color:#4b5563;line-height:1.6;">
                  For delivery questions, call 1300 567 835.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "Your Internext order has shipped",
    `Order: ${orderNumber}`,
    `Carrier: ${carrier}`,
    `Tracking number: ${trackingNumber}`,
    `Tracking link: ${trackingUrl}`,
    "",
    "Items:",
    ...items.map((item) => {
      const line = item && typeof item === "object" ? item as Record<string, unknown> : {};
      return `- ${getString(line.description)} x ${line.qty ?? ""}`;
    }),
    "",
    "For delivery questions, call 1300 567 835.",
  ].join("\n");

  return {
    to: customerEmail,
    subject: `Your Internext order has shipped - ${orderNumber}`,
    html,
    text,
  };
};

const postJsonWebhook = async (url: string, payload: unknown) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    return {
      ok: response.ok,
      status: response.status,
      message: response.ok
        ? "Workflow accepted the request."
        : `Workflow returned HTTP ${response.status}.`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message:
        error instanceof Error && error.name === "AbortError"
          ? `Workflow did not respond within ${WEBHOOK_TIMEOUT_MS / 1000} seconds.`
          : error instanceof Error
            ? error.message
            : "Unable to reach workflow.",
    };
  } finally {
    clearTimeout(timeout);
  }
};

export default async function handler(
  req: {
    method?: string;
    body?: string | RequestBody;
    headers?: { cookie?: string; host?: string; "user-agent"?: string };
  },
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
) {
  if (req.method === "GET") {
    const result = await fetchSharedOrders(req);
    return sendJson(res, result.status, result.body);
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method not allowed." });
  }

  const body = parseJsonBody<RequestBody>(req.body);
  if (!body?.order) {
    return sendJson(res, 400, { message: "An order payload is required." });
  }

  const adminWebhookUrl = readEnv("POWER_AUTOMATE_ORDER_WEBHOOK_URL");
  const customerWebhookUrl = readEnv("POWER_AUTOMATE_CUSTOMER_ORDER_WEBHOOK_URL");

  if (body.notificationType === "store_order") {
    const session = getSessionFromRequest(req);
    if (session?.role !== "admin") {
      return sendJson(res, 403, { message: "Admin access is required to update shared orders." });
    }

    const [storageResponse, marketingContactResponse] = await Promise.all([
      upsertSharedOrder(body.order),
      upsertMarketingContactFromOrder(body.order),
    ]);
    return sendJson(res, storageResponse.ok ? 200 : 502, {
      ok: storageResponse.ok,
      sharedOrderSaved: storageResponse.ok,
      sharedOrderStatus: storageResponse.status,
      sharedOrderMessage: storageResponse.message,
      marketingContactSaved: marketingContactResponse.ok,
      marketingContactStatus: marketingContactResponse.status,
      marketingContactMessage: marketingContactResponse.message,
    });
  }

  if (body.notificationType === "shipment") {
    const session = getSessionFromRequest(req);
    if (session?.role !== "admin") {
      return sendJson(res, 403, { message: "Admin access is required to send shipment emails." });
    }

    if (!customerWebhookUrl) {
      return sendJson(res, 500, { message: "Customer order email webhook is not configured." });
    }

    const customerEmail = buildCustomerShipmentEmail(body.order);
    if (!customerEmail.to) {
      return sendJson(res, 400, { message: "Customer email address was not provided." });
    }

    const [storageResponse, marketingContactResponse, customerResponse] = await Promise.all([
      upsertSharedOrder(body.order),
      upsertMarketingContactFromOrder(body.order),
      postJsonWebhook(customerWebhookUrl, {
      type: "customer_order_shipped",
      submittedAt: new Date().toISOString(),
      source: "internext-admin",
      host: req.headers?.host || "",
      userAgent: req.headers?.["user-agent"] || "",
      orderNumber: body.order.orderNumber || "",
      to: customerEmail.to,
      subject: customerEmail.subject,
      html: customerEmail.html,
      text: customerEmail.text,
      customerEmail,
      order: body.order,
      }),
    ]);

    return sendJson(res, customerResponse.ok ? 200 : 502, {
      ok: customerResponse.ok,
      customerEmailSent: customerResponse.ok,
      customerEmailStatus: customerResponse.status,
      customerEmailTo: customerEmail.to,
      sharedOrderSaved: storageResponse.ok,
      sharedOrderStatus: storageResponse.status,
      sharedOrderMessage: storageResponse.message,
      marketingContactSaved: marketingContactResponse.ok,
      marketingContactStatus: marketingContactResponse.status,
      marketingContactMessage: marketingContactResponse.message,
      customerEmailMessage: customerResponse.ok
        ? "Customer shipment workflow accepted the request."
        : `Customer shipment workflow failed: ${customerResponse.message}`,
    });
  }

  if (!adminWebhookUrl && !customerWebhookUrl) {
    return sendJson(res, 500, { message: "Order notification webhooks are not configured." });
  }

  try {
    const [storageResponse, marketingContactResponse] = await Promise.all([
      upsertSharedOrder(body.order),
      upsertMarketingContactFromOrder(body.order),
    ]);
    const emailSummary = buildOrderEmailSummary(body.order);
    const customerEmail = buildCustomerConfirmationEmail(body.order);
    const adminPayload = {
      type: "paid_order",
      submittedAt: new Date().toISOString(),
      source: "internext-checkout",
      host: req.headers?.host || "",
      userAgent: req.headers?.["user-agent"] || "",
      order: {
        ...body.order,
        emailSummary,
      },
    };
    const customerPayload = {
      type: "customer_order_confirmation",
      submittedAt: new Date().toISOString(),
      source: "internext-checkout",
      orderNumber: emailSummary.orderNumber,
      to: customerEmail.to,
      subject: customerEmail.subject,
      html: customerEmail.html,
      text: customerEmail.text,
      customerEmail,
    };

    const [adminResponse, customerResponse] = await Promise.all([
      adminWebhookUrl
        ? postJsonWebhook(adminWebhookUrl, adminPayload)
        : Promise.resolve({
            ok: false,
            status: 0,
            message: "Admin order email webhook is not configured.",
          }),
      customerWebhookUrl && customerEmail.to
        ? postJsonWebhook(customerWebhookUrl, customerPayload)
        : Promise.resolve({
            ok: false,
            status: 0,
            message: !customerWebhookUrl
              ? "Customer order email webhook is not configured."
              : "Customer email address was not provided.",
          }),
    ]);

    return sendJson(res, 200, {
      ok: true,
      adminEmailSent: adminResponse.ok,
      adminEmailStatus: adminResponse.status,
      adminEmailMessage: adminResponse.ok
        ? "Admin order email workflow accepted the request."
        : `Admin order email workflow failed: ${adminResponse.message}`,
      customerEmailSent: customerResponse.ok,
      customerEmailStatus: customerResponse.status,
      customerEmailTo: customerEmail.to,
      sharedOrderSaved: storageResponse.ok,
      sharedOrderStatus: storageResponse.status,
      sharedOrderMessage: storageResponse.message,
      marketingContactSaved: marketingContactResponse.ok,
      marketingContactStatus: marketingContactResponse.status,
      marketingContactMessage: marketingContactResponse.message,
      customerEmailMessage: customerResponse.ok
        ? "Customer confirmation workflow accepted the request."
        : `Customer confirmation workflow failed: ${customerResponse.message}`,
    });
  } catch {
    return sendJson(res, 502, { message: "Unable to reach the order email workflow." });
  }
}
