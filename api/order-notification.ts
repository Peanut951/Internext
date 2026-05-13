import { parseJsonBody, sendJson } from "./checkout/_shared.js";

type RequestBody = {
  order?: Record<string, unknown>;
};

const readEnv = (key: string) => process.env[key]?.trim() || "";

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
        order: body.order,
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
