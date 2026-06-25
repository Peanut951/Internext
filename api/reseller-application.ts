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
const normalizeAbn = (value: unknown) => normalizeField(value).replace(/\D/g, "");

const readEnv = (key: string) => process.env[key]?.trim() || "";

const getWebhookUrl = () => {
  const candidates = [
    readEnv("POWER_AUTOMATE_RESELLER_WEBHOOK_URL"),
    readEnv("POWER_AUTOMATE_CONTACT_WEBHOOK_URL"),
    readEnv("POWER_AUTOMATE_WEBHOOK_URL"),
  ];

  return candidates.find((candidate) => {
    if (
      !candidate ||
      /your[_-]?power[_-]?automate|your-flow-url|your-contact-flow-url/i.test(candidate)
    ) {
      return false;
    }

    try {
      const url = new URL(candidate);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }) || "";
};

const industryLabels: Record<string, string> = {
  "it-reseller": "IT Reseller",
  "av-integrator": "AV Integrator",
  "security-installer": "Security Installer",
  msp: "Managed Service Provider",
  "office-dealer": "Office Equipment Dealer",
  other: "Other",
};

const monthlyVolumeLabels: Record<string, string> = {
  "0-5k": "Under $5,000",
  "5k-20k": "$5,000 - $20,000",
  "20k-50k": "$20,000 - $50,000",
  "50k-100k": "$50,000 - $100,000",
  "100k+": "Over $100,000",
};

const formatApplicationMessage = (payload: Required<ResellerApplicationPayload>) =>
  [
    `Reseller application submitted from internext.com.au`,
    ``,
    `Business Name: ${payload.businessName}`,
    `ABN: ${payload.abn}`,
    `Website: ${payload.website || "Not supplied"}`,
    ``,
    `Contact Name: ${payload.contactName}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone}`,
    ``,
    `Industry: ${industryLabels[payload.industry] || payload.industry}`,
    `Estimated Monthly Volume: ${monthlyVolumeLabels[payload.monthlyVolume] || payload.monthlyVolume}`,
    ``,
    `Additional Information:`,
    payload.additionalInfo || "Not supplied",
  ].join("\n");

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
    abn: normalizeAbn(body?.abn),
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

  if (!/^\d{11}$/.test(payload.abn)) {
    return sendJson(res, 400, { message: "Enter a valid 11-digit ABN." });
  }

  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    return sendJson(res, 503, {
      message:
        "Reseller application forwarding is not configured. Set POWER_AUTOMATE_CONTACT_WEBHOOK_URL to the working contact form workflow URL.",
    });
  }

  const message = formatApplicationMessage(payload);
  const forwardPayload = {
    type: "reseller_application",
    submittedAt: new Date().toISOString(),
    source: "internext-website",
    host: req.headers?.host || "",
    userAgent: req.headers?.["user-agent"] || "",
    application: payload,
    contact: {
      name: payload.contactName,
      email: payload.email,
      phone: payload.phone,
      company: payload.businessName,
      enquiryType: "reseller-application",
      message,
    },
    subject: `New Internext reseller application - ${payload.businessName}`,
    text: message,
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
        message: `Power Automate rejected the reseller application submission with HTTP ${response.status}.`,
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
