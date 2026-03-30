import crypto from "node:crypto";

export type UserRole = "reseller" | "admin";

export type AuthSession = {
  userId: string;
  email: string;
  role: UserRole;
  signedInAt: string;
  expiresAt: string;
};

type SupabaseUser = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

type VerifyCredentialsResult =
  | {
      ok: true;
      email: string;
      userId: string;
      role: UserRole;
    }
  | {
      ok: false;
      message: string;
    };

type SupabaseConfig = {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  adminEmail: string;
  resellerEmail: string;
  sessionSecret: string;
};

const SESSION_COOKIE = "internext_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12;

const readEnv = (key: string) => process.env[key]?.trim() || "";

const decodeJwtPayload = (token?: string) => {
  if (!token) {
    return null;
  }

  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const inferSupabaseUrl = (...keys: string[]) => {
  for (const key of keys) {
    const payload = decodeJwtPayload(key);
    const ref = typeof payload?.ref === "string" ? payload.ref.trim() : "";
    if (ref) {
      return `https://${ref}.supabase.co`;
    }
  }

  return "";
};

const getSupabaseConfig = (): SupabaseConfig | null => {
  const anonKey =
    readEnv("SUPABASE_ANON_KEY") ||
    readEnv("VITE_SUPABASE_ANON_KEY");
  const serviceRoleKey =
    readEnv("SUPABASE_SERVICE_ROLE_KEY") ||
    readEnv("SERVICE_ROLE_SECRET_KEY");
  const supabaseUrl =
    readEnv("SUPABASE_URL") ||
    readEnv("VITE_SUPABASE_URL") ||
    inferSupabaseUrl(anonKey, serviceRoleKey);
  const adminEmail = (
    readEnv("ADMIN_EMAIL") ||
    readEnv("VITE_ADMIN_EMAIL") ||
    "admin@internext.com.au"
  ).toLowerCase();
  const resellerEmail = (
    readEnv("RESELLER_EMAIL") ||
    readEnv("VITE_RESELLER_EMAIL") ||
    "reseller@internext.com.au"
  ).toLowerCase();
  const sessionSecret =
    readEnv("AUTH_SESSION_SECRET") || "internext-dev-session-secret-change-me";

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  return {
    supabaseUrl,
    anonKey,
    serviceRoleKey,
    adminEmail,
    resellerEmail,
    sessionSecret,
  };
};

const base64url = (value: string) => Buffer.from(value).toString("base64url");

const signValue = (value: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(value).digest("base64url");

const normalizeRole = (value: unknown): UserRole | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "admin" || normalized === "reseller") {
    return normalized;
  }

  return null;
};

const readResponseJson = async (response: Response) => {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const resolvePortalRole = async (
  config: SupabaseConfig,
  user: SupabaseUser,
  normalizedEmail: string,
): Promise<UserRole | null> => {
  const directRole =
    normalizeRole(user.app_metadata?.role) ||
    normalizeRole(user.user_metadata?.role);

  if (directRole) {
    return directRole;
  }

  if (config.serviceRoleKey) {
    try {
      const response = await fetch(
        `${config.supabaseUrl}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(user.id)}&limit=1`,
        {
          method: "GET",
          headers: {
            apikey: config.serviceRoleKey,
            Authorization: `Bearer ${config.serviceRoleKey}`,
            Accept: "application/json",
          },
        },
      );

      if (response.ok) {
        const rows = (await response.json()) as Array<{ role?: unknown }>;
        const profileRole = normalizeRole(rows[0]?.role);
        if (profileRole) {
          return profileRole;
        }
      }
    } catch {
      // Fall through to explicit email-based portal role mapping.
    }
  }

  if (normalizedEmail === config.adminEmail) {
    return "admin";
  }

  if (normalizedEmail === config.resellerEmail) {
    return "reseller";
  }

  return null;
};

export const createSession = (userId: string, email: string, role: UserRole): AuthSession => ({
  userId,
  email,
  role,
  signedInAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString(),
});

export const encodeSessionToken = (session: AuthSession) => {
  const config = getSupabaseConfig();
  const secret = config?.sessionSecret || "internext-dev-session-secret-change-me";
  const payload = base64url(JSON.stringify(session));
  const signature = signValue(payload, secret);
  return `${payload}.${signature}`;
};

export const decodeSessionToken = (token?: string | null): AuthSession | null => {
  if (!token) {
    return null;
  }

  const config = getSupabaseConfig();
  const secret = config?.sessionSecret || "internext-dev-session-secret-change-me";
  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = signValue(payload, secret);
  if (signature.length !== expected.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as AuthSession;
    if (!session?.userId || !session?.email || !session?.role || !session?.expiresAt) {
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

export const verifyCredentials = async (
  email: string,
  password: string,
): Promise<VerifyCredentialsResult> => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedEmail || !normalizedPassword) {
    return {
      ok: false,
      message: "Email and password are required.",
    };
  }

  const config = getSupabaseConfig();
  if (!config) {
    return {
      ok: false,
      message: "Supabase auth is not configured on the server.",
    };
  }

  try {
    const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password: normalizedPassword,
      }),
    });

    const payload = await readResponseJson(response);

    if (!response.ok) {
      const message =
        String(payload.error_description || payload.msg || payload.message || "Unable to sign in.");

      if (/email not confirmed|email not verified/i.test(message)) {
        return {
          ok: false,
          message:
            "This account still needs email confirmation in Supabase before it can sign in.",
        };
      }

      return {
        ok: false,
        message,
      };
    }

    const user = payload.user as SupabaseUser | undefined;
    const userEmail = user?.email?.trim().toLowerCase() || normalizedEmail;
    if (!user?.id || !userEmail) {
      return {
        ok: false,
        message: "Supabase sign-in succeeded, but the user record was incomplete.",
      };
    }

    const role = await resolvePortalRole(config, user, userEmail);
    if (!role) {
      return {
        ok: false,
        message:
          "Your account is valid but is not enabled for the reseller portal yet. Add a role in Supabase profiles or app metadata.",
      };
    }

    return {
      ok: true,
      email: userEmail,
      userId: user.id,
      role,
    };
  } catch {
    return {
      ok: false,
      message: "Unable to reach Supabase from the auth service.",
    };
  }
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
