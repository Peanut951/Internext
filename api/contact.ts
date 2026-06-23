import { parseJsonBody, sendJson } from "./checkout/_shared.js";

type ContactPayload = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  enquiryType?: string;
  message?: string;
};

const normalizeField = (value: unknown) => String(value || "").trim();

const requiredFields = ["name", "email", "enquiryType", "message"] as const;

const readEnv = (key: string) => process.env[key]?.trim() || "";
const WEBHOOK_TIMEOUT_MS = 20000;

export default async function handler(
  req: {
    method?: string;
    body?: string | ContactPayload;
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

  const body = parseJsonBody<ContactPayload>(req.body);
  const contact = {
    name: normalizeField(body?.name),
    email: normalizeField(body?.email).toLowerCase(),
    phone: normalizeField(body?.phone),
    company: normalizeField(body?.company),
    enquiryType: normalizeField(body?.enquiryType),
    message: normalizeField(body?.message),
  };

  const missingField = requiredFields.find((field) => !contact[field]);
  if (missingField) {
    return sendJson(res, 400, { message: `Missing required field: ${missingField}.` });
  }

  const webhookUrl = readEnv("POWER_AUTOMATE_CONTACT_WEBHOOK_URL") || readEnv("POWER_AUTOMATE_WEBHOOK_URL");
  if (!webhookUrl) {
    return sendJson(res, 503, { message: "Contact form forwarding is not configured yet." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        type: "contact_form",
        submittedAt: new Date().toISOString(),
        source: "internext-contact-page",
        host: req.headers?.host || "",
        userAgent: req.headers?.["user-agent"] || "",
        contact,
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      return sendJson(res, 502, {
        message: "Power Automate rejected the contact form submission.",
        details: responseText.slice(0, 500),
      });
    }

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? `Contact form workflow did not respond within ${WEBHOOK_TIMEOUT_MS / 1000} seconds.`
        : error instanceof Error
          ? `Unable to reach the contact form workflow: ${error.message}`
          : "Unable to reach the contact form workflow.";

    return sendJson(res, 502, { message });
  } finally {
    clearTimeout(timeout);
  }
}
