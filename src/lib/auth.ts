export type UserRole = "reseller" | "admin";

export type AuthSession = {
  email: string;
  role: UserRole;
  signedInAt: string;
  expiresAt: string;
};

const AUTH_STORAGE_KEY = "internext-auth-session";

const ADMIN_EMAIL = String(import.meta.env.VITE_ADMIN_EMAIL || "admin@internext.com.au").toLowerCase();
const ADMIN_PASSWORD = String(import.meta.env.VITE_ADMIN_PASSWORD || "internext-admin");
const RESELLER_EMAIL = String(import.meta.env.VITE_RESELLER_EMAIL || "reseller@internext.com.au").toLowerCase();
const RESELLER_PASSWORD = String(import.meta.env.VITE_RESELLER_PASSWORD || "internext-reseller");

const normalizeEmail = (value: string) => value.trim().toLowerCase();

export const getAuthSession = (): AuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.email || !parsed?.role || !parsed?.expiresAt) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    if (Number.isNaN(Date.parse(parsed.expiresAt))) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const saveAuthSession = (session: AuthSession) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const clearAuthSession = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
};

export const signIn = (email: string, password: string) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = password.trim();

  if (!normalizedEmail || !normalizedPassword) {
    return {
      ok: false as const,
      message: "Email and password are required.",
    };
  }

  let role: UserRole = "reseller";

  if (normalizedEmail === ADMIN_EMAIL) {
    if (normalizedPassword !== ADMIN_PASSWORD) {
      return {
        ok: false as const,
        message: "Invalid admin credentials.",
      };
    }
    role = "admin";
  } else if (normalizedEmail === RESELLER_EMAIL) {
    if (normalizedPassword !== RESELLER_PASSWORD) {
      return {
        ok: false as const,
        message: "Invalid reseller credentials.",
      };
    }
    role = "reseller";
  } else {
    return {
      ok: false as const,
      message: "Account not found.",
    };
  }

  const session: AuthSession = {
    email: normalizedEmail,
    role,
    signedInAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
  };

  saveAuthSession(session);

  return {
    ok: true as const,
    session,
  };
};

export const isAdminSession = (session: AuthSession | null) => {
  return Boolean(session && session.role === "admin");
};

export const isAuthenticatedSession = (session: AuthSession | null) => {
  return Boolean(session);
};

export const demoPortalCredentials = {
  resellerEmail: RESELLER_EMAIL,
  resellerPassword: RESELLER_PASSWORD,
  adminEmail: ADMIN_EMAIL,
};
