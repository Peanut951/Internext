import { createClearedSessionCookie, sendJson } from "./_shared";

export default function handler(
  req: { method?: string },
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method not allowed." });
  }

  res.setHeader("Set-Cookie", createClearedSessionCookie());
  return sendJson(res, 200, { ok: true });
}
