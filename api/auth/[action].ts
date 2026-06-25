import {
  createClearedSessionCookie,
  createSession,
  createSessionCookie,
  createUserAccount,
  getSessionFromRequest,
  sendJson,
  verifyCredentials,
} from "./_shared.js";

type AuthBody = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  marketingOptIn?: boolean;
};

const parseBody = (body: string | AuthBody | undefined) => {
  if (!body) {
    return {};
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body) as AuthBody;
    } catch {
      return null;
    }
  }

  return body;
};

const getAction = (query: { action?: string | string[] } | undefined) => {
  const value = query?.action;
  return Array.isArray(value) ? value[0] : value;
};

export default async function handler(
  req: {
    method?: string;
    body?: string | AuthBody;
    headers?: { cookie?: string };
    query?: { action?: string | string[] };
  },
  res: {
    statusCode?: number;
    setHeader: (name: string, value: string) => void;
    end: (chunk?: string) => void;
  },
) {
  const action = getAction(req.query);

  if (action === "session") {
    if (req.method !== "GET") {
      return sendJson(res, 405, { message: "Method not allowed." });
    }

    return sendJson(res, 200, { session: getSessionFromRequest(req) });
  }

  if (action === "logout") {
    if (req.method !== "POST") {
      return sendJson(res, 405, { message: "Method not allowed." });
    }

    res.setHeader("Set-Cookie", createClearedSessionCookie());
    return sendJson(res, 200, { ok: true });
  }

  if (action !== "login" && action !== "signup") {
    return sendJson(res, 404, { message: "Auth action not found." });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { message: "Method not allowed." });
  }

  const body = parseBody(req.body);
  if (!body) {
    return sendJson(res, 400, { message: "Invalid request body." });
  }

  if (action === "login") {
    const verified = await verifyCredentials(
      String(body.email || ""),
      String(body.password || ""),
    );

    if (verified.ok === false) {
      return sendJson(res, 401, { message: "Invalid email or password." });
    }

    const session = createSession(verified.userId, verified.email, verified.role);
    res.setHeader("Set-Cookie", createSessionCookie(session));
    return sendJson(res, 200, { session });
  }

  const result = await createUserAccount({
    firstName: String(body.firstName || ""),
    lastName: String(body.lastName || ""),
    email: String(body.email || ""),
    password: String(body.password || ""),
    phone: String(body.phone || ""),
    company: String(body.company || ""),
    marketingOptIn: Boolean(body.marketingOptIn),
  });

  if (result.ok === false) {
    return sendJson(res, 400, { message: result.message });
  }

  const session = createSession(result.userId, result.email, result.role);
  res.setHeader("Set-Cookie", createSessionCookie(session));
  return sendJson(res, 200, { session });
}
