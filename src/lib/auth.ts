export type UserRole = "user" | "reseller" | "admin";

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

type SignUpInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  company?: string;
  marketingOptIn?: boolean;
};

const AUTH_STORAGE_KEY = "internext-auth-session";
const AUTH_SESSION_CHANGED_EVENT = "internext-auth-session-changed";
let authMutationVersion = 0;
let sessionSyncPromise: Promise<AuthSession | null> | null = null;

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
  } else {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  }

  window.dispatchEvent(
    new CustomEvent<AuthSession | null>(AUTH_SESSION_CHANGED_EVENT, { detail: session }),
  );
};

export const subscribeAuthSession = (listener: (session: AuthSession | null) => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleSessionChanged = (event: Event) => {
    listener((event as CustomEvent<AuthSession | null>).detail ?? null);
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === AUTH_STORAGE_KEY) {
      listener(readCachedSession());
    }
  };

  window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged);
    window.removeEventListener("storage", handleStorage);
  };
};

export const getAuthSession = () => readCachedSession();

export const clearAuthSession = async () => {
  authMutationVersion += 1;
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

  authMutationVersion += 1;

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

export const signUp = async (input: SignUpInput): Promise<SignInResult> => {
  authMutationVersion += 1;

  try {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    const payload = (await response.json()) as { session?: AuthSession; message?: string };

    if (!response.ok || !payload.session) {
      return {
        ok: false,
        message: payload.message || "Unable to create account.",
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
      message: "Unable to reach the signup service.",
    };
  }
};

const syncAuthSessionOnce = async (): Promise<AuthSession | null> => {
  if (typeof window === "undefined") {
    return null;
  }

  const syncVersion = authMutationVersion;

  try {
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (syncVersion !== authMutationVersion) {
      return readCachedSession();
    }

    if (!response.ok) {
      saveCachedSession(null);
      return null;
    }

    const payload = (await response.json()) as { session?: AuthSession | null };
    if (syncVersion !== authMutationVersion) {
      return readCachedSession();
    }
    const session = payload.session ?? null;
    saveCachedSession(session);
    return session;
  } catch {
    return readCachedSession();
  }
};

export const syncAuthSession = (): Promise<AuthSession | null> => {
  if (!sessionSyncPromise) {
    sessionSyncPromise = syncAuthSessionOnce().finally(() => {
      sessionSyncPromise = null;
    });
  }

  return sessionSyncPromise;
};

export const isAdminSession = (session: AuthSession | null) => {
  return Boolean(session && session.role === "admin");
};

export const isAuthenticatedSession = (session: AuthSession | null) => {
  return Boolean(session);
};

export const getPortalDestination = (session: AuthSession | null) => {
  if (!session) return null;
  if (session.role === "admin") return { href: "/admin/orders", label: "Admin Portal" };
  if (session.role === "reseller") return { href: "/portal", label: "Reseller Portal" };
  return { href: "/portal/orders", label: "User Portal" };
};
