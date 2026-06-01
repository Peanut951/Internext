import { parseJsonBody, sendJson } from "./checkout/_shared.js";

type RequestBody = {
  order?: Record<string, unknown>;
};

const readEnv = (key: string) => process.env[key]?.trim() || "";

const formatAud = (value: unknown) =>
  typeof value === "number"
    ? value.toLocaleString("en-AU", { style: "currency", currency: "AUD" })
    : "$0.00";

const getNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

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

  const webhookUrl = readEnv("POWER_AUTOMATE_ORDER_WEBHOOK_URL");
  if (!webhookUrl) {
    return sendJson(res, 500, { message: "Order notification webhook is not configured." });
  }

  const body = parseJsonBody<RequestBody>(req.body);
  if (!body?.order) {
    return sendJson(res, 400, { message: "An order payload is required." });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "paid_order",
        submittedAt: new Date().toISOString(),
        source: "internext-checkout",
        host: req.headers?.host || "",
        userAgent: req.headers?.["user-agent"] || "",
        order: {
          ...body.order,
          emailSummary: buildOrderEmailSummary(body.order),
        },
      }),
    });

    if (!response.ok) {
      return sendJson(res, 502, { message: "Order email workflow did not accept the request." });
    }

    return sendJson(res, 200, { ok: true });
  } catch {
    return sendJson(res, 502, { message: "Unable to reach the order email workflow." });
  }
}
