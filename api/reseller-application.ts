type ResellerApplicationPayload = {
  businessName?: string;
  abn?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  monthlyVolume?: string;
  additionalInfo?: string;
};

const sendJson = (
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
  statusCode: number,
  body: unknown,
) => {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
};

const normalizeField = (value: unknown) => String(value || "").trim();

const requiredFields = [
  "businessName",
  "abn",
  "contactName",
  "email",
  "phone",
  "industry",
  "monthlyVolume",
] as const;

export default async function handler(
  req: {
    method?: string;
    body?: string | ResellerApplicationPayload;
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

  let body: ResellerApplicationPayload | undefined;
  if (typeof req.body === "string") {
    try {
      body = JSON.parse(req.body) as ResellerApplicationPayload;
    } catch {
      return sendJson(res, 400, { message: "Invalid request body." });
    }
  } else {
    body = req.body;
  }

  const payload = {
    businessName: normalizeField(body?.businessName),
    abn: normalizeField(body?.abn),
    contactName: normalizeField(body?.contactName),
    email: normalizeField(body?.email).toLowerCase(),
    phone: normalizeField(body?.phone),
    website: normalizeField(body?.website),
    industry: normalizeField(body?.industry),
    monthlyVolume: normalizeField(body?.monthlyVolume),
    additionalInfo: normalizeField(body?.additionalInfo),
  };

  const missingField = requiredFields.find((field) => !payload[field]);
  if (missingField) {
    return sendJson(res, 400, { message: `Missing required field: ${missingField}.` });
  }

  const webhookUrl =
    process.env.POWER_AUTOMATE_RESELLER_WEBHOOK_URL ||
    process.env.POWER_AUTOMATE_WEBHOOK_URL ||
    "";

  if (!webhookUrl) {
    return sendJson(res, 503, {
      message: "Reseller application forwarding is not configured yet.",
    });
  }

  const forwardPayload = {
    type: "reseller_application",
    submittedAt: new Date().toISOString(),
    source: "internext-website",
    host: req.headers?.host || "",
    userAgent: req.headers?.["user-agent"] || "",
    application: payload,
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(forwardPayload),
    });

    if (!response.ok) {
      const responseText = await response.text();
      return sendJson(res, 502, {
        message: "Power Automate rejected the reseller application submission.",
        details: responseText.slice(0, 500),
      });
    }

    return sendJson(res, 200, { ok: true });
  } catch {
    return sendJson(res, 502, {
      message: "Unable to reach the Power Automate webhook.",
    });
  }
}
