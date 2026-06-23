import { parseJsonBody, sendJson } from "./checkout/_shared.js";

type RequestBody = {
  order?: Record<string, unknown>;
};

const readEnv = (key: string) => process.env[key]?.trim() || "";
const WEBHOOK_TIMEOUT_MS = 20000;

const formatAud = (value: unknown) =>
  typeof value === "number"
    ? value.toLocaleString("en-AU", { style: "currency", currency: "AUD" })
    : "$0.00";

const getNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const getString = (value: unknown) => (typeof value === "string" ? value : "");

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
    headers?: { host?: string; "user-agent"?: string };
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

  const adminWebhookUrl = readEnv("POWER_AUTOMATE_ORDER_WEBHOOK_URL");
  const customerWebhookUrl = readEnv("POWER_AUTOMATE_CUSTOMER_ORDER_WEBHOOK_URL");
  if (!adminWebhookUrl && !customerWebhookUrl) {
    return sendJson(res, 500, { message: "Order notification webhooks are not configured." });
  }

  const body = parseJsonBody<RequestBody>(req.body);
  if (!body?.order) {
    return sendJson(res, 400, { message: "An order payload is required." });
  }

  try {
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
      customerEmailMessage: customerResponse.ok
        ? "Customer confirmation workflow accepted the request."
        : `Customer confirmation workflow failed: ${customerResponse.message}`,
    });
  } catch {
    return sendJson(res, 502, { message: "Unable to reach the order email workflow." });
  }
}
