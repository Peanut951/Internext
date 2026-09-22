import { readEnv, sendJson } from "../checkout/_shared.js";

export default async function handler(
  req: { method?: string; headers?: { authorization?: string } },
  res: { statusCode?: number; setHeader: (name: string, value: string) => void; end: (chunk?: string) => void },
) {
  if (req.method !== "GET") return sendJson(res, 405, { message: "Method not allowed." });
  const secret = readEnv("CRON_SECRET");
  if (!secret || req.headers?.authorization !== `Bearer ${secret}`) {
    return sendJson(res, 401, { message: "Unauthorized." });
  }

  const hookUrl = readEnv("CATALOG_DEPLOY_HOOK_URL");
  if (!hookUrl) {
    return sendJson(res, 503, { message: "Catalogue refresh is not configured." });
  }
  let url: URL;
  try {
    url = new URL(hookUrl);
    if (url.protocol !== "https:" || url.hostname !== "api.vercel.com" || !url.pathname.startsWith("/v1/integrations/deploy/")) {
      throw new Error("Invalid deploy hook URL.");
    }
  } catch {
    return sendJson(res, 500, { message: "Catalogue deploy hook configuration is invalid." });
  }

  try {
    const response = await fetch(url, { method: "POST", signal: AbortSignal.timeout(15_000) });
    if (!response.ok) return sendJson(res, 502, { message: `Deploy hook returned HTTP ${response.status}.` });
    return sendJson(res, 202, { message: "Catalogue build queued." });
  } catch {
    return sendJson(res, 502, { message: "Unable to trigger catalogue build." });
  }
}
