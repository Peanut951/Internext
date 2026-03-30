import {
  createSession,
  createSessionCookie,
  sendJson,
  verifyCredentials,
} from "./_shared";

export default async function handler(
  req: {
    method?: string;
    body?: string | { email?: string; password?: string };
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

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return sendJson(res, 400, { message: "Invalid request body." });
    }
  }

  const email = String(body?.email || "");
  const password = String(body?.password || "");
  const verified = await verifyCredentials(email, password);

  if (!verified.ok) {
    return sendJson(res, 401, { message: "Invalid email or password." });
  }

  const session = createSession(verified.userId, verified.email, verified.role);
  res.setHeader("Set-Cookie", createSessionCookie(session));

  return sendJson(res, 200, { session });
}
