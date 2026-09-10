import assert from "node:assert/strict";
import test from "node:test";

const adminSession = {
  userId: "admin-user",
  email: "admin@internext.com.au",
  role: "admin",
  signedInAt: "2026-09-10T00:00:00.000Z",
  expiresAt: "2099-09-10T00:00:00.000Z",
};

const installBrowserState = () => {
  const values = new Map();
  const events = new EventTarget();
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
    addEventListener: events.addEventListener.bind(events),
    removeEventListener: events.removeEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
  };
};

test("publishes login immediately and ignores an older session response", async () => {
  installBrowserState();
  let finishStaleSessionRequest;

  globalThis.fetch = async (url) => {
    if (url === "/api/auth/session") {
      return new Promise((resolve) => {
        finishStaleSessionRequest = () => resolve(new Response(JSON.stringify({ session: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      });
    }
    if (url === "/api/auth/login") {
      return new Response(JSON.stringify({ session: adminSession }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const auth = await import(`../src/lib/auth.ts?test=${Date.now()}`);
  const observedSessions = [];
  const unsubscribe = auth.subscribeAuthSession((session) => observedSessions.push(session));
  const staleSync = auth.syncAuthSession();
  const login = await auth.signIn("ADMIN@Internext.com.au", "password");

  assert.equal(login.ok, true);
  assert.equal(observedSessions.at(-1)?.role, "admin");
  assert.equal(auth.getAuthSession()?.role, "admin");

  finishStaleSessionRequest();
  const syncResult = await staleSync;
  assert.equal(syncResult?.role, "admin");
  assert.equal(auth.getAuthSession()?.role, "admin");
  unsubscribe();
});
