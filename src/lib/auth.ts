export type UserRole = "reseller" | "admin";

export type AuthSession = {
  userId: string;
  email: string;
  role: UserRole;
  signedInAt: string;
  expiresAt: string;
};

type SignInResult =
  | {
      ok: true;
      session: AuthSession;
    }
  | {
      ok: false;
      message: string;
    };

const AUTH_STORAGE_KEY = "internext-auth-session";

const readCachedSession = (): AuthSession | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.userId || !parsed?.email || !parsed?.role || !parsed?.expiresAt) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    if (Number.isNaN(Date.parse(parsed.expiresAt)) || Date.parse(parsed.expiresAt) <= Date.now()) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const saveCachedSession = (session: AuthSession | null) => {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
};

export const getAuthSession = () => readCachedSession();

export const clearAuthSession = async () => {
  saveCachedSession(null);

  if (typeof window === "undefined") {
    return;
  }

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Best effort only; local cache is already cleared.
  }
};

export const signIn = async (email: string, password: string): Promise<SignInResult> => {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedEmail || !normalizedPassword) {
    return {
      ok: false,
      message: "Email and password are required.",
    };
  }

  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        password: normalizedPassword,
      }),
    });

    const payload = (await response.json()) as { session?: AuthSession; message?: string };

    if (!response.ok || !payload.session) {
      return {
        ok: false,
        message: payload.message || "Unable to sign in.",
      };
    }

    saveCachedSession(payload.session);
    return {
      ok: true,
      session: payload.session,
    };
  } catch {
    return {
      ok: false,
      message: "Unable to reach the sign-in service.",
    };
  }
};

export const syncAuthSession = async (): Promise<AuthSession | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      saveCachedSession(null);
      return null;
    }

    const payload = (await response.json()) as { session?: AuthSession | null };
    const session = payload.session ?? null;
    saveCachedSession(session);
    return session;
  } catch {
    return readCachedSession();
  }
};

export const isAdminSession = (session: AuthSession | null) => {
  return Boolean(session && session.role === "admin");
};

export const isAuthenticatedSession = (session: AuthSession | null) => {
  return Boolean(session);
};
