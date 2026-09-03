import { timingSafeEqual } from "node:crypto";
import { readEnv, sendJson } from "../checkout/_shared.js";
import { runCompetitorProviderSync } from "../catalog/_competitorProviderSync.js";

const getHeader = (
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string,
) => {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] || "" : value || "";
};

const secretsMatch = (provided: string, expected: string) => {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
};

export default async function handler(
  req: {
    method?: string;
    headers?: Record<string, string | string[] | undefined>;
  },
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
) {
  if (req.method !== "GET" && req.method !== "POST") {
    return sendJson(res, 405, { message: "Method not allowed." });
  }

  const cronSecret = readEnv("CRON_SECRET");
  if (!cronSecret) {
    return sendJson(res, 503, { message: "CRON_SECRET is not configured." });
  }
  const authorization = getHeader(req.headers, "authorization");
  if (!secretsMatch(authorization, `Bearer ${cronSecret}`)) {
    return sendJson(res, 401, { message: "Invalid cron authorization." });
  }

  try {
    const result = await runCompetitorProviderSync();
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    return sendJson(res, 200, result);
  } catch (error) {
    return sendJson(res, 502, {
      message: "Competitor provider sync failed.",
      detail: error instanceof Error ? error.message : "Unknown provider error.",
    });
  }
}

