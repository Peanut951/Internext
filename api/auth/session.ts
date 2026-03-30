import { getSessionFromRequest, sendJson } from "./_shared";

export default function handler(
  req: {
    method?: string;
    headers?: { cookie?: string };
  },
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { message: "Method not allowed." });
  }

  const session = getSessionFromRequest(req);
  return sendJson(res, 200, { session });
}
