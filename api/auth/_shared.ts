import crypto from "node:crypto";

export type UserRole = "reseller" | "admin";

export type AuthSession = {
  email: string;
  role: UserRole;
  signedInAt: string;
  expiresAt: string;
};

const SESSION_COOKIE = "internext_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

const ADMIN_EMAIL = String(
  process.env.ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL || "admin@internext.com.au",
).toLowerCase();
const ADMIN_PASSWORD = String(
  process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || "internext-admin",
);
const RESELLER_EMAIL = String(
  process.env.RESELLER_EMAIL || process.env.VITE_RESELLER_EMAIL || "reseller@internext.com.au",
).toLowerCase();
const RESELLER_PASSWORD = String(
  process.env.RESELLER_PASSWORD || process.env.VITE_RESELLER_PASSWORD || "internext-reseller",
);
const SESSION_SECRET = String(
  process.env.AUTH_SESSION_SECRET || "internext-dev-session-secret-change-me",
);

const base64url = (value: string) => Buffer.from(value).toString("base64url");

const signValue = (value: string) =>
  crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");

export const createSession = (email: string, role: UserRole): AuthSession => ({
  email,
  role,
  signedInAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString(),
});

export const encodeSessionToken = (session: AuthSession) => {
  const payload = base64url(JSON.stringify(session));
  const signature = signValue(payload);
  return `${payload}.${signature}`;
};

export const decodeSessionToken = (token?: string | null): AuthSession | null => {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = signValue(payload);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthSession;
    if (!session?.email || !session?.role || !session?.expiresAt) {
      return null;
    }
    if (Date.parse(session.expiresAt) <= Date.now()) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
};

export const verifyCredentials = (email: string, password: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (normalizedEmail === ADMIN_EMAIL && normalizedPassword === ADMIN_PASSWORD) {
    return { ok: true as const, role: "admin" as const, email: normalizedEmail };
  }

  if (normalizedEmail === RESELLER_EMAIL && normalizedPassword === RESELLER_PASSWORD) {
    return { ok: true as const, role: "reseller" as const, email: normalizedEmail };
  }

  return { ok: false as const };
};

export const parseCookies = (cookieHeader?: string) => {
  return (cookieHeader || "").split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) {
      return acc;
    }
    acc[rawKey] = decodeURIComponent(rawValue.join("="));
    return acc;
  }, {});
};

export const getSessionFromRequest = (req: { headers?: { cookie?: string } }) => {
  const cookies = parseCookies(req.headers?.cookie);
  return decodeSessionToken(cookies[SESSION_COOKIE]);
};

const buildCookieParts = (value: string, maxAge: number) => {
  const parts = [
    `${SESSION_COOKIE}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  return parts.join("; ");
};

export const createSessionCookie = (session: AuthSession) =>
  buildCookieParts(encodeSessionToken(session), SESSION_DURATION_SECONDS);

export const createClearedSessionCookie = () => buildCookieParts("", 0);

export const sendJson = (
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
